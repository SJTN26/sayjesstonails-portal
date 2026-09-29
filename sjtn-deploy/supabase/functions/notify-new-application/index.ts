import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { firstName, email, q1, q2, q3 } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    // Email 1 — Notify Jess
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SayJessToNails <info@sayjesstonails.com>',
        to: ['info@sayjesstonails.com'],
        subject: `The Squad is Growing — ${firstName} just applied`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #eee;">
            <div style="background: #C4607A; padding: 32px; text-align: center;">
              <img src="https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png" alt="SayJessToNails" height="160" style="display: block; margin: 0 auto;" />
            </div>
            <div style="background: #0D0D0D; padding: 24px 32px;">
              <h1 style="color: white; font-size: 22px; margin: 0 0 6px; letter-spacing: 2px; text-transform: uppercase;">The Squad is Growing</h1>
              <p style="color: #E8A0B0; font-size: 13px; margin: 0; font-weight: 300;">Someone just applied for your free community trial.</p>
            </div>
            <div style="background: #f9f9f9; padding: 32px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; width: 40%;">Name</td><td style="padding: 10px 0; font-size: 14px; color: #333;">${firstName}</td></tr>
                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase;">Email</td><td style="padding: 10px 0; font-size: 14px; color: #333;">${email}</td></tr>
                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase;">What brings them</td><td style="padding: 10px 0; font-size: 14px; color: #333;">${q1}</td></tr>
                <tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px 0; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase;">What they hope to get</td><td style="padding: 10px 0; font-size: 14px; color: #333;">${q2}</td></tr>
                <tr><td style="padding: 10px 0; font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase;">Beauty pro</td><td style="padding: 10px 0; font-size: 14px; color: #333;">${q3}</td></tr>
              </table>
              <div style="margin-top: 32px;">
                <a href="https://portal.sayjesstonails.com" style="background: #C4607A; color: white; padding: 14px 28px; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Review in Dashboard →</a>
              </div>
            </div>
            <div style="background: #0D0D0D; padding: 20px 32px; text-align: center;">
              <p style="color: #555; font-size: 11px; margin: 0;">SayJessToNails · Miramar, FL · <a href="https://portal.sayjesstonails.com" style="color: #C4607A; text-decoration: none;">portal.sayjesstonails.com</a></p>
            </div>
          </div>
        `
      })
    })

    // Email 2 — Confirm to applicant
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Jess at SayJessToNails <info@sayjesstonails.com>',
        to: [email],
        subject: `You're on the list, ${firstName} 🎉`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #eee;">
            <div style="background: #C4607A; padding: 32px; text-align: center;">
              <img src="https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png" alt="SayJessToNails" height="160" style="display: block; margin: 0 auto;" />
            </div>
            <div style="background: #0D0D0D; padding: 24px 32px; border-left: 4px solid #C4607A;">
              <div style="font-size: 10px; font-weight: 700; color: #E8A0B0; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">Application Received</div>
              <h1 style="color: white; font-size: 26px; margin: 0; line-height: 1.2;">
                Hi ${firstName},<br/>
                <span style="color: #E8A0B0; font-style: italic; font-weight: 300;">You're officially on the list.</span>
              </h1>
            </div>
            <div style="background: #f9f9f9; padding: 32px;">
              <p style="font-size: 14px; color: #444; line-height: 1.85; margin: 0 0 16px; font-weight: 300;">
                I got your application and I'm so glad you took that step. The Inner Circle is a space built for nail techs who are serious about growth — and it sounds like you're exactly who belongs here.
              </p>
              <p style="font-size: 14px; color: #444; line-height: 1.85; margin: 0 0 24px; font-weight: 300;">
                I'll be reviewing your application and reaching out shortly with next steps to get you access. Keep an eye on your inbox.
              </p>

              <div style="background: #0D0D0D; padding: 18px 22px; margin-bottom: 24px; border-left: 3px solid #C4607A;">
                <div style="font-size: 9px; font-weight: 700; color: #E8A0B0; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">What's next</div>
                <p style="font-size: 13px; color: #FAF6F1; font-weight: 300; line-height: 1.7; margin: 0;">
                  Once approved, you'll get an invite link to set up your account and access the community portal — where the real work begins.
                </p>
              </div>

              <div style="border-top: 1px solid #eee; padding-top: 20px; display: flex; align-items: center; gap: 16px;">
                <div style="width: 44px; height: 44px; background: #C4607A; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white; flex-shrink: 0;">JR</div>
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: #0D0D0D; font-style: italic;">— Jessica Ramos</div>
                  <div style="font-size: 11px; color: #888; font-weight: 300;">info@sayjesstonails.com · 954.544.2888</div>
                </div>
              </div>
            </div>
            <div style="background: #0D0D0D; padding: 20px 32px; text-align: center;">
              <p style="color: #555; font-size: 11px; margin: 0;">SayJessToNails · Miramar, FL · <a href="https://portal.sayjesstonails.com" style="color: #C4607A; text-decoration: none;">portal.sayjesstonails.com</a></p>
            </div>
          </div>
        `
      })
    })

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
