import { createClient } from '@supabase/supabase-js'
import { requireSubscribed } from '@/lib/require-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function DELETE(request) {
  // Verify the user is authenticated (or is a demo request)
  const auth = await requireSubscribed(request)

  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the user from the token
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Delete the profile row first (FK constraint)
    await supabaseAdmin.from('profiles').delete().eq('id', user.id)

    // Delete the auth user (this is permanent)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return Response.json({ success: true })
  } catch (e) {
    console.error('Delete account error:', e)
    return Response.json({ error: 'Failed to delete account.' }, { status: 500 })
  }
}
