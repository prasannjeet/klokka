import type { MetadataRoute } from 'next';
import { htmlLang, localeHref, locales } from '@/lib/i18n';
import { absolute as url } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((l) => [htmlLang[l], url(localeHref(l))]));
  return locales.map((locale) => ({
    url: url(localeHref(locale)),
    changeFrequency: 'monthly',
    priority: locale === 'sv' ? 1 : 0.8,
    alternates: { languages },
  }));
}
