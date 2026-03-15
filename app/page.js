export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
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
            Subscribe — $15/mo
          </a>
        </div>
      </section>

      <section className="px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Everything you need to nail your readbacks</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: "🎙️", title: "Real Controller Audio", description: "Listen to authentic ATC clearances delivered in a realistic controller voice." },
            { icon: "🤖", title: "AI-Powered Scoring", description: "Get instant feedback on your readback accuracy, completeness, and phraseology." },
            { icon: "📈", title: "Track Your Progress", description: "See your scores improve over time with detailed performance history." },
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
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-gray-400 mb-10">One plan. Everything included.</p>
          <div className="bg-[#0a0f1e] border border-blue-500/30 rounded-2xl p-8">
            <div className="text-5xl font-bold mb-2">$15<span className="text-xl text-gray-400">/mo</span></div>
            <p className="text-gray-400 mb-8">Cancel anytime</p>
            <ul className="text-left space-y-3 mb-8">
              {["Unlimited practice scenarios", "Ground & IFR clearances", "AI readback scoring", "Progress tracking", "New scenarios daily"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <span className="text-blue-400">✓</span> {item}
                </li>
              ))}
            </ul>
            <a href="/signup" className="block bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition">
              Get Started
            </a>
          </div>
        </div>
      </section>

      <footer className="px-8 py-8 border-t border-white/10 text-center text-gray-500 text-sm">
        © 2025 ATC Trainer. Built for pilots, by a pilot.
      </footer>
    </main>
  )
}
