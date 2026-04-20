import { articles } from './articles'

export const metadata = {
  title: 'Study Guides — ATC Radio Communication for Pilots',
  description: 'Free guides on ATC radio communication — written by a CFI and former air traffic controller. IFR clearance readbacks, radio basics, ICAO language proficiency, and common mistakes.',
  alternates: {
    canonical: '/study-guides',
  },
  openGraph: {
    title: 'Study Guides — ATC Radio Communication for Pilots',
    description: 'Free guides on ATC radio communication — written by a CFI and former air traffic controller.',
    url: 'https://practice.flight-levels.com/study-guides',
    siteName: 'ICAO Radio Lab',
    type: 'website',
  },
}

export default function StudyGuidesIndex() {
  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold">Flight Levels</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/study-guides" className="text-white text-sm font-medium">Study Guides</a>
          <a href="/demo" className="text-gray-300 hover:text-white transition text-sm">Try Demo</a>
          <a href="/login" className="text-gray-300 hover:text-white transition">Log In</a>
          <a href="/signup" className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition text-sm">Subscribe</a>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-blue-400 text-sm uppercase tracking-widest mb-3">From a CFI & former ATC</p>
          <h1 className="text-4xl font-bold mb-4">ATC Radio Communication Study Guides</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Practical guides on aviation radio communication — written by someone who has been on both sides of the frequency.
          </p>
        </div>

        <div className="space-y-6">
          {articles.map((article) => (
            <a
              key={article.slug}
              href={`/study-guides/${article.slug}`}
              className="block bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-blue-500/40 hover:bg-white/8 transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-gray-500 text-sm">{article.date}</span>
                <span className="text-gray-600 text-sm">·</span>
                <span className="text-gray-500 text-sm">{article.readTime}</span>
              </div>
              <h2 className="text-xl font-semibold mb-3 group-hover:text-blue-300 transition">
                {article.title}
              </h2>
              <p className="text-gray-400 leading-relaxed">
                {article.description}
              </p>
              <div className="mt-4 text-blue-400 text-sm font-medium">
                Read article →
              </div>
            </a>
          ))}
        </div>
      </div>

      <footer className="px-8 py-8 border-t border-white/10 text-center text-gray-500 text-sm mt-16">
        <p>© 2026 Flight Levels. Built for pilots worldwide, by a CFI & former air traffic controller.</p>
        <div className="flex justify-center gap-6 mt-3">
          <a href="/terms" className="hover:text-gray-300 transition">Terms</a>
          <a href="/privacy" className="hover:text-gray-300 transition">Privacy</a>
          <a href="/study-guides" className="hover:text-gray-300 transition">Study Guides</a>
        </div>
      </footer>
    </main>
  )
}
