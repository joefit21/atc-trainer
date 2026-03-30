import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(request) {
  try {
    const { userId, email, region } = await request.json()

    const priceId = region === 'india'
      ? process.env.INDIA_STRIPE_PRICE_ID
      : region === 'uae'
        ? process.env.UAE_STRIPE_PRICE_ID
        : process.env.STRIPE_PRICE_ID

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      metadata: { userId },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/signup`
    })

    return Response.json({ url: session.url })

  } catch (error) {
    console.error('Checkout error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
