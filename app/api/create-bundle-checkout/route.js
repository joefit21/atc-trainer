import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  try {
    const { userId, email } = await req.json()

    // Check for existing Stripe customer to avoid duplicates
    const existing = await stripe.customers.list({ email, limit: 1 })
    const customer = existing.data.length > 0
      ? existing.data[0]
      : await stripe.customers.create({
          email,
          metadata: { supabase_uid: userId },
        })

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: process.env.BUNDLE_STRIPE_PRICE_ID, quantity: 1 }],
      metadata: { userId },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-success?bundle=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/signup`,
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
