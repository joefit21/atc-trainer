import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Verifies the Bearer token in the Authorization header and checks that the
 * user has an active subscription. Returns { authError } if the request should
 * be rejected, or { user } if it should proceed.
 */
export async function requireSubscribed(request) {
  // Allow demo requests through without auth
  if (request.headers.get('X-Demo-Request') === '1') {
    return { user: null }
  }

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '').trim()

  if (!token) {
    return { authError: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return { authError: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_subscribed')
    .eq('id', user.id)
    .single()

  if (!profile?.is_subscribed) {
    return { authError: Response.json({ error: 'Subscription required' }, { status: 403 }) }
  }

  return { user }
}
