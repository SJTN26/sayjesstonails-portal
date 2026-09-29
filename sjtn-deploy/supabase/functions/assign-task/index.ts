import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action } = body

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── TASKS ──────────────────────────────────────────────────────────────
    if (action === 'fetch') {
      const { data, error } = await supabase.from('tasks').select('*').eq('mentee_email', body.mentee_email).order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, tasks: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'fetch_all') {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, tasks: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'insert') {
      const { data, error } = await supabase.from('tasks').insert([{ mentee_email: body.mentee_email, title: body.title, due_date: body.due_date || null, jess_notes: body.jess_notes || '', completed: false }]).select().single()
      if (error) throw error
      return new Response(JSON.stringify({ success: true, task: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'update') {
      const updates: Record<string, unknown> = {}
      if (body.completed !== undefined) updates.completed = body.completed
      if (body.mentee_notes !== undefined) updates.mentee_notes = body.mentee_notes
      if (body.title !== undefined) updates.title = body.title
      const { error } = await supabase.from('tasks').update(updates).eq('id', body.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'delete') {
      const { error } = await supabase.from('tasks').delete().eq('id', body.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // ── MENTEE PROFILES ───────────────────────────────────────────────────
    if (action === 'get_profile') {
      const { data, error } = await supabase.from('mentee_profiles').select('*').eq('email', body.email.toLowerCase()).single()
      if (error) throw error
      return new Response(JSON.stringify({ success: true, profile: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'get_all_profiles') {
      const { data, error } = await supabase.from('mentee_profiles').select('*').order('start_date', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, profiles: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'get_graduates') {
      const { data, error } = await supabase.from('mentee_profiles').select('*').eq('graduated', true).order('start_date', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, profiles: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'upsert_profile') {
      const { error } = await supabase.from('mentee_profiles').upsert(body.profile, { onConflict: 'email' })
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'check_graduated') {
      const { data } = await supabase.from('mentee_profiles').select('graduated').eq('email', body.email.toLowerCase()).single()
      return new Response(JSON.stringify({ success: true, graduated: data?.graduated || false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // ── SESSIONS HISTORY ──────────────────────────────────────────────────
    if (action === 'get_sessions') {
      const { data, error } = await supabase.from('sessions_history').select('*').order('occurred_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, sessions: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'insert_session') {
      const { error } = await supabase.from('sessions_history').insert([{ mentee_email: body.mentee_email, session_type: body.session_type, occurred_at: new Date().toISOString(), notes: body.notes || '' }])
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // ── MENTEE WINS ───────────────────────────────────────────────────────
    if (action === 'get_wins') {
      const { data, error } = await supabase.from('mentee_wins').select('*').eq('mentee_email', body.mentee_email).order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, wins: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'insert_win') {
      const { error } = await supabase.from('mentee_wins').insert([{ mentee_email: body.mentee_email, text: body.text }])
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // ── RESOURCES ─────────────────────────────────────────────────────────
    if (action === 'get_resources') {
      const [{ data: specific }, { data: global }] = await Promise.all([
        supabase.from('resources').select('*').eq('mentee_email', body.mentee_email).order('created_at', { ascending: false }),
        supabase.from('resources').select('*').is('mentee_email', null).order('created_at', { ascending: false })
      ])
      return new Response(JSON.stringify({ success: true, resources: [...(specific || []), ...(global || [])] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'get_all_resources') {
      const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, resources: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'insert_resource') {
      const { data, error } = await supabase.from('resources').insert([{ title: body.title, description: body.description, file_url: body.file_url, file_name: body.file_name, file_type: body.file_type, mentee_email: body.mentee_email || null, category: body.category || 'General' }]).select().single()
      if (error) throw error
      return new Response(JSON.stringify({ success: true, resource: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'delete_resource') {
      const { error } = await supabase.from('resources').delete().eq('id', body.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // ── COMMUNITY APPLICATIONS ────────────────────────────────────────────
    if (action === 'get_applications') {
      const { data, error } = await supabase.from('community_applications').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ success: true, applications: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'update_application') {
      const updates: Record<string, unknown> = {}
      if (body.status !== undefined) updates.status = body.status
      if (body.paid !== undefined) updates.paid = body.paid
      const { error } = await supabase.from('community_applications').update(updates).eq('id', body.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }
    if (action === 'insert_application') {
      const { error } = await supabase.from('community_applications').insert([body.application])
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
