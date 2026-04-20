import { articles } from './study-guides/articles'

export default function sitemap() {
  const studyGuideUrls = articles.map((article) => ({
    url: `https://practice.flight-levels.com/study-guides/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [
    {
      url: 'https://practice.flight-levels.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://practice.flight-levels.com/radio-lab',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://practice.flight-levels.com/demo',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://practice.flight-levels.com/study-guides',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...studyGuideUrls,
    {
      url: 'https://practice.flight-levels.com/terms',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://practice.flight-levels.com/privacy',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
