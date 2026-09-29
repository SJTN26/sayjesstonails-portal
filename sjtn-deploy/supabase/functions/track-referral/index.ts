// supabase/functions/track-referral/index.ts
// Deploy with: supabase functions deploy track-referral --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { action, referrer_code, referrer_email } = body

    // ── ACTION: log_visit ──────────────────────────────────────────────────
    // Called when someone lands on the portal with a ?ref= param
    if (action === 'log_visit') {
      if (!referrer_code) {
        return new Response(JSON.stringify({ error: 'referrer_code required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
        })
      }

      // Look up the referrer's name/email from mentee_profiles by matching their code
      // Code is firstName.toLowerCase() + avatar.toLowerCase() (e.g. "dannydr")
      const { data: profiles } = await supabase
        .from('mentee_profiles')
        .select('email, first_name')

      // Match code: first_name.lower + first 2 chars of first_name.lower (avatar fallback)
      const match = profiles?.find(p => {
        const code = (p.first_name || '').toLowerCase().replace(/\s+/g, '') +
          (p.first_name || '').slice(0, 2).toLowerCase()
        return code === referrer_code.toLowerCase()
      })

      // Log the visit
      const { data: referral } = await supabase.from('referrals').insert({
        referrer_code,
        referrer_email: match?.email || null,
        referrer_name: match?.first_name || referrer_code,
      }).select().single()

      // Notify the referrer via message if we found them
      if (match?.email) {
        await supabase.from('messages').insert({
          mentee_email: match.email,
          sender: 'jess',
          text: `🎉 Someone just clicked your referral link! Keep sharing — you're helping build this community.`,
          created_at: new Date().toISOString(),
        })
      }

      return new Response(JSON.stringify({ success: true, referral_id: referral?.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── ACTION: mark_converted ────────────────────────────────────────────
    // Called when a referred visitor actually signs up
    if (action === 'mark_converted') {
      const { referral_id } = body
      if (!referral_id) {
        return new Response(JSON.stringify({ error: 'referral_id required' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
        })
      }

      await supabase.from('referrals')
        .update({ converted: true, converted_at: new Date().toISOString() })
        .eq('id', referral_id)

      // Get referral to notify referrer of conversion
      const { data: referral } = await supabase.from('referrals')
        .select('referrer_email, referrer_name').eq('id', referral_id).single()

      if (referral?.referrer_email) {
        await supabase.from('messages').insert({
          mentee_email: referral.referrer_email,
          sender: 'jess',
          text: `🙌 Someone you referred just joined the community! Your network is growing. Thank you for spreading the word! 💕`,
          created_at: new Date().toISOString(),
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── ACTION: get_leaderboard ───────────────────────────────────────────
    // Called by admin to see referral stats
    if (action === 'get_leaderboard') {
      const { data: referrals } = await supabase
        .from('referrals')
        .select('referrer_code, referrer_email, referrer_name, converted, visited_at')
        .order('visited_at', { ascending: false })

      // Group by referrer
      const grouped: Record<string, {
        name: string, email: string, clicks: number, conversions: number, last: string
      }> = {}

      for (const r of referrals || []) {
        const key = r.referrer_email || r.referrer_code
        if (!grouped[key]) {
          grouped[key] = { name: r.referrer_name || r.referrer_code, email: r.referrer_email || '', clicks: 0, conversions: 0, last: r.visited_at }
        }
        grouped[key].clicks++
        if (r.converted) grouped[key].conversions++
        if (r.visited_at > grouped[key].last) grouped[key].last = r.visited_at
      }

      const leaderboard = Object.values(grouped)
        .sort((a, b) => b.clicks - a.clicks)

      return new Response(JSON.stringify({ leaderboard }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    })
  }
})
