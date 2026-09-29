// supabase/functions/stripe-webhook/index.ts
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret)
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // ── checkout.session.completed ─────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_details?.email?.toLowerCase()

    if (email) {
      // Mark as paid in mentee_profiles
      await supabase.from('mentee_profiles')
        .update({ paid: true, role: 'community' })
        .eq('email', email)

      // Send welcome message
      await supabase.from('messages').insert({
        mentee_email: email,
        sender: 'jess',
        text: `Welcome to the Inner Circle! Your membership is now active — full access unlocked. So glad you're here. 💕`,
        created_at: new Date().toISOString(),
      })
    }
  }

  // ── customer.subscription.deleted (cancelled) ──────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const customerId = subscription.customer as string

    // Look up customer email
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
    const email = customer.email?.toLowerCase()

    if (email) {
      await supabase.from('mentee_profiles')
        .update({ paid: false })
        .eq('email', email)
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
