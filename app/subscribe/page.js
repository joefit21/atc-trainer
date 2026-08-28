'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Purchases } from '@revenuecat/purchases-capacitor'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/lib/supabase'

const RC_API_KEY = 'appl_tDPYfYHwQoiOXsOakSfWGJuIwjJ'
const OFFERING_KEY = 'default - ATC Trainer'

const BILLING = [
  { key: 'monthly',  label: 'Monthly',   price: '$29.99',  priceLabel: '$29.99/mo',  savings: null,       rcKey: 'monthly',  disclosure: '$29.99 / month' },
  { key: 'sixMonth', label: '6 Months',  price: '$99.99',  priceLabel: '$99.99 total', savings: 'Save $80', rcKey: 'sixMonth', disclosure: '$99.99 every 6 months' },
  { key: 'annual',   label: 'Annual',    price: '$169.99', priceLabel: '$169.99 total', savings: 'Save $190', rcKey: 'annual',  disclosure: '$169.99 / year' },
]

export default function Subscribe() {
  const [step, setStep] = useState('paywall')
  const [packages, setPackages] = useState({ monthly: null, sixMonth: null, annual: null })
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      router.replace('/signup')
      return
    }
    initRC()
  }, [])

  const initRC = async () => {
    try {
      await Purchases.configure({ apiKey: RC_API_KEY })

      const { data: { session } } = await supabase.auth.getSession()
      if (session) await Purchases.logIn({ appUserID: session.user.id })

      const { customerInfo } = await Purchases.getCustomerInfo()
      if (customerInfo.entitlements.active['atc_access']) {
        if (session) {
          await supabase.from('profiles').upsert({ id: session.user.id, is_subscribed: true })
          router.replace('/radio-lab')
          return
        }
        setStep('account')
        setLoading(false)
        return
      }

      const offerings = await Purchases.getOfferings()
      const offering = offerings?.all?.[OFFERING_KEY] ?? offerings?.current
      setPackages({
        monthly:  offering?.monthly  ?? offering?.availablePackages?.[0] ?? null,
        sixMonth: offering?.sixMonth ?? null,
        annual:   offering?.annual   ?? null,
      })
    } catch (e) {
      console.error('RC init error:', e)
      setError('Could not connect to the App Store. Please check your connection and try again.')
    }
    setLoading(false)
  }

  const handleSubscribe = async () => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'subscribe_clicked', { app: 'atc_trainer', plan: billingCycle })
    }
    setPurchasing(true)
    setError('')
    try {
      const tier = BILLING.find(b => b.key === billingCycle)
      let pkg = packages[tier.rcKey]

      // Fall back to re-fetching if not loaded
      if (!pkg) {
        const offerings = await Purchases.getOfferings()
        const offering = offerings?.all?.[OFFERING_KEY] ?? offerings?.current
        pkg = offering?.[tier.rcKey] ?? offering?.availablePackages?.[0] ?? null
      }
      if (!pkg) {
        setError('Unable to load subscription. Please check your connection and try again.')
        setPurchasing(false)
        return
      }

      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
      const { data: { session } } = await supabase.auth.getSession()
      if (customerInfo.entitlements.active['atc_access'] && session) {
        await supabase.from('profiles').upsert({ id: session.user.id, is_subscribed: true })
        router.replace('/radio-lab')
      } else {
        setStep('account')
      }
    } catch (e) {
      if (!e.userCancelled) setError('Purchase failed. Please try again.')
    }
    setPurchasing(false)
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) throw signUpError
      await supabase.from('profiles').upsert({ id: data.user.id, is_subscribed: true })
      await Purchases.logIn({ appUserID: data.user.id })
      router.replace('/radio-lab')
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    setPurchasing(true)
    setError('')
    try {
      const { customerInfo } = await Purchases.restorePurchases()
      if (customerInfo.entitlements.active['atc_access']) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await supabase.from('profiles').upsert({ id: session.user.id, is_subscribed: true })
          await Purchases.logIn({ appUserID: session.user.id })
          router.replace('/radio-lab')
        } else {
          setStep('account')
        }
      } else {
        setError('No active subscription found.')
      }
    } catch (e) {
      setError('Restore failed. Please try again.')
    }
    setPurchasing(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    )
  }

  if (step === 'account') {
    return (
      <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center px-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold mb-2">Subscription activated!</h1>
            <p className="text-gray-400">Create your account to start practicing.</p>
          </div>
          <form onSubmit={handleCreateAccount} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Min. 6 characters" required />
            </div>
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition">
              {loading ? 'Creating account...' : 'Create Account & Start Practicing'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  const activeTier = BILLING.find(b => b.key === billingCycle)
  const activePackage = packages[activeTier.rcKey]

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex flex-col items-center justify-center px-6 py-12" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}>
      <div className="w-full max-w-md text-center">
        <div className="text-left mb-4">
          <a href="/" className="text-gray-400 hover:text-white text-sm transition">← Back</a>
        </div>
        <div className="text-5xl mb-6">🎙️</div>
        <h1 className="text-3xl font-bold mb-3">ATC Clearance AI</h1>
        <p className="text-gray-400 mb-6 max-w-sm mx-auto">AI-powered ATC radio practice for student and certificated pilots.</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 text-left space-y-3">
          {[
            'CTAF, Class D, Flight Following & IFR clearances',
            'Real-time AI grading on every transmission',
            'Dynamic scenarios with randomized airports',
            'Voice input — practice saying it out loud',
            'Instant feedback with correct phraseology',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm text-gray-300">
              <span className="text-green-400">✓</span> {f}
            </div>
          ))}
        </div>

        {/* Billing cycle toggle */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex gap-1 mb-4">
          {BILLING.map(b => (
            <button key={b.key} type="button" onClick={() => setBillingCycle(b.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${billingCycle === b.key ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}>
              {b.label}
              {b.key === 'annual' && <span className="block text-xs text-green-400 font-normal">Best deal</span>}
            </button>
          ))}
        </div>

        {/* Price summary */}
        <div className="text-center mb-4">
          <span className="text-2xl font-bold">{activeTier.priceLabel}</span>
          {activeTier.savings && <span className="ml-3 text-green-400 text-sm font-semibold">{activeTier.savings}</span>}
        </div>

        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <button
          onClick={activePackage ? handleSubscribe : initRC}
          disabled={purchasing || loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-4 rounded-xl font-bold text-lg transition mb-4"
        >
          {purchasing ? 'Processing…' : loading ? 'Loading…' : activePackage ? `Subscribe — ${activeTier.priceLabel}` : 'Retry Loading Subscription'}
        </button>

        <a href="/login" className="block text-gray-400 text-sm mb-6 hover:text-white transition">
          Already have an account? Log in
        </a>

        <button onClick={handleRestore} disabled={purchasing}
          className="text-gray-500 text-xs hover:text-gray-400 transition">
          Restore purchases
        </button>

        <div className="mt-8 text-xs text-gray-500 text-left space-y-2 leading-relaxed">
          <p>
            <strong className="text-gray-400">ATC Clearance AI — {activeTier.label} Subscription</strong><br />
            {activeTier.disclosure}. Payment will be charged to your Apple ID account at confirmation of purchase.
            Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
            Your account will be charged for renewal within 24 hours prior to the end of the current period.
            You can manage and cancel your subscription in your App Store account settings at any time after purchase.
          </p>
          <p className="flex gap-4">
            <a href="https://www.flight-levels.com/terms" className="underline hover:text-gray-300 transition">Terms of Use</a>
            <a href="https://www.flight-levels.com/privacy" className="underline hover:text-gray-300 transition">Privacy Policy</a>
          </p>
        </div>
      </div>
    </main>
  )
}
