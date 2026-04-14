'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

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
      name: 'ICAO Radio Lab',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: 'https://practice.flight-levels.com',
      description: 'AI-powered aviation English practice for pilots worldwide. Practice ATC radio calls, IFR clearances, and readbacks with real-time AI scoring. Built by a CFI and former air traffic controller.',
      author: { '@type': 'Person', name: 'Joe Mattison' },
      offers: [
        {
          '@type': 'Offer',
          name: 'ICAO Radio Lab',
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
      name: 'ICAO Radio Lab — Flight Levels',
      description: 'Practice aviation English radio calls and ATC readbacks with AI-powered feedback. ICAO language proficiency training for pilots worldwide.',
    },
  ],
}

function HomeContent() {
  const [price, setPrice] = useState('$29')
  const [region, setRegion] = useState('default')
  const searchParams = useSearchParams()

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

  const signupUrl = region && region !== 'default' ? `/signup?region=${region}` : '/signup'

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold">Flight Levels</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/login" className="text-gray-300 hover:text-white transition">Log In</a>
          <a href={signupUrl} className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition">Subscribe</a>
        </div>
      </nav>

      <section className="flex flex-col items-center text-center px-8 py-24">
        <div className="inline-block bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm px-4 py-1 rounded-full mb-6">
          Built by a CFI & former air traffic controller
        </div>
        <h1 className="text-5xl md:text-6xl font-bold max-w-3xl leading-tight mb-6">
          Aviation English Practice <span className="text-blue-400">for Pilots Worldwide</span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mb-4">
          Every pilot has felt it — the moment ATC responds and your mind goes blank. ICAO Radio Lab gives you a safe place to practice until the words come naturally, no matter where you learned to fly.
        </p>
        <p className="text-gray-500 text-base max-w-xl mb-10">
          Used by student pilots in India, the UAE, and beyond preparing for ICAO Level 4 English proficiency and real-world cockpit communications.
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

      {/* Who this is for */}
      <section className="px-8 py-12 bg-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Who uses ICAO Radio Lab?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { flag: "🇮🇳", region: "India", description: "Student pilots preparing for DGCA exams and international operations requiring ICAO English proficiency." },
              { flag: "🇦🇪", region: "UAE & Middle East", description: "Pilots building careers with Gulf carriers where precision English radio communication is essential." },
              { flag: "🌏", region: "Asia & Beyond", description: "Any pilot who flies, trains, or communicates in English as a second language." },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="text-4xl mb-3">{item.flag}</div>
                <div className="font-semibold mb-2">{item.region}</div>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
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

      {/* Built by a human */}
      <section className="px-8 py-20 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <img
            src="https://www.flight-levels.com/joe-cockpit.png"
            alt="Joe Mattison, CFI and former air traffic controller"
            className="w-48 h-48 rounded-full object-cover object-top flex-shrink-0 border-2 border-white/10"
          />
          <div>
            <p className="text-xs text-blue-400 uppercase tracking-widest mb-2">Built by a human</p>
            <h2 className="text-2xl font-bold mb-4">Hi, I'm Joe.</h2>
            <p className="text-gray-400 leading-relaxed">
              I started as a flight instructor, teaching students how to fly — and how to talk on the radio. Later I crossed to the other side of the frequency and worked as an air traffic controller. I built ICAO Radio Lab because I know exactly what controllers need to hear, and I wanted every pilot to have a way to practice until it feels natural.
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
              <p className="text-gray-400 text-sm mb-1">ICAO Radio Lab only</p>
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
                Get ICAO Radio Lab
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
                  'Everything in ICAO Radio Lab',
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
              <a href="https://checkride.flight-levels.com/signup?bundle=1" className="block w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-bold transition">
                Get the Bundle
              </a>
            </div>

          </div>
        </div>
      </section>

      <footer className="px-8 py-8 border-t border-white/10 text-center text-gray-500 text-sm">
        <p>© 2026 Flight Levels. Built for pilots worldwide, by a CFI & former air traffic controller.</p>
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
