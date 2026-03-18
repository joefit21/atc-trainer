export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/trainer', '/payment-success'],
      },
    ],
    sitemap: 'https://practice.flight-levels.com/sitemap.xml',
  }
}
