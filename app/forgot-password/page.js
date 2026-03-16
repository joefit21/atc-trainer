'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://practice.flight-levels.com/reset-password'
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSubmitted(true)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold">✈️ ATC Trainer</a>
          <h1 className="text-3xl font-bold mt-6 mb-2">Reset your password</h1>
          <p className="text-gray-400">Enter your email and we'll send you a reset link</p>
        </div>

        {submitted ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
            <div className="text-4xl">📧</div>
            <h2 className="text-xl font-semibold">Check your email</h2>
            <p className="text-gray-400">We sent a password reset link to <span className="text-white">{email}</span>. Click the link in that email to set a new password.</p>
            <a href="/login" className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm transition">
              ← Back to login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="you@example.com"
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {!submitted && (
          <p className="text-center text-gray-400 mt-6">
            Remembered it?{' '}
            <a href="/login" className="text-blue-400 hover:text-blue-300">Back to login</a>
          </p>
        )}
      </div>
    </main>
  )
}
