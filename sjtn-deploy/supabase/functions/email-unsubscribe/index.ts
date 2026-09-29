import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LOGO_URL = 'https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png'
const PORTAL_URL = 'https://portal.sayjesstonails.com'

// Must match the token scheme used by the digests function.
async function makeToken(email: string): Promise<string> {
  const secret = Deno.env.get('UNSUB_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'sjtn'
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email.toLowerCase()))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function page(title: string, message: string): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
  <body style="margin:0;background:#faf6f1;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:520px;margin:48px auto;background:#fff;border:1px solid #eee;">
      <div style="background:#C4607A;padding:36px;text-align:center;"><img src="${LOGO_URL}" alt="SayJessToNails" height="100" style="display:block;margin:0 auto;" /></div>
      <div style="padding:40px 36px;text-align:center;">
        <h1 style="font-size:22px;color:#0D0D0D;margin:0 0 12px;">${title}</h1>
        <p style="font-size:15px;color:#555;line-height:1.7;font-weight:300;margin:0 0 28px;">${message}</p>
        <a href="${PORTAL_URL}" style="display:inline-block;background:#C4607A;color:#fff;padding:14px 28px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Back to Portal →</a>
      </div>
      <div style="background:#0D0D0D;padding:20px;text-align:center;"><p style="color:#777;font-size:11px;margin:0;">SayJessToNails · Miramar, FL</p></div>
    </div>
  </body></html>`
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const email = (url.searchParams.get('e') || '').toLowerCase()
    const token = url.searchParams.get('t') || ''

    if (!email || !token) {
      return page('Invalid link', 'This unsubscribe link is missing information. Please use the link from the bottom of a recent email.')
    }
    const expected = await makeToken(email)
    if (token !== expected) {
      return page('Invalid link', "This unsubscribe link couldn't be verified. Please use the link from the bottom of a recent email.")
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await supabase.from('email_opt_outs').upsert({ email }, { onConflict: 'email' })

    return page("You're unsubscribed", "You won't receive the weekly community digest anymore. You'll still get direct messages and important account emails. Changed your mind? Just reply to any email and Jess will add you back.")
  } catch (_e) {
    return page('Something went wrong', 'We hit a snag processing your request. Please try again, or reply to any email and we\'ll sort it out.')
  }
})
