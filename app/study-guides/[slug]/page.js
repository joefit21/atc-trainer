import { notFound } from 'next/navigation'
import { articles, getArticle } from '../articles'

export async function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: `/study-guides/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `https://practice.flight-levels.com/study-guides/${slug}`,
      siteName: 'ICAO Radio Lab',
      type: 'article',
      publishedTime: article.date,
    },
  }
}

export default async function ArticlePage({ params }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    author: {
      '@type': 'Person',
      name: 'Joe Mattison',
      jobTitle: 'Certified Flight Instructor, Former Air Traffic Controller',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Flight Levels',
      url: 'https://practice.flight-levels.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://practice.flight-levels.com/study-guides/${slug}`,
    },
  }

  return (
    <main className="min-h-screen bg-[#0a0f1e] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✈️</span>
          <span className="text-xl font-bold">Flight Levels</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/study-guides" className="text-gray-300 hover:text-white transition text-sm">Study Guides</a>
          <a href="/demo" className="text-gray-300 hover:text-white transition text-sm">Try Demo</a>
          <a href="/login" className="text-gray-300 hover:text-white transition">Log In</a>
          <a href="/signup" className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition text-sm">Subscribe</a>
        </div>
      </nav>

      <article className="max-w-2xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-8">
          <a href="/" className="hover:text-gray-300 transition">Home</a>
          <span className="mx-2">/</span>
          <a href="/study-guides" className="hover:text-gray-300 transition">Study Guides</a>
        </div>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-gray-500 text-sm">{article.date}</span>
            <span className="text-gray-600 text-sm">·</span>
            <span className="text-gray-500 text-sm">{article.readTime}</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-6">{article.title}</h1>
          <p className="text-gray-400 text-lg leading-relaxed">{article.intro}</p>
        </header>

        {/* Byline */}
        <div className="flex items-center gap-4 border-t border-b border-white/10 py-5 mb-10">
          <img
            src="https://www.flight-levels.com/joe-cockpit.png"
            alt="Joe Mattison"
            className="w-12 h-12 rounded-full object-cover object-top border border-white/10"
          />
          <div>
            <div className="font-medium text-sm">Joe Mattison</div>
            <div className="text-gray-500 text-xs">CFI · Former Air Traffic Controller</div>
          </div>
        </div>

        {/* Article body */}
        <div className="space-y-10">
          {article.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-2xl font-semibold mb-4">{section.heading}</h2>
              <div className="space-y-4">
                {section.paragraphs.map((para, j) => (
                  <p key={j} className="text-gray-300 leading-relaxed">{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-8">
          <p className="text-gray-300 leading-relaxed mb-6">{article.cta}</p>
          <div className="flex flex-wrap gap-4">
            <a
              href="/demo"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Try the Free Demo
            </a>
            <a
              href="/signup"
              className="border border-white/20 hover:border-white/40 px-6 py-3 rounded-lg transition"
            >
              Subscribe
            </a>
          </div>
        </div>

        {/* Back to guides */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <a href="/study-guides" className="text-blue-400 hover:text-blue-300 transition text-sm">
            ← Back to Study Guides
          </a>
        </div>
      </article>

      <footer className="px-8 py-8 border-t border-white/10 text-center text-gray-500 text-sm mt-8">
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
