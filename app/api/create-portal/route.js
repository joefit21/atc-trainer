import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId, email } = await request.json()

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    let customerId = profile?.stripe_customer_id

    // Fallback: look up Stripe customer by email (covers iOS subscribers with no stripe_customer_id)
    if (!customerId && email) {
      const customers = await stripe.customers.list({ email, limit: 1 })
      customerId = customers.data[0]?.id
    }

    if (!customerId) {
      return Response.json({ error: 'no_stripe_customer' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/radio-lab`,
    })

    return Response.json({ url: session.url })

  } catch (error) {
    console.error('Portal error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
