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
    const { action, title, audio_url } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // GET latest voice note
    if (action === 'get') {
      const { data, error } = await supabase
        .from('jess_voice')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return new Response(JSON.stringify({ success: true, voice: data || null }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // POST new voice note
    if (action === 'post') {
      const { data, error } = await supabase
        .from('jess_voice')
        .insert([{ title, audio_url }])
        .select()
        .single()
      if (error) throw error
      return new Response(JSON.stringify({ success: true, voice: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
