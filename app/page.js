const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'ATC Trainer',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      url: 'https://practice.flight-levels.com',
      description: 'AI-powered ATC clearance practice for pilots. Practice IFR clearance readbacks and ground control with real-time AI scoring. Built by a former air traffic controller.',
      author: { '@type': 'Person', name: 'Joe Mattison' },
      offers: [
        {
          '@type': 'Offer',
          name: 'ATC Trainer',
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
      name: 'ATC Trainer',
      description: 'Practice IFR clearances and ATC readbacks with AI-powered feedback.',
    },
  ],
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold">ATC Trainer</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/login" className="text-gray-300 hover:text-white transition">Log In</a>
          <a href="/signup" className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition">Subscribe</a>
        </div>
      </nav>

      <section className="flex flex-col items-center text-center px-8 py-24">
        <div className="inline-block bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm px-4 py-1 rounded-full mb-6">
          Built by a flight instructor & air traffic controller
        </div>
        <h1 className="text-5xl md:text-6xl font-bold max-w-3xl leading-tight mb-6">
          Master ATC Clearances <span className="text-blue-400">Before You Fly</span>
        </h1>
        <p className="text-gray-400 text-xl max-w-2xl mb-10">
          Practice reading back ground control and IFR clearances with real-time AI scoring. Build the confidence you need in the cockpit.
        </p>
        <div className="flex gap-4">
          <a href="/demo" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition">
            Try Free Demo
          </a>
          <a href="/signup" className="border border-white/20 hover:border-white/40 px-8 py-4 rounded-lg text-lg transition">
            Subscribe — $29/mo
          </a>
        </div>
      </section>

      <section className="px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Everything you need to nail your readbacks</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: "🎙️", title: "Real Controller Audio", description: "Listen to authentic ATC clearances delivered in a realistic controller voice." },
            { icon: "🤖", title: "AI-Powered Scoring", description: "Get instant feedback on your readback accuracy, completeness, and phraseology." },
            { icon: "✅", title: "Checkride Confidence", description: "Practice the exact clearance formats used on FAA checkrides and build confidence before your big day." },
            { icon: "🛫", title: "Ground & IFR Clearances", description: "Practice both taxi clearances and full IFR clearance delivery scenarios." },
            { icon: "🌍", title: "Built for All Pilots", description: "Ideal for student pilots and non-native English speakers preparing for ICAO proficiency." },
            { icon: "♾️", title: "Unlimited Scenarios", description: "Never repeat the same clearance twice — new scenarios generated continuously." }
          ].map((feature, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-8 py-20 bg-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Simple Pricing</h2>
          <p className="text-gray-400 text-center mb-10">Unlimited sessions. Cancel anytime.</p>
          <div className="grid md:grid-cols-2 gap-6">

            {/* ATC Trainer only */}
            <div className="bg-[#0a0f1e] border border-white/20 rounded-2xl p-8 text-center flex flex-col">
              <div className="text-4xl font-bold mb-1">$29<span className="text-xl text-gray-400">/mo</span></div>
              <p className="text-gray-400 text-sm mb-1">ATC Trainer only</p>
              <p className="text-gray-500 text-xs mb-6">Less than one hour with a CFI</p>
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
              <a href="/signup" className="block w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-xl font-semibold transition">
                Get ATC Trainer
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
                  'Everything in ATC Trainer',
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
        <p>© 2026 ATC Trainer. Built for pilots, by a pilot.</p>
        <div className="flex justify-center gap-6 mt-3">
          <a href="/terms" className="hover:text-gray-300 transition">Terms of Service</a>
          <a href="/privacy" className="hover:text-gray-300 transition">Privacy Policy</a>
        </div>
      </footer>
    </main>
  )
}
