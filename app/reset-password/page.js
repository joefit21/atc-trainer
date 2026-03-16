'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase automatically handles the token from the URL hash
    // We just need to confirm a session exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      } else {
        // Listen for the auth state change when the token is processed
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            setReady(true)
            subscription.unsubscribe()
          }
        })
      }
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => router.push('/trainer'), 2500)
    }
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center px-4">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-4">🔐</div>
          <p>Verifying your reset link...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold">✈️ ATC Trainer</a>
          <h1 className="text-3xl font-bold mt-6 mb-2">Set new password</h1>
          <p className="text-gray-400">Choose a strong password for your account</p>
        </div>

        {success ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-semibold">Password updated!</h2>
            <p className="text-gray-400">Taking you to the trainer...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Min. 6 characters"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Repeat your password"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
