import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, calendly-webhook-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const event = body.event
    const payload = body.payload

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Extract invitee details
    const invitee = payload?.invitee || payload
    const name = invitee?.name || ''
    const email = invitee?.email?.toLowerCase() || ''
    const eventType = payload?.event_type?.name || payload?.scheduled_event?.name || 'Discovery Call'
    const scheduledAt = payload?.scheduled_event?.start_time || payload?.event?.start_time || null
    const calendlyUri = invitee?.uri || payload?.uri || ''

    // Extract custom Q&A
    const qa = invitee?.questions_and_answers || payload?.questions_and_answers || []
    const getAnswer = (questionPart: string) => {
      const found = qa.find((q: any) => q.question?.toLowerCase().includes(questionPart.toLowerCase()))
      return found?.answer || ''
    }

    const challenge = getAnswer('challenge')
    const goal = getAnswer('goal') || getAnswer('90 days')
    const licensed = getAnswer('licensed')
    const interestedIn = getAnswer('interested in') || getAnswer('most interested')

    // Handle different events
    if (event === 'invitee.created') {
      // New booking — insert lead
      const { error } = await supabase.from('leads').insert([{
        name,
        email,
        event_type: eventType,
        scheduled_at: scheduledAt,
        calendly_uri: calendlyUri,
        challenge,
        goal,
        licensed,
        interested_in: interestedIn,
        status: 'pending',
        source: 'calendly',
        created_at: new Date().toISOString(),
      }])
      if (error) throw error
    } else if (event === 'invitee.canceled') {
      // Booking canceled — update status
      const { error } = await supabase.from('leads')
        .update({ status: 'canceled', canceled_at: new Date().toISOString() })
        .eq('calendly_uri', calendlyUri)
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    })
  }
})