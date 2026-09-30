import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/links';

// The AI crawlers that honour robots.txt, named so the invitation is explicit rather than implied by '*'.
const aiCrawlers = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];

// Every build allows crawling, staging included: a crawler has to fetch a page to see its noindex (the robots
// meta and X-Robots-Tag, both off unless NEXT_PUBLIC_INDEXABLE is 'true'). A Disallow would hide that noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: aiCrawlers, allow: '/' },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
