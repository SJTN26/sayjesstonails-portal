import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const JESS_EMAIL = 'info@sayjesstonails.com'
const PORTAL_URL = 'https://portal.sayjesstonails.com'
const LOGO_URL = 'https://eytysuurxsfsbimgpion.supabase.co/storage/v1/object/public/Assets/Say_Jess_To_Nails_Logo_Black.png'
const FUNCTIONS_BASE = 'https://eytysuurxsfsbimgpion.supabase.co/functions/v1'

function escapeHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function snippet(text: string, n = 90): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (!clean || clean.startsWith('__')) return '(shared a post)'
  return clean.length > n ? clean.slice(0, n) + '…' : clean
}

// Signed unsubscribe token so members can only opt themselves out.
async function makeToken(email: string): Promise<string> {
  const secret = Deno.env.get('UNSUB_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'sjtn'
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email.toLowerCase()))
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Jess at SayJessToNails <info@sayjesstonails.com>', to: [to], subject, html })
  })
}

function shell(inner: string): string {
  return `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #eee;">
    <div style="background:#C4607A;padding:36px 32px;text-align:center;"><img src="${LOGO_URL}" alt="SayJessToNails" height="110" style="display:block;margin:0 auto;" /></div>
    ${inner}
  </div>`
}

function footer(unsubHtml: string): string {
  return `<div style="background:#0D0D0D;padding:24px 32px;text-align:center;"><p style="color:#777;font-size:11px;margin:0 0 6px;">SayJessToNails · Miramar, FL · <a href="${PORTAL_URL}" style="color:#C4607A;text-decoration:none;">portal.sayjesstonails.com</a></p>${unsubHtml}</div>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))

    // Guard: digests trigger bulk email, so require the shared cron secret.
    // (Set DIGEST_SECRET in the function's env; the cron job passes it in the body.)
    const required = Deno.env.get('DIGEST_SECRET')
    if (required && body.secret !== required) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 })
    }

    const kind = body.kind || 'community_weekly'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── Jess's daily community digest ──────────────────────────────────────
    if (kind === 'jess_daily') {
      const sinceMs = Date.now() - 24 * 60 * 60 * 1000
      const since = new Date(sinceMs).toISOString()
      // Posts are fetched regardless of age so we can see replies on older posts too.
      // New community members are tracked via community_applications.applied_at.
      // (mentee_profiles has no timestamp column, so it can't be date-filtered;
      // direct-invite members are Jess's own action and don't need a daily alert.)
      const [{ data: posts }, { data: apps }] = await Promise.all([
        supabase.from('community_posts').select('author, text, is_jess, created_at, replies').order('created_at', { ascending: false }).limit(500),
        supabase.from('community_applications').select('first_name, email, applied_at').eq('status', 'approved').gte('applied_at', since),
      ])
      const memberPosts = (posts || []).filter(p => !p.is_jess && new Date(p.created_at).getTime() >= sinceMs)
      const memberReplies: { author?: string; text?: string; postAuthor?: string }[] = []
      for (const p of posts || []) {
        for (const r of (Array.isArray(p.replies) ? p.replies : [])) {
          if (r && !r.is_jess && r.created_at && new Date(r.created_at).getTime() >= sinceMs) memberReplies.push({ ...r, postAuthor: p.author })
        }
      }
      const seen = new Set<string>()
      const uniqueNew = (apps || []).filter(m => { const e = (m.email || '').toLowerCase(); if (!e || seen.has(e)) return false; seen.add(e); return true })

      if (memberPosts.length === 0 && memberReplies.length === 0 && uniqueNew.length === 0) {
        return new Response(JSON.stringify({ success: true, sent: false, reason: 'no activity' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
      }

      const postsHtml = memberPosts.length
        ? `<p style="font-size:11px;font-weight:700;color:#999;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">${memberPosts.length} New Post${memberPosts.length > 1 ? 's' : ''}</p>` +
          memberPosts.map(p => `<div style="border-left:3px solid #C4607A;padding:10px 16px;margin-bottom:10px;background:#faf6f1;"><div style="font-size:13px;font-weight:700;color:#0D0D0D;">${escapeHtml(p.author || 'A member')}</div><div style="font-size:13px;color:#555;font-weight:300;">${escapeHtml(snippet(p.text))}</div></div>`).join('')
        : ''
      const repliesHtml = memberReplies.length
        ? `<p style="font-size:11px;font-weight:700;color:#999;letter-spacing:2px;text-transform:uppercase;margin:24px 0 12px;">${memberReplies.length} New Repl${memberReplies.length > 1 ? 'ies' : 'y'}</p>` +
          memberReplies.slice(0, 8).map(r => `<div style="padding:8px 16px;margin-bottom:8px;border-left:2px solid #ddd;"><div style="font-size:12px;font-weight:700;color:#0D0D0D;">${escapeHtml(r.author || 'A member')} <span style="font-weight:300;color:#999;">replied to ${escapeHtml(r.postAuthor || 'a post')}</span></div><div style="font-size:13px;color:#555;font-weight:300;">${escapeHtml(snippet(r.text || ''))}</div></div>`).join('')
        : ''
      const membersHtml = uniqueNew.length
        ? `<p style="font-size:11px;font-weight:700;color:#999;letter-spacing:2px;text-transform:uppercase;margin:24px 0 12px;">${uniqueNew.length} New Member${uniqueNew.length > 1 ? 's' : ''}</p>` +
          `<p style="font-size:14px;color:#333;font-weight:300;margin:0;">${uniqueNew.map(m => escapeHtml(m.first_name || (m.email || '').split('@')[0])).join(' · ')}</p>`
        : ''

      const html = shell(`
        <div style="background:#0D0D0D;padding:24px 32px;border-left:4px solid #C4607A;"><div style="font-size:10px;font-weight:700;color:#E8A0B0;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Community · Last 24 Hours</div><h1 style="color:#FAF6F1;font-size:22px;margin:0;line-height:1.2;">Here's what happened today</h1></div>
        <div style="background:#fff;padding:28px 32px;">${postsHtml}${repliesHtml}${membersHtml}<div style="margin-top:24px;"><a href="${PORTAL_URL}" style="display:inline-block;background:#C4607A;color:#fff;padding:14px 28px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Open Community →</a></div></div>
        ${footer('')}
      `)
      await sendEmail(JESS_EMAIL, `Community today — ${memberPosts.length} post${memberPosts.length !== 1 ? 's' : ''}, ${memberReplies.length} repl${memberReplies.length !== 1 ? 'ies' : 'y'}, ${uniqueNew.length} new member${uniqueNew.length !== 1 ? 's' : ''}`, html)
      return new Response(JSON.stringify({ success: true, sent: true, posts: memberPosts.length, replies: memberReplies.length, newMembers: uniqueNew.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // ── Weekly community digest to members ─────────────────────────────────
    const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000
    const [{ data: posts }, { data: apps }, { data: profiles }, { data: optOuts }] = await Promise.all([
      // All posts (with replies) so we can count replies on older posts too.
      supabase.from('community_posts').select('author, text, is_jess, created_at, replies').order('created_at', { ascending: false }).limit(500),
      supabase.from('community_applications').select('first_name, email, applied_at').eq('status', 'approved'),
      supabase.from('mentee_profiles').select('first_name, email'),
      supabase.from('email_opt_outs').select('email'),
    ])

    const isNew = (d: string) => d && new Date(d).getTime() >= weekAgoMs
    const newPosts = (posts || []).filter(p => isNew(p.created_at)).length
    const newReplies = (posts || []).reduce((n, p) => n + (Array.isArray(p.replies) ? p.replies.filter((r: { created_at?: string }) => r?.created_at && isNew(r.created_at)).length : 0), 0)
    // New members = approved applications that came in this week (applied_at).
    const newMemberCount = (apps || []).filter(m => isNew(m.applied_at)).length

    // Only send when the week actually had something worth reporting.
    if (newPosts === 0 && newReplies === 0 && newMemberCount === 0) {
      return new Response(JSON.stringify({ success: true, sent: false, reason: 'quiet week' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // Build the deduped recipient roster, minus anyone who opted out.
    const optedOut = new Set((optOuts || []).map(o => (o.email || '').toLowerCase()))
    const roster = new Map<string, string>() // email -> first name
    for (const m of [...(apps || []), ...(profiles || [])]) {
      const email = (m.email || '').toLowerCase()
      if (!email || optedOut.has(email)) continue
      if (!roster.has(email)) roster.set(email, m.first_name || email.split('@')[0])
    }

    const highlights = (posts || []).filter(p => !p.is_jess && isNew(p.created_at)).slice(0, 3)
      .map(p => `<div style="border-left:3px solid #C4607A;padding:10px 16px;margin-bottom:10px;background:#faf6f1;"><div style="font-size:13px;font-weight:700;color:#0D0D0D;">${escapeHtml(p.author || 'A member')}</div><div style="font-size:13px;color:#555;font-weight:300;">${escapeHtml(snippet(p.text))}</div></div>`).join('')

    const statLine = [
      newPosts > 0 ? `${newPosts} new post${newPosts !== 1 ? 's' : ''}` : null,
      newReplies > 0 ? `${newReplies} repl${newReplies !== 1 ? 'ies' : 'y'}` : null,
      newMemberCount > 0 ? `${newMemberCount} new member${newMemberCount !== 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ')

    let sent = 0
    for (const [email, firstName] of roster) {
      const token = await makeToken(email)
      const unsubUrl = `${FUNCTIONS_BASE}/email-unsubscribe?e=${encodeURIComponent(email)}&t=${token}`

      const html = shell(`
        <div style="background:#0D0D0D;padding:28px 32px;border-left:4px solid #C4607A;"><div style="font-size:10px;font-weight:700;color:#E8A0B0;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">This Week in the Inner Circle</div><h1 style="color:#FAF6F1;font-size:24px;margin:0;line-height:1.2;">Hi ${escapeHtml(firstName)},<br/><span style="color:#E8A0B0;font-style:italic;font-weight:300;">the community's been busy.</span></h1></div>
        <div style="background:#fff;padding:28px 32px;">
          <div style="text-align:center;background:#faf6f1;padding:18px;margin-bottom:24px;"><p style="font-size:16px;font-weight:700;color:#C4607A;margin:0;">${statLine}</p></div>
          ${highlights ? `<p style="font-size:11px;font-weight:700;color:#999;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">A Few Highlights</p>${highlights}` : ''}
          <p style="font-size:14px;color:#444;line-height:1.8;margin:20px 0 24px;font-weight:300;">Jump back in — react, reply, or share a win of your own.</p>
          <a href="${PORTAL_URL}" style="display:inline-block;background:#C4607A;color:#fff;padding:16px 32px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Open the Community →</a>
        </div>
        ${footer(`<p style="margin:0;"><a href="${unsubUrl}" style="color:#777;font-size:11px;text-decoration:underline;">Unsubscribe from weekly updates</a></p>`)}
      `)
      try { await sendEmail(email, "This week in the SayJessToNails community", html); sent++ } catch (_e) { /* skip individual failures */ }
      await new Promise(r => setTimeout(r, 120)) // gentle spacing for the email provider
    }

    return new Response(JSON.stringify({ success: true, sent: true, recipients: sent, posts: newPosts, newMembers: newMemberCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
