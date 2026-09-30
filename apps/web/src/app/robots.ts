import type { MetadataRoute } from 'next';

// Crawlers may fetch pages (never disallow everything: link-preview bots must read the Open Graph tags), and the
// noindex robots meta plus the X-Robots-Tag header keep the app out of search. No sitemap: nothing here is listed.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' } };
}
