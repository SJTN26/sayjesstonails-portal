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
    const { email, tier, first_name, action, role, paid } = JSON.parse(body)

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

    // GRADUATE action
    if (action === 'graduate') {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (listError) {
        await supabase.from('mentee_profiles').upsert({ email: email.toLowerCase(), graduated: true }, { onConflict: 'email' })
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
      }
      const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (user) {
        await supabase.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, role: 'community' } })
      }
      await supabase.from('mentee_profiles').upsert({ email: email.toLowerCase(), graduated: true }, { onConflict: 'email' })
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // REMOVE action — revoke access (reversible). Ban the auth user so they can
    // no longer sign in, and drop them from the roster. Re-inviting the same
    // email later lifts the ban and restores access (see INVITE action below).
    if (action === 'remove') {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (!listError) {
        const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (user) {
          await supabase.auth.admin.updateUserById(user.id, {
            ban_duration: '876000h', // ~100 years — effectively until re-invited
            user_metadata: { ...user.user_metadata, role: 'removed' }
          })
        }
      }
      await supabase.from('mentee_profiles').delete().eq('email', email.toLowerCase())
      await supabase.from('community_applications').update({ status: 'removed' }).eq('email', email.toLowerCase())
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // INVITE action
    const resolvedRole = role || 'mentee'
    const isCommunity = resolvedRole === 'community'

    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        tier: tier || (isCommunity ? 'Community Member' : 'Hourly Session'),
        role: resolvedRole,
        first_name: first_name || ''
      }
    })

    if (error) {
      // The email is likely already registered (e.g. a previously removed
      // member). Instead of failing, reactivate: lift any ban and restore role.
      const { data: { users } } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existing = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          ban_duration: 'none',
          user_metadata: {
            ...existing.user_metadata,
            role: resolvedRole,
            tier: tier || existing.user_metadata?.tier || (isCommunity ? 'Community Member' : 'Hourly Session'),
            first_name: first_name || existing.user_metadata?.first_name || ''
          }
        })
        // fall through to the profile upsert below to restore their roster entry
      } else {
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
      }
    }

    const tierKey = isCommunity ? 'community' : tier?.includes('Elite') ? 'elite' : tier?.includes('Intensive') ? 'intensive' : 'hourly'
    const totalDays = tierKey === 'elite' ? 90 : tierKey === 'intensive' ? 30 : 1
    const sessionsTotal = tierKey === 'elite' ? 6 : tierKey === 'intensive' ? 2 : 1
    const startDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    await supabase.from('mentee_profiles').upsert({
      email: email.toLowerCase(),
      first_name: first_name || '',
      tier: tier || (isCommunity ? 'Community Member' : 'Hourly Session'),
      tier_key: tierKey,
      role: resolvedRole,
      paid: paid === true ? true : false,
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

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
