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
    const { sessionName, menteeEmail } = await req.json()
    const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY')

    // Create a Daily.co room
    const roomName = `sjtn-${Date.now()}`
    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          max_participants: 2
        }
      })
    })

    const room = await res.json()

    if (!room.url) throw new Error(`Daily.co error: ${JSON.stringify(room)}`)

    return new Response(
      JSON.stringify({ success: true, url: room.url, name: roomName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})