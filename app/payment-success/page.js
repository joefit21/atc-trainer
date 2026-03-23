'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentSuccess() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        send_to: 'AW-17833668075/U8GpCN_jlY4cEOvb4LdC',
        value: 29.0,
        currency: 'USD',
        transaction_id: '',
      })
    }

    const timer = setTimeout(() => {
      router.push('/login')
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-4">You're all set!</h1>
        <p className="text-gray-400 text-lg mb-6">
          Your subscription is active. Check your email to confirm your account, then log in to start practicing.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-400">
          Redirecting you to login in 5 seconds...
        </div>
        <a href="/login" className="block mt-6 bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition">
          Go to Login Now
        </a>
      </div>
    </main>
  )
}
