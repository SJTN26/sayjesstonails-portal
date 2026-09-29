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
    const { email, firstName, sessionType, sessionDate, sessionTime, isReschedule } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    const subject = isReschedule
      ? `Your Session Has Been Rescheduled — ${sessionDate}`
      : `Your Live Session Is Scheduled — ${sessionDate}`

    const headline = isReschedule
      ? `Your session has been rescheduled.`
      : `Your live session is confirmed.`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Jess at SayJessToNails <info@sayjesstonails.com>',
        to: [email],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #eee;">

            <!-- LOGO HEADER -->
            <div style="background: #C4607A; padding: 32px; text-align: center;">
              <img
                src="https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png"
                alt="SayJessToNails"
                height="160"
                style="display: block; margin: 0 auto;"
              />
            </div>

            <!-- HEADLINE -->
            <div style="background: #0D0D0D; padding: 24px 32px; border-left: 4px solid #C4607A;">
              <div style="font-size: 10px; font-weight: 700; color: #E8A0B0; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">
                ${isReschedule ? 'Session Update' : 'Session Confirmed'}
              </div>
              <h1 style="color: white; font-size: 28px; margin: 0; letter-spacing: -0.5px; line-height: 1.1;">
                Hi ${firstName},<br/>
                <span style="color: #E8A0B0; font-style: italic; font-weight: 300;">${headline}</span>
              </h1>
            </div>

            <!-- SESSION DETAILS -->
            <div style="background: #f9f9f9; padding: 32px;">
              <div style="background: #0D0D0D; padding: 20px 24px; margin-bottom: 24px; border-left: 3px solid #C4607A;">
                <div style="font-size: 9px; font-weight: 700; color: #E8A0B0; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;">Session Details</div>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; width: 40%;">Session</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #FAF6F1; font-weight: 700;">${sessionType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase;">Date</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #FAF6F1;">${sessionDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase;">Time</td>
                    <td style="padding: 8px 0; font-size: 14px; color: #FAF6F1;">${sessionTime}</td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 13px; color: #444; line-height: 1.8; margin: 0 0 20px; font-weight: 300;">
                When it's time, head to your portal and click <strong>Join Session</strong>. Your session room will be live and ready for you.
              </p>

              <div style="margin-bottom: 24px;">
                <a href="https://portal.sayjesstonails.com" style="background: #C4607A; color: white; padding: 14px 28px; text-decoration: none; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">
                  Go to My Portal →
                </a>
              </div>

              <p style="font-size: 12px; color: #888; line-height: 1.7; margin: 0; font-weight: 300;">
                Can't make it? Reply to this email or send Jess a message in the portal to reschedule.
              </p>
            </div>

            <!-- FOOTER -->
            <div style="background: #0D0D0D; padding: 20px 32px; text-align: center;">
              <p style="color: #555; font-size: 11px; margin: 0;">
                SayJessToNails · Miramar, FL ·
                <a href="https://portal.sayjesstonails.com" style="color: #C4607A; text-decoration: none;">portal.sayjesstonails.com</a>
              </p>
            </div>

          </div>
        `
      })
    })

    const result = await res.json()

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
