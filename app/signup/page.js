'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const REGIONAL_PRICE = {
  india: '$9',
  uae: '$19',
  default: '$29',
}

const BILLING = {
  monthly: {
    label: 'Monthly',
    singlePrice: null, // use regional
    bundlePrice: '$49',
    singleSavings: null,
    bundleSavings: null,
    plan: 'monthly',
  },
  '6mo': {
    label: '6 Months',
    singlePrice: '$99',
    bundlePrice: '$159',
    singleSavings: 'Save $75',
    bundleSavings: 'Save $135',
    plan: '6mo',
  },
  annual: {
    label: 'Annual',
    singlePrice: '$169',
    bundlePrice: '$249',
    singleSavings: 'Save $179',
    bundleSavings: 'Save $339',
    plan: 'annual',
  },
}

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('single') // 'single' | 'bundle'
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [region, setRegion] = useState('default')
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('bundle') === '1') setSelectedPlan('bundle')
  }, [searchParams])

  useEffect(() => {
    const override = searchParams.get('region')
    if (override) { setRegion(override); return }
    fetch('/api/get-location')
      .then(r => r.json())
      .then(d => { if (d.region) setRegion(d.region) })
      .catch(() => {})
  }, [])

  // If already logged in and not subscribed, skip the form and go straight to checkout
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('is_subscribed').eq('id', user.id).single()
      if (profile?.is_subscribed) { window.location.href = '/radio-lab'; return }
      const endpoint = searchParams.get('bundle') === '1' ? '/api/create-bundle-checkout' : '/api/create-checkout'
      const regionOverride = searchParams.get('region')
      const activeRegion = regionOverride || region
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email, region: activeRegion }),
      })
      const result = await res.json()
      if (result.url) window.location.href = result.url
    }
    checkExistingSession()
  }, []) // run once on mount only

  const isBundleFlow = selectedPlan === 'bundle'
  const checkoutEndpoint = isBundleFlow ? '/api/create-bundle-checkout' : '/api/create-checkout'
  const loginRedirect = isBundleFlow ? '/login?bundle=1' : '/login?subscribe=1'
  const billing = BILLING[billingCycle]
  const monthlyPrice = REGIONAL_PRICE[region] || '$29'
  const displayPrice = isBundleFlow
    ? (billing.bundlePrice || billing.bundlePrice)
    : (billingCycle === 'monthly' ? monthlyPrice : billing.singlePrice)
  const savings = isBundleFlow ? billing.bundleSavings : billing.singleSavings

  const buildCheckoutBody = (userId, userEmail) => ({
    userId,
    email: userEmail,
    region,
    plan: billingCycle === 'monthly' ? undefined : billingCycle,
  })

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      if (
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already been registered')
      ) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          window.location.href = loginRedirect
          return
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_subscribed')
          .eq('id', signInData.user.id)
          .single()
        if (profile?.is_subscribed) {
          window.location.href = '/radio-lab'
          return
        }
        const res = await fetch(checkoutEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildCheckoutBody(signInData.user.id, email)),
        })
        const result = await res.json()
        if (result.error) { setMessage('Checkout error: ' + result.error); setLoading(false); return }
        window.location.href = result.url
        return
      }
      setMessage(error.message)
      setLoading(false)
      return
    }

    const res = await fetch(checkoutEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildCheckoutBody(data.user.id, email)),
    })
    const result = await res.json()
    if (result.error) { setMessage('Checkout error: ' + result.error); setLoading(false); return }
    window.location.href = result.url
  }

  return (
    <div className="w-full max-w-lg">
      <div className="text-center mb-8">
        <a href="/" className="text-2xl font-bold">✈️ Flight Levels</a>
        <h1 className="text-3xl font-bold mt-6 mb-2">Create your account</h1>
        <p className="text-gray-400">Choose a plan and start practicing today</p>
      </div>

      {/* Product Selection */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          type="button"
          onClick={() => setSelectedPlan('single')}
          className={`p-4 rounded-xl border-2 text-left transition ${
            selectedPlan === 'single'
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-white/10 bg-white/5 hover:border-white/30'
          }`}
        >
          <div className="text-xl mb-2">🎙️</div>
          <div className="font-semibold text-sm text-white">ATC Clearance Trainer</div>
          <div className="text-xs text-gray-400 mt-1">CTAF · Class D · Flight Following · IFR</div>
          <div className="text-blue-400 font-bold mt-2">{monthlyPrice}/mo</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedPlan('bundle')}
          className={`p-4 rounded-xl border-2 text-left transition relative ${
            selectedPlan === 'bundle'
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-white/10 bg-white/5 hover:border-white/30'
          }`}
        >
          <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Best Value
          </div>
          <div className="text-xl mb-2">🎁</div>
          <div className="font-semibold text-sm text-white">Both Apps</div>
          <div className="text-xs text-gray-400 mt-1">ATC Clearance Trainer + Checkride Prep</div>
          <div className="text-purple-400 font-bold mt-2">$49/mo</div>
        </button>
      </div>

      {/* Billing Cycle */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex gap-1 mb-6">
        {Object.entries(BILLING).map(([key, b]) => (
          <button
            key={key}
            type="button"
            onClick={() => setBillingCycle(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              billingCycle === key
                ? 'bg-white/15 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {b.label}
            {key === 'annual' && <span className="block text-xs text-green-400 font-normal">Best deal</span>}
          </button>
        ))}
      </div>

      {/* Price summary */}
      <div className="text-center mb-5">
        <span className="text-2xl font-bold text-white">{displayPrice}</span>
        {billingCycle !== 'monthly' && <span className="text-gray-400 text-sm ml-1">total</span>}
        {billingCycle === 'monthly' && <span className="text-gray-400 text-sm ml-1">/ month</span>}
        {savings && <span className="ml-3 text-green-400 text-sm font-semibold">{savings}</span>}
      </div>

      {/* Form */}
      <form onSubmit={handleSignup} className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Min. 6 characters"
            required
          />
        </div>

        {message && <p className="text-sm text-red-400 text-center">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition ${
            isBundleFlow ? 'bg-purple-500 hover:bg-purple-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading
            ? 'Setting up your account...'
            : `Create Account & Subscribe — ${displayPrice}${billingCycle === 'monthly' ? '/mo' : ''}`}
        </button>
      </form>

      <p className="text-center text-gray-400 mt-6">
        Already have an account?{' '}
        <a href={isBundleFlow ? '/login?bundle=1' : '/login'} className="text-blue-400 hover:text-blue-300">Log in</a>
      </p>
    </div>
  )
}

export default function Signup() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white flex items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </main>
  )
}
