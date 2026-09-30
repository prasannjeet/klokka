import type { MetadataRoute } from 'next';
import { locales } from '@/lib/i18n';
import { indexable } from '@/lib/links';
import { hrefFor, pages } from '@/lib/pages';
import { absolute as url, languageAlternates } from '@/lib/seo';

/** Every registered page in both languages, each with its hreflang set (x-default included) and lastmod. */
export default function sitemap(): MetadataRoute.Sitemap {
  // A sitemap of noindex URLs sends mixed signals: a build that may not be indexed lists nothing.
  if (!indexable) return [];
  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: url(hrefFor(page.id, locale)),
      lastModified: page.lastmod,
      alternates: { languages: languageAlternates(page.id) },
    })),
  );
}
