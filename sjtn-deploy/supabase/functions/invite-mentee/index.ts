import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.text()
    const { email, tier, first_name, action } = JSON.parse(body)

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // GRADUATE action — update user role to community using admin API
    if (action === 'graduate') {
      // Get user by email using admin API
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ 
        page: 1, 
        perPage: 1000 
      })
      
      if (listError) {
        // Fallback: just update mentee_profiles if listUsers fails
        await supabase.from('mentee_profiles').upsert(
          { email: email.toLowerCase(), graduated: true }, 
          { onConflict: 'email' }
        )
        return new Response(
          JSON.stringify({ success: true, note: 'Profile updated, auth role update skipped' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      
      if (user) {
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, role: 'community' }
        })
      }

      // Always update mentee_profiles
      await supabase.from('mentee_profiles').upsert(
        { email: email.toLowerCase(), graduated: true }, 
        { onConflict: 'email' }
      )

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // INVITE action — create new mentee
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { tier: tier || 'Hourly Session', role: 'mentee', first_name: first_name || '' }
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const tierKey = tier?.includes('Elite') ? 'elite' : tier?.includes('Intensive') ? 'intensive' : 'hourly'
    const totalDays = tierKey === 'elite' ? 90 : tierKey === 'intensive' ? 30 : 1
    const sessionsTotal = tierKey === 'elite' ? 6 : tierKey === 'intensive' ? 2 : 1
    const startDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    await supabase.from('mentee_profiles').upsert({
      email: email.toLowerCase(),
      first_name: first_name || '',
      tier: tier || 'Hourly Session',
      tier_key: tierKey,
      start_date: startDate,
      total_days: totalDays,
      days_remaining: totalDays,
      sessions_total: sessionsTotal,
      sessions_completed: 0,
      goal: '',
      next_session_date: null,
      next_session_time: null,
      next_session_type: null,
    }, { onConflict: 'email' })

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
