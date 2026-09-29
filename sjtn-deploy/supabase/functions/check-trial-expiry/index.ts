import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_HTML = (firstName: string) => `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0d0d0d; padding: 0;">
  <div style="background: #C4607A; padding: 16px 40px; text-align: center;">
    <img src="https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png" alt="SayJessToNails" style="height: 200px; width: auto;" />
  </div>
  <div style="background: #0d0d0d; padding: 48px 40px;">
    <h2 style="color: #F5F0EB; font-size: 36px; font-weight: 700; margin: 0 0 24px; line-height: 1.3;">Your trial<br/>has ended.</h2>
    <p style="color: #9a8880; font-size: 15px; line-height: 1.8; margin: 0 0 16px; font-weight: 300;">
      Hi ${firstName} — we loved having you inside the Inner Circle. Whether the community is calling your name or youre ready to go deeper with one-on-one mentorship, we have an option for you.
    </p>
    <p style="color: #9a8880; font-size: 15px; line-height: 1.8; margin: 0 0 32px; font-weight: 300;">
      Pick what fits where youre at:
    </p>

    <a href="https://buy.stripe.com/6oUfZj5H86GPfoieo67wA06" style="display: block; background: #C4607A; color: #ffffff; text-decoration: none; padding: 18px 28px; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;">
      Join Inner Circle — $27/mo →
    </a>

    <a href="https://calendly.com/sayjesstonails-info/free-discovery-call" style="display: block; background: #1a1a1a; color: #F5F0EB; text-decoration: none; padding: 18px 28px; font-size: 13px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; border: 1px solid #333;">
      Book a Free Discovery Call →
    </a>

    <a href="https://portal.sayjesstonails.com/#signin" style="display: block; background: transparent; color: #9a8880; text-decoration: none; padding: 16px 28px; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; border: 1px solid #333;">
      Explore Mentorship Options →
    </a>
  </div>
  <div style="background: #111111; padding: 28px 40px; border-top: 1px solid #1e1e1e;">
    <p style="color: #555; font-size: 12px; line-height: 1.8; margin: 0;">
      Questions? Reply directly to this email.<br/><br/>
      <strong style="color: #9a8880;">Jess Ramos · SayJessToNails · Miramar, FL</strong>
    </p>
  </div>
</div>
`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Find approved community applications whose trial ended and havent been notified
    const { data: apps, error } = await supabase
      .from('community_applications')
      .select('*')
      .eq('status', 'approved')
      .lt('trial_end', new Date().toISOString())
      .or('expiry_email_sent.is.null,expiry_email_sent.eq.false')

    if (error) throw error

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_KEY) throw new Error('RESEND_API_KEY not set')

    const results = []

    for (const app of (apps || [])) {
      // Skip if they paid
      if (app.paid) continue

      // Send email via Resend
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Jess Ramos <noreply@sayjesstonails.com>',
          to: [app.email],
          subject: 'Your Inner Circle trial has ended',
          html: EMAIL_HTML(app.first_name || 'there'),
        }),
      })

      const emailResult = await emailRes.json()

      // Mark as sent regardless to avoid spam if resend fails
      await supabase
        .from('community_applications')
        .update({ expiry_email_sent: true, expiry_email_sent_at: new Date().toISOString() })
        .eq('id', app.id)

      results.push({ email: app.email, status: emailRes.ok ? 'sent' : 'failed', detail: emailResult })
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    })
  }
})