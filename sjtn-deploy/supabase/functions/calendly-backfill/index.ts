import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const CALENDLY_TOKEN = Deno.env.get('CALENDLY_API_TOKEN')
    if (!CALENDLY_TOKEN) throw new Error('CALENDLY_API_TOKEN not set')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Step 1: Get current user (Jess) to find org URI
    const userRes = await fetch('https://api.calendly.com/users/me', {
      headers: { 'Authorization': `Bearer ${CALENDLY_TOKEN}` }
    })
    const userData = await userRes.json()
    if (!userRes.ok) throw new Error('Calendly user fetch failed: ' + JSON.stringify(userData))
    const userUri = userData.resource.uri

    // Step 2: Get scheduled events (past 30 days + future 90 days)
    const minTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const maxTime = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    let allEvents: any[] = []
    let nextUrl: string | null = `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${minTime}&max_start_time=${maxTime}&count=100`

    while (nextUrl) {
      const eventsRes = await fetch(nextUrl, {
        headers: { 'Authorization': `Bearer ${CALENDLY_TOKEN}` }
      })
      const eventsData = await eventsRes.json()
      if (!eventsRes.ok) throw new Error('Events fetch failed: ' + JSON.stringify(eventsData))
      allEvents = allEvents.concat(eventsData.collection || [])
      nextUrl = eventsData.pagination?.next_page || null
    }

    const results = []

    // Step 3: For each event, get invitee details
    for (const event of allEvents) {
      try {
        const inviteesRes = await fetch(`${event.uri}/invitees`, {
          headers: { 'Authorization': `Bearer ${CALENDLY_TOKEN}` }
        })
        const inviteesData = await inviteesRes.json()
        const invitees = inviteesData.collection || []

        for (const invitee of invitees) {
          const qa = invitee.questions_and_answers || []
          const getAnswer = (part: string) => {
            const found = qa.find((q: any) => q.question?.toLowerCase().includes(part.toLowerCase()))
            return found?.answer || ''
          }

          const status = event.status === 'canceled' ? 'canceled' : 'pending'

          // Upsert by calendly_uri to avoid duplicates
          const { error } = await supabase.from('leads').upsert({
            name: invitee.name || '',
            email: (invitee.email || '').toLowerCase(),
            event_type: event.name || 'Discovery Call',
            scheduled_at: event.start_time,
            calendly_uri: invitee.uri,
            challenge: getAnswer('challenge'),
            goal: getAnswer('goal') || getAnswer('90 days'),
            licensed: getAnswer('licensed'),
            interested_in: getAnswer('interested in') || getAnswer('most interested'),
            status,
            source: 'calendly',
            created_at: invitee.created_at || event.created_at || new Date().toISOString(),
          }, { onConflict: 'calendly_uri' })

          if (error) {
            results.push({ email: invitee.email, status: 'error', error: error.message })
          } else {
            results.push({ email: invitee.email, status: 'imported' })
          }
        }
      } catch (e: any) {
        results.push({ event: event.uri, error: e.message })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total_events: allEvents.length,
      imported: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    })

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    })
  }
})