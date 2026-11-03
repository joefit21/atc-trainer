import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { deleteAccount } from '@/lib/delete-account.mjs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function DELETE(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Who is deleted comes from the verified login token, never from the request body.
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await deleteAccount(user, {
    stripe,
    db: supabaseAdmin,
    deleteUser: (id) => supabaseAdmin.auth.admin.deleteUser(id),
    log: (msg, e) => console.error('Delete account:', msg, e),
  })
  if (result.ok) return Response.json({ success: true })
  return Response.json({ error: result.error }, { status: result.error === 'billing_not_cancelled' ? 502 : 500 })
}
