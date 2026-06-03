'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Capacitor } from '@capacitor/core'

const REGIONAL_PRICE = {
  india: '$9',
  uae: '$19',
  default: '$29',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'ATC Clearance Trainer',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: 'https://practice.flight-levels.com',
      description: 'AI-powered ATC radio practice for pilots. Practice ATC radio calls, IFR clearances, and readbacks with real-time AI scoring. Built by a CFI and former air traffic controller.',
      author: { '@type': 'Person', name: 'Joe Mattison' },
      offers: [
        {
          '@type': 'Offer',
          name: 'ATC Clearance Trainer',
          price: '29.00',
          priceCurrency: 'USD',
          priceSpecification: { '@type': 'RecurringChargeSpecification', billingDuration: 'P1M', billingIncrement: 1 },
        },
        {
          '@type': 'Offer',
          name: 'Flight Levels Bundle (ATC Trainer + Checkride Prep)',
          price: '49.00',
          priceCurrency: 'USD',
          priceSpecification: { '@type': 'RecurringChargeSpecification', billingDuration: 'P1M', billingIncrement: 1 },
        },
      ],
    },
    {
      '@type': 'WebSite',
      url: 'https://practice.flight-levels.com',
      name: 'ATC Clearance Trainer — Flight Levels',
      description: 'Practice ATC radio calls and readbacks with AI-powered feedback. Built for student pilots, IFR students, and anyone who wants to sound confident on the radio.',
    },
  ],
}

function HomeContent() {
  const [price, setPrice] = useState('$29')
  const [region, setRegion] = useState('default')
  const searchParams = useSearchParams()

  // Audio preview state
  // status: 'idle' | 'loading' | 'ready' | 'played'
  const [groundPreview, setGroundPreview] = useState({ status: 'idle', text: '' })
  const [ifrPreview, setIfrPreview]       = useState({ status: 'idle', text: '' })
  const groundAudioRef    = useRef(null)
  const ifrAudioRef       = useRef(null)
  const previewSectionRef = useRef(null)
  const groundFetched     = useRef(false)
  const ifrFetched        = useRef(false)

  // Fetch audio (optionally auto-play when done)
  const fetchPreview = async (type, andPlay = false) => {
    const setter    = type === 'ground' ? setGroundPreview : setIfrPreview
    const audioRef  = type === 'ground' ? groundAudioRef   : ifrAudioRef
    const guard     = type === 'ground' ? groundFetched    : ifrFetched
    if (guard.current) {
      // Already fetched — just play
      if (andPlay) audioRef.current?.play().catch(() => {})
      if (andPlay) setter(p => ({ ...p, status: 'played' }))
      return
    }
    guard.current = true
    setter(p => ({ ...p, status: 'loading' }))
    try {
      const res  = await fetch(`/api/demo-scenario?type=${type}`)
      const data = await res.json()
      if (audioRef.current) {
        audioRef.current.src = data.audio_url
        audioRef.current.load()
        if (andPlay) audioRef.current.play().catch(() => {})
      }
      setter({ status: andPlay ? 'played' : 'ready', text: data.clearance_text })
    } catch {
      guard.current = false
      setter(p => ({ ...p, status: 'idle' }))
    }
  }

  // Pre-fetch when the preview section scrolls into view
  useEffect(() => {
    const el = previewSectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fetchPreview('ground')
          fetchPreview('ifr')
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const playPreview = (type) => {
    const preview  = type === 'ground' ? groundPreview : ifrPreview
    const setter   = type === 'ground' ? setGroundPreview : setIfrPreview
    const audioRef = type === 'ground' ? groundAudioRef   : ifrAudioRef
    if (preview.status === 'loading') return
    if (preview.status === 'ready' || preview.status === 'played') {
      setter(p => ({ ...p, status: 'played' }))
      audioRef.current?.play().catch(() => {})
      return
    }
    fetchPreview(type, true)
  }

  useEffect(() => {
    const override = searchParams.get('region')
    if (override) {
      setRegion(override)
      setPrice(REGIONAL_PRICE[override] || '$29')
      return
    }
    fetch('/api/get-location')
      .then(r => r.json())
      .then(d => {
        if (d.region) {
          setRegion(d.region)
          setPrice(REGIONAL_PRICE[d.region] || '$29')
        }
      })
      .catch(() => {})
  }, [])

  const isNative = Capacitor.isNativePlatform()
  const signupUrl = isNative ? '/subscribe' : (region && region !== 'default' ? `/signup?region=${region}` : '/signup')

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-[#0a0f1e]" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)' }}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold">Flight Levels</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/study-guides" className="text-gray-300 hover:text-white transition text-sm">Study Guides</a>
          <a href="/login" className="text-gray-300 hover:text-white transition">Log In</a>
          <a href={signupUrl} className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition">Subscribe</a>
        </div>
      </nav>

      <section className="flex flex-col items-center text-center px-8 py-24">
        <div className="inline-block bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm px-4 py-1 rounded-full mb-6">
          Built by a CFI & former air traffic controller
        </div>
        <h1 className="text-5xl md:text-6xl font-bold max-w-3xl leading-tight mb-6">
          Stop Freezing on the Radio. <span className="text-blue-400">Practice ATC Calls Until They're Automatic.</span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mb-4">
          Every pilot has felt it — ATC calls your tail number and your mind goes blank. ATC Clearance Trainer gives you a safe place to practice until the words come naturally.
        </p>
        <p className="text-gray-500 text-base max-w-xl mb-10">
          Built by a CFI and former controller. Practice ground, tower, flight following, and IFR clearances — real scenarios, real AI feedback, no instructor required.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a href="/demo" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition">
            Try Free Demo
          </a>
          <a href={signupUrl} className="border border-white/20 hover:border-white/40 px-8 py-4 rounded-lg text-lg transition">
            Subscribe — {price}/mo
          </a>
        </div>
      </section>

      {/* Audio Preview */}
      <section ref={previewSectionRef} className="px-8 py-16 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-3">Hear what it sounds like</h2>
        <p className="text-gray-400 text-center mb-10 max-w-lg mx-auto">
          The same AI controller voice you'll practice with. Click to hear a real transmission.
        </p>
        <div className="grid md:grid-cols-2 gap-6">

          {/* VFR Ground Taxi */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
            <div className="text-2xl mb-3">🛫</div>
            <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">VFR — Class D</p>
            <h3 className="font-semibold mb-1">Ground Taxi Clearance</h3>
            <p className="text-gray-500 text-sm mb-5 flex-1">You've called ground control ready to taxi. Hear what they say back — then you'd read it back.</p>
            <audio ref={groundAudioRef} />
            <button
              onClick={() => playPreview('ground')}
              disabled={groundPreview.status === 'loading'}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition w-full"
            >
              {groundPreview.status === 'loading'
                ? <span className="animate-pulse">Loading audio...</span>
                : '▶ Play Clearance'}
            </button>
            {groundPreview.text && (
              <div className="mt-4 bg-black/20 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-500 mb-1">Ground said:</p>
                <p className="text-sm text-gray-200 italic">&ldquo;{groundPreview.text}&rdquo;</p>
                <button
                  onClick={() => playPreview('ground')}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition"
                >▶ Play again</button>
              </div>
            )}
          </div>

          {/* IFR Clearance */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
            <div className="text-2xl mb-3">📋</div>
            <p className="text-xs text-blue-400 uppercase tracking-widest mb-1">IFR — CRAFT Clearance</p>
            <h3 className="font-semibold mb-1">IFR Departure Clearance</h3>
            <p className="text-gray-500 text-sm mb-5 flex-1">A full IFR clearance — write it down in CRAFT format, then read it back verbatim.</p>
            <audio ref={ifrAudioRef} />
            <button
              onClick={() => playPreview('ifr')}
              disabled={ifrPreview.status === 'loading'}
              className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition w-full"
            >
              {ifrPreview.status === 'loading'
                ? <span className="animate-pulse">Loading audio...</span>
                : '▶ Play Clearance'}
            </button>
            {ifrPreview.text && (
              <div className="mt-4 bg-black/20 rounded-lg px-4 py-3 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Clearance delivery said:</p>
                  <p className="text-sm text-gray-200 italic">&ldquo;{ifrPreview.text}&rdquo;</p>
                  <button
                    onClick={() => playPreview('ifr')}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition"
                  >▶ Play again</button>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-500 mb-2">CRAFT breakdown:</p>
                  <div className="space-y-1 text-xs">
                    <div><span className="text-blue-400 font-bold">C</span> <span className="text-gray-500">Clearance limit:</span> <span className="text-gray-300">Houston Intercontinental</span></div>
                    <div><span className="text-blue-400 font-bold">R</span> <span className="text-gray-500">Route:</span> <span className="text-gray-300">PODDE Two departure, as filed</span></div>
                    <div><span className="text-blue-400 font-bold">A</span> <span className="text-gray-500">Altitude:</span> <span className="text-gray-300">Climb/maintain 11,000 · Expect 15,000 (10 min out)</span></div>
                    <div><span className="text-blue-400 font-bold">F</span> <span className="text-gray-500">Frequency:</span> <span className="text-gray-300">124.3</span></div>
                    <div><span className="text-blue-400 font-bold">T</span> <span className="text-gray-500">Transponder:</span> <span className="text-gray-300">4532</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
        <p className="text-center text-gray-500 text-sm mt-8">
          Want to practice reading these back?{' '}
          <a href="/demo" className="text-blue-400 hover:text-blue-300 transition">Try the free demo →</a>
        </p>
      </section>

      {/* How It Works */}
      <section className="px-8 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Choose a Scenario', desc: 'Pick from ground control, VFR departures, IFR clearances, flight following, and more — or let the system randomize it.' },
            { step: '02', title: 'Hear the Transmission & Respond', desc: 'A realistic ATC voice reads the clearance. You read it back exactly as a pilot would, speaking or typing your response.' },
            { step: '03', title: 'Get Instant Feedback', desc: 'See exactly what you got right, what you missed, and what to work on — scored the way a real controller would evaluate it.' },
          ].map((item) => (
            <div key={item.step} className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="text-blue-400 text-4xl font-bold mb-4">{item.step}</div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Everything you need to communicate with confidence</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: "🌐", title: "Sound Like You Belong in the Cockpit", description: "Master the exact phrases controllers expect to hear — so you can focus on flying, not searching for words." },
            { icon: "🎙️", title: "Hear What ATC Actually Sounds Like", description: "Train with a realistic controller voice so the real thing never catches you off guard." },
            { icon: "🤖", title: "Know Exactly What You Got Wrong", description: "After every transmission, get specific feedback on what you missed, what was unclear, and what was perfect." },
            { icon: "🛫", title: "Every Radio Call You'll Need", description: "From your first call on the ground to flight following in cruise — every scenario a real pilot faces." },
            { icon: "🔁", title: "Practice Until It Feels Automatic", description: "New airports, new callsigns, new routes every session — because confidence comes from repetition." },
            { icon: "📱", title: "No Classroom. No Schedule. No Waiting.", description: "Open your browser and start talking. Practice during lunch, before a flight, or whenever nerves hit." },
          ].map((feature, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who this is for */}
      <section className="px-8 py-12 bg-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Who uses ATC Clearance Trainer?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "🎓", region: "Student Pilots", description: "Learning to work a towered airport for the first time. Practice ground, tower, and pattern calls before you ever key the mic for real." },
              { icon: "📋", region: "IFR Students", description: "Mastering clearance readbacks is one of the hardest parts of instrument training. Practice until CRAFT is second nature." },
              { icon: "🌍", region: "International Students", description: "Training at a US flight school? Build radio confidence fast so you can focus on flying, not searching for words." },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="font-semibold mb-2">{item.region}</div>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built by a human */}
      <section className="px-8 py-20 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <img
            src="https://www.flight-levels.com/joe-cockpit.jpg"
            alt="Joe Mattison, CFI and former air traffic controller"
            className="w-48 h-48 rounded-full object-cover object-top flex-shrink-0 border-2 border-white/10"
          />
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-widest mb-2">Built by a human</p>
            <h2 className="text-2xl font-bold mb-4">Hi, I'm Joe.</h2>
            <p className="text-gray-400 leading-relaxed">
              I started as a flight instructor, teaching students how to fly — and how to talk on the radio. Later I crossed to the other side of the frequency and worked as an air traffic controller. I built ATC Clearance Trainer because I know exactly what controllers need to hear, and I wanted every pilot to have a way to practice until it feels natural.
            </p>
          </div>
        </div>
      </section>

      <section className="px-8 py-20 bg-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing</h2>
          <p className="text-gray-400 text-center mb-2">Unlimited sessions. Cancel anytime.</p>
          <p className="text-gray-500 text-sm text-center mb-10">Regional pricing applied automatically. Questions? <a href="mailto:joe@flight-levels.com" className="text-blue-400 hover:text-blue-300 transition">Contact us</a>.</p>
          <div className="grid md:grid-cols-2 gap-6">

            {/* ATC Trainer only */}
            <div className="bg-[#0a0f1e] border border-white/20 rounded-2xl p-8 text-center flex flex-col">
              <div className="text-4xl font-bold mb-1">{price}<span className="text-xl text-gray-400">/mo</span></div>
              <p className="text-gray-400 text-sm mb-1">ATC Clearance Trainer only</p>
              <p className="text-gray-500 text-xs mb-6">Less than one hour of flight instruction</p>
              <ul className="text-left space-y-2 mb-8 flex-1">
                {[
                  'Unlimited practice scenarios',
                  'Ground & IFR clearances',
                  'AI readback scoring',
                  'Detailed feedback on every readback',
                  'New scenarios every session',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-blue-400">✓</span> {item}
                  </li>
                ))}
              </ul>
              <a href={signupUrl} className="block w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-semibold transition">
                Get ATC Clearance Trainer
              </a>
            </div>

            {/* Bundle */}
            <div className="bg-[#0a0f1e] border-2 border-purple-500/70 rounded-2xl p-8 text-center flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                BEST VALUE
              </div>
              <div className="text-4xl font-bold mb-1">$49<span className="text-xl text-gray-400">/mo</span></div>
              <p className="text-gray-300 text-sm mb-1 font-medium">Flight Levels Bundle</p>
              <p className="text-gray-500 text-xs mb-6">Save $9/mo vs. buying separately</p>
              <ul className="text-left space-y-2 mb-8 flex-1">
                {[
                  'Everything in ATC Clearance Trainer',
                  'Full access to Checkride Prep AI',
                  'Practice oral exams + radio comms',
                  'One subscription, two tools',
                  'Cancel anytime',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="text-purple-400">✓</span> {item}
                  </li>
                ))}
              </ul>
              <a href={isNative ? '/subscribe' : 'https://checkride.flight-levels.com/signup?bundle=1'} className="block w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-bold transition">
                Get the Bundle
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-8 py-20 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            {
              q: "How is this different from just listening to LiveATC?",
              a: "LiveATC is passive — you're a spectator. ATC Clearance Trainer puts you in the pilot seat. You hear the clearance, you read it back, and you get scored on exactly what you got right and what you missed. Listening builds familiarity. Responding under pressure builds confidence."
            },
            {
              q: "Do I need a headset or microphone?",
              a: "No headset required. You can practice by typing your readbacks, or speak into any device mic — your phone, laptop, or earbuds. Whatever you have works."
            },
            {
              q: "I'm still a VFR student. Is this only for IFR pilots?",
              a: "Most scenarios are VFR. You'll practice ground control taxi clearances, Class D tower calls, pattern work arrivals, and VFR flight following — every radio call you'll face before you ever file IFR. The IFR clearance module is one of five scenario types."
            },
            {
              q: "What scenarios are included?",
              a: "Five types: CTAF calls at non-towered airports, Class D departures (ground + tower), Class D arrivals (pattern entry + landing clearance), VFR flight following with approach control, and IFR clearance readbacks. Every session generates a new airport, callsign, and route."
            },
            {
              q: "Will this actually help if I'm nervous on the radio?",
              a: "That's exactly what it's built for. Nervousness comes from uncertainty — not knowing what to say, or whether you said it right. Repetition is the only cure. This gives you unlimited reps in a zero-pressure environment, so when ATC calls your tail number for real, the words come automatically."
            },
          ].map((item, i) => (
            <details key={i} className="group bg-white/5 border border-white/10 rounded-xl">
              <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none">
                <span className="font-semibold pr-4">{item.q}</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 text-sm">▼</span>
              </summary>
              <p className="px-6 pb-5 text-gray-400 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="px-8 py-8 border-t border-white/10 text-center text-gray-500 text-sm">
        <p>© 2026 Flight Levels. Built by a CFI & former air traffic controller.</p>
        <div className="flex justify-center gap-6 mt-3">
          <a href="/terms" className="hover:text-gray-300 transition">Terms of Service</a>
          <a href="/privacy" className="hover:text-gray-300 transition">Privacy Policy</a>
        </div>
      </footer>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
