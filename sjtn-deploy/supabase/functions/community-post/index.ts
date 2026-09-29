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

    if (action === 'fetch') {
      const { data, error } = await supabase.from('community_posts')
        .select('*').order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      return new Response(JSON.stringify({ success: true, posts: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    if (action === 'insert') {
      const { data, error } = await supabase.from('community_posts').insert([{
        author: body.author, avatar: body.avatar, text: body.text,
        cat: body.cat, likes: 0, is_jess: body.is_jess || false,
        pinned: body.pinned || false, audio_url: body.audio_url || null,
        is_graduate: body.is_graduate || false
      }]).select().single()
      if (error) throw error
      return new Response(JSON.stringify({ success: true, post: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    if (action === 'delete') {
      const { error } = await supabase.from('community_posts').delete().eq('id', body.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    if (action === 'update') {
      const updates: Record<string, unknown> = {}
      if (body.pinned !== undefined) updates.pinned = body.pinned
      if (body.likes !== undefined) updates.likes = body.likes
      if (body.text !== undefined) updates.text = body.text
      const { error } = await supabase.from('community_posts').update(updates).eq('id', body.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // LIKE a post — liked_by (array of emails) is the source of truth; likes = its length.
    if (action === 'like') {
      const email = (body.user_email || '').toLowerCase()
      const { data: post } = await supabase.from('community_posts').select('liked_by').eq('id', body.id).single()
      const set = new Set<string>(Array.isArray(post?.liked_by) ? post.liked_by : [])
      if (email) set.add(email)
      const liked_by = [...set]
      const { error } = await supabase.from('community_posts').update({ liked_by, likes: liked_by.length }).eq('id', body.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true, likes: liked_by.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // UNLIKE a post.
    if (action === 'unlike') {
      const email = (body.user_email || '').toLowerCase()
      const { data: post } = await supabase.from('community_posts').select('liked_by').eq('id', body.id).single()
      const liked_by = (Array.isArray(post?.liked_by) ? post.liked_by : []).filter((e: string) => e !== email)
      const { error } = await supabase.from('community_posts').update({ liked_by, likes: liked_by.length }).eq('id', body.id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true, likes: liked_by.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // REPLY to a post — appended to the post's replies array with a server timestamp.
    if (action === 'reply') {
      const { data: post } = await supabase.from('community_posts').select('replies').eq('id', body.post_id).single()
      const replies = Array.isArray(post?.replies) ? post.replies : []
      const reply = {
        author: body.author, avatar: body.avatar, text: body.text || '',
        is_jess: body.is_jess || false, author_email: (body.author_email || '').toLowerCase() || null,
        created_at: new Date().toISOString(),
      }
      replies.push(reply)
      const { error } = await supabase.from('community_posts').update({ replies }).eq('id', body.post_id)
      if (error) throw error
      return new Response(JSON.stringify({ success: true, reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
