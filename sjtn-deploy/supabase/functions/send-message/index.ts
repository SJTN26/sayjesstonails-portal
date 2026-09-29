import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JESS_EMAIL = 'info@sayjesstonails.com'
const PORTAL_URL = 'https://portal.sayjesstonails.com'
const LOGO_URL = 'https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png'

// Look up a member's first name from either the profiles or the applications table.
async function lookupFirstName(supabase, email: string): Promise<string> {
  const lower = (email || '').toLowerCase()
  if (!lower) return 'there'
  const { data: profile } = await supabase.from('mentee_profiles').select('first_name').eq('email', lower).maybeSingle()
  if (profile?.first_name) return profile.first_name
  const { data: app } = await supabase.from('community_applications').select('first_name').eq('email', lower).maybeSingle()
  if (app?.first_name) return app.first_name
  return lower.split('@')[0]
}

// Turn a raw message row into a short, safe preview for the notification email.
function messagePreview(text: string, audioUrl: string | null): string {
  if (audioUrl && audioUrl.startsWith('__IMAGE__')) return '📷 Sent you a photo'
  if (text === '🎤 Voice note' || (audioUrl && !audioUrl.startsWith('__IMAGE__'))) return '🎤 Sent you a voice note'
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return 'Sent you a message'
  return clean.length > 120 ? clean.slice(0, 120) + '…' : clean
}

function escapeHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Branded email a member receives when Jess messages them.
function memberMessageEmail(firstName: string, preview: string): string {
  return `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee;">
    <div style="background:#C4607A;padding:32px;text-align:center;"><img src="${LOGO_URL}" alt="SayJessToNails" height="120" style="display:block;margin:0 auto;" /></div>
    <div style="background:#0D0D0D;padding:24px 32px;border-left:4px solid #C4607A;"><div style="font-size:10px;font-weight:700;color:#E8A0B0;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">New Message</div><h1 style="color:#FAF6F1;font-size:24px;margin:0;line-height:1.2;">Hi ${escapeHtml(firstName)},<br/><span style="color:#E8A0B0;font-style:italic;font-weight:300;">Jess sent you a message.</span></h1></div>
    <div style="background:#f9f9f9;padding:32px;">
      <div style="background:#fff;border:1px solid #eee;border-left:3px solid #C4607A;padding:18px 22px;margin-bottom:24px;"><div style="font-size:9px;font-weight:700;color:#999;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">From Jess</div><p style="font-size:15px;color:#333;line-height:1.6;margin:0;font-weight:300;">${escapeHtml(preview)}</p></div>
      <p style="font-size:14px;color:#444;line-height:1.8;margin:0 0 24px;font-weight:300;">Head to your portal to read it and reply.</p>
      <a href="${PORTAL_URL}" style="display:inline-block;background:#C4607A;color:#fff;padding:16px 32px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Open Portal →</a>
    </div>
    <div style="background:#0D0D0D;padding:20px 32px;text-align:center;"><p style="color:#555;font-size:11px;margin:0;">SayJessToNails · Miramar, FL · <a href="${PORTAL_URL}" style="color:#C4607A;text-decoration:none;">portal.sayjesstonails.com</a></p></div>
  </div>`
}

// Branded email Jess receives when a member messages her.
function jessMessageEmail(fromName: string, fromEmail: string, preview: string): string {
  return `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eee;">
    <div style="background:#C4607A;padding:32px;text-align:center;"><img src="${LOGO_URL}" alt="SayJessToNails" height="120" style="display:block;margin:0 auto;" /></div>
    <div style="background:#0D0D0D;padding:24px 32px;border-left:4px solid #C4607A;"><div style="font-size:10px;font-weight:700;color:#E8A0B0;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">New Message</div><h1 style="color:#FAF6F1;font-size:22px;margin:0;line-height:1.2;">${escapeHtml(fromName)} sent you a message</h1></div>
    <div style="background:#f9f9f9;padding:32px;">
      <div style="background:#fff;border:1px solid #eee;border-left:3px solid #C4607A;padding:18px 22px;margin-bottom:12px;"><p style="font-size:15px;color:#333;line-height:1.6;margin:0;font-weight:300;">${escapeHtml(preview)}</p></div>
      <p style="font-size:12px;color:#999;margin:0 0 24px;">${escapeHtml(fromEmail)}</p>
      <a href="${PORTAL_URL}" style="display:inline-block;background:#C4607A;color:#fff;padding:16px 32px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Reply in Portal →</a>
    </div>
    <div style="background:#0D0D0D;padding:20px 32px;text-align:center;"><p style="color:#555;font-size:11px;margin:0;">SayJessToNails · Miramar, FL</p></div>
  </div>`
}

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Jess at SayJessToNails <info@sayjesstonails.com>', to: [to], subject, html })
    })
  } catch (_e) { /* email failure must never block the message write */ }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action, mentee_email, sender, text, audio_url, send_email, graduation_email, email_data, notify_email } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // GET messages for a mentee
    if (action === 'get') {
      const { data, error } = await supabase.from('messages')
        .select('*').eq('mentee_email', mentee_email.toLowerCase())
        .order('created_at', { ascending: true })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, messages: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // GET all messages (admin)
    if (action === 'get_all') {
      const { data, error } = await supabase.from('messages')
        .select('*').order('created_at', { ascending: true })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, messages: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // MARK messages as read
    if (action === 'mark_read') {
      const { role } = body
      // mentee reads jess messages; admin reads mentee messages
      const senderToMark = role === 'mentee' ? 'jess' : 'mentee'
      await supabase.from('messages').update({ read: true })
        .eq('mentee_email', mentee_email.toLowerCase()).eq('sender', senderToMark).eq('read', false)
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // CHECK graduation trigger
    if (action === 'check_graduation') {
      const { data } = await supabase.from('messages')
        .select('text').eq('mentee_email', mentee_email.toLowerCase())
        .like('text', '__GRADUATION__%').limit(1)
      return new Response(JSON.stringify({ success: true, graduated: data && data.length > 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // INSERT portal message
    if (mentee_email && text !== undefined) {
      await supabase.from('messages').insert([{
        mentee_email: mentee_email.toLowerCase(),
        sender: sender || 'jess',
        text: text || '',
        audio_url: audio_url || null,
        read: false
      }])

      // ── Immediate email notification for real chat messages ──────────────
      // Opt-in only: the caller passes notify_email:true for genuine, manually
      // typed chat messages. Automated portal messages (task/session/resource
      // notices, graduation triggers) stay silent — they carry their own
      // dedicated emails or are real-time prompts. System markers never notify.
      const isSystemMarker = typeof text === 'string' && text.startsWith('__') && !(audio_url && audio_url.startsWith('__IMAGE__'))
      if (notify_email && !isSystemMarker) {
        const preview = messagePreview(text, audio_url)
        if ((sender || 'jess') === 'jess') {
          // Jess → member: nudge the member back to the portal.
          const firstName = await lookupFirstName(supabase, mentee_email)
          await sendEmail(mentee_email.toLowerCase(), 'Jess sent you a message', memberMessageEmail(firstName, preview))
        } else {
          // Member → Jess: alert Jess so she can respond quickly.
          const fromName = await lookupFirstName(supabase, mentee_email)
          await sendEmail(JESS_EMAIL, `New message from ${fromName}`, jessMessageEmail(fromName, mentee_email.toLowerCase(), preview))
        }
      }
    }

    // Send email if requested
    if (send_email && email_data) {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
      const { email, firstName } = email_data
      let subject = '', html = ''

      if (graduation_email) {
        const { tier, sessionsCompleted, sessionsTotal, startDate, completionDate } = email_data
        subject = `Congratulations, ${firstName} — You Did It! 🎓`
        html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;">
          <div style="background:#C4607A;padding:40px 32px;text-align:center;"><img src="https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png" alt="SayJessToNails" height="120" style="display:block;margin:0 auto;" /></div>
          <div style="background:#0D0D0D;padding:40px 40px 32px;border-left:4px solid #2D7D4E;"><p style="font-size:11px;font-weight:700;color:#22c55e;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">Program Complete 🎓</p><h1 style="color:#FAF6F1;font-size:32px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;line-height:1.1;">You did it, ${firstName}.</h1><p style="color:#9a8880;font-size:15px;font-weight:300;margin:0;line-height:1.5;">Your ${tier} mentorship is officially complete.</p></div>
          <div style="padding:40px;background:#fafafa;border-bottom:1px solid #eee;"><p style="font-size:11px;font-weight:700;color:#999;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Your Program Summary</p>
          <table style="width:100%;border-collapse:collapse;"><tr style="border-bottom:1px solid #eee;"><td style="padding:14px 0;font-size:13px;color:#888;width:50%;">Program</td><td style="padding:14px 0;font-size:14px;color:#0D0D0D;font-weight:600;text-align:right;">${tier}</td></tr><tr style="border-bottom:1px solid #eee;"><td style="padding:14px 0;font-size:13px;color:#888;">Live Sessions</td><td style="padding:14px 0;font-size:14px;color:#0D0D0D;font-weight:600;text-align:right;">${sessionsCompleted} of ${sessionsTotal} completed</td></tr><tr style="border-bottom:1px solid #eee;"><td style="padding:14px 0;font-size:13px;color:#888;">Started</td><td style="padding:14px 0;font-size:14px;color:#0D0D0D;font-weight:600;text-align:right;">${startDate}</td></tr><tr style="border-bottom:1px solid #eee;"><td style="padding:14px 0;font-size:13px;color:#888;">Completed</td><td style="padding:14px 0;font-size:14px;color:#2D7D4E;font-weight:700;text-align:right;">${completionDate}</td></tr><tr><td style="padding:14px 0;font-size:13px;color:#888;">Community Access</td><td style="padding:14px 0;font-size:14px;color:#2D7D4E;font-weight:700;text-align:right;">1 Year — Complimentary 🎁</td></tr></table></div>
          <div style="padding:40px;"><p style="font-size:15px;color:#333;line-height:1.85;margin:0 0 16px;font-weight:300;">I am so incredibly proud of the work you've done. You showed up, you pushed through, and you proved what I already knew — that you are built for this.</p><p style="font-size:15px;color:#333;line-height:1.85;margin:0 0 24px;font-weight:300;">As a program graduate, you have <strong>1 year of complimentary access</strong> to the SayJessToNails Inner Circle community.</p>
          <div style="background:#f0faf4;border-left:3px solid #2D7D4E;padding:20px 24px;margin-bottom:32px;"><p style="font-size:14px;color:#2D7D4E;font-weight:700;margin:0 0 8px;">🎓 You're a SayJessToNails Graduate</p><p style="font-size:13px;color:#444;margin:0;font-weight:300;line-height:1.6;">Your graduate badge will appear on all your community posts.</p></div>
          <a href="https://portal.sayjesstonails.com" style="display:inline-block;background:#2D7D4E;color:#ffffff;padding:16px 32px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Go to the Community →</a></div>
          <div style="padding:0 40px 40px;"><div style="border-top:1px solid #eee;padding-top:28px;"><div style="width:48px;height:48px;background:#C4607A;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white;margin-right:16px;vertical-align:middle;">JR</div><span style="font-size:14px;font-weight:700;color:#0D0D0D;font-style:italic;vertical-align:middle;">With so much pride, Jessica Ramos</span></div></div>
          <div style="background:#0D0D0D;padding:24px 40px;text-align:center;"><p style="color:#555;font-size:12px;margin:0;">SayJessToNails · Miramar, FL · <a href="https://portal.sayjesstonails.com" style="color:#C4607A;text-decoration:none;">portal.sayjesstonails.com</a></p></div></div>`
      } else {
        const { sessionType, sessionDate, sessionTime, isReschedule } = email_data
        subject = isReschedule ? `Your Session Has Been Rescheduled — ${sessionDate}` : `Your Live Session Is Scheduled — ${sessionDate}`
        html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;">
          <div style="background:#C4607A;padding:40px 32px;text-align:center;"><img src="https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png" alt="SayJessToNails" height="120" style="display:block;margin:0 auto;" /></div>
          <div style="background:#0D0D0D;padding:32px 40px;border-left:4px solid #C4607A;"><p style="font-size:11px;font-weight:700;color:#E8A0B0;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;">${isReschedule ? 'Session Update' : 'Session Confirmed'}</p><h1 style="color:#FAF6F1;font-size:28px;font-weight:900;margin:0;line-height:1.2;">Hi ${firstName},<br/><span style="color:#E8A0B0;font-style:italic;font-weight:300;">${isReschedule ? 'Your session has been rescheduled.' : 'Your live session is confirmed.'}</span></h1></div>
          <div style="padding:40px;background:#fafafa;border-bottom:1px solid #eee;"><p style="font-size:11px;font-weight:700;color:#999;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Session Details</p>
          <table style="width:100%;border-collapse:collapse;"><tr style="border-bottom:1px solid #eee;"><td style="padding:14px 0;font-size:13px;color:#888;">Session</td><td style="padding:14px 0;font-size:14px;color:#0D0D0D;font-weight:600;text-align:right;">${sessionType}</td></tr><tr style="border-bottom:1px solid #eee;"><td style="padding:14px 0;font-size:13px;color:#888;">Date</td><td style="padding:14px 0;font-size:14px;color:#0D0D0D;font-weight:600;text-align:right;">${sessionDate}</td></tr><tr><td style="padding:14px 0;font-size:13px;color:#888;">Time</td><td style="padding:14px 0;font-size:14px;color:#0D0D0D;font-weight:600;text-align:right;">${sessionTime}</td></tr></table></div>
          <div style="padding:40px;"><p style="font-size:15px;color:#333;line-height:1.8;margin:0 0 28px;font-weight:300;">When it's time, head to your portal and click <strong>Join Session</strong>. Your session room will be live and ready.</p><a href="https://portal.sayjesstonails.com" style="display:inline-block;background:#C4607A;color:#ffffff;padding:16px 32px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Go to My Portal →</a><p style="font-size:13px;color:#888;margin:24px 0 0;font-weight:300;">Can't make it? Send Jess a message in the portal to reschedule.</p></div>
          <div style="background:#0D0D0D;padding:24px 40px;text-align:center;"><p style="color:#555;font-size:12px;margin:0;">SayJessToNails · Miramar, FL · <a href="https://portal.sayjesstonails.com" style="color:#C4607A;text-decoration:none;">portal.sayjesstonails.com</a></p></div></div>`
      }

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Jess at SayJessToNails <info@sayjesstonails.com>', to: [email], subject, html })
      })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
