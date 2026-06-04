'use client'
// Handles Supabase auth redirects (email confirmation, magic links, password reset).
// Supabase sends users to /auth/callback?code=xxx — the JS client auto-exchanges
// the code for a session when getSession() is called, then we redirect appropriately.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handle = async () => {
      // getSession() detects the `code` query param and exchanges it for a session
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        router.replace('/login?error=link_expired')
        return
      }
      // Check subscription status and route accordingly
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_subscribed')
        .eq('id', session.user.id)
        .single()
      router.replace(profile?.is_subscribed ? '/radio-lab' : '/subscribe')
    }
    handle()
  }, [])

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center">
      <p className="text-gray-400">Signing you in…</p>
    </main>
  )
}
