import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (error) {
    return Response.json({ error: 'Webhook error' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    // Primary: userId in session metadata (ATC Trainer individual checkout)
    // Fallback: supabase_uid in customer metadata (bundle checkout)
    let userId = session.metadata?.userId
    const customerId = session.customer

    if (!userId && customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId)
        userId = customer.metadata?.supabase_uid
      } catch (err) {
        console.error('Failed to retrieve customer:', err)
      }
    }

    if (userId) {
      await supabase
        .from('profiles')
        .upsert({ id: userId, is_subscribed: true, stripe_customer_id: customerId })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single()

    if (data) {
      await supabase
        .from('profiles')
        .update({ is_subscribed: false })
        .eq('id', data.id)
    }
  }

  return Response.json({ received: true })
}
