import type { Metadata } from 'next';
import { getDictionary, htmlLang, localeHref, ogLocale, type Locale } from '@/lib/i18n';
import { apkUrl, appUrl, licenseUrl, repoUrl, siteUrl } from '@/lib/links';

/** The social card per language, drawn by the route handlers in app/og.png and app/og-en.png. */
export const ogImagePath: Record<Locale, string> = { sv: '/og.png', en: '/og-en.png' };

/** Absolute URL for a site path. The root is the bare origin, which is how Next renders a canonical URL. */
export function absolute(path: string): string {
  return path === '/' ? siteUrl : `${siteUrl}${path}`;
}

/** hreflang: Swedish at the root is also the x-default. */
function alternates(locale: Locale): Metadata['alternates'] {
  return {
    canonical: absolute(localeHref(locale)),
    languages: {
      [htmlLang.sv]: absolute(localeHref('sv')),
      [htmlLang.en]: absolute(localeHref('en')),
      'x-default': absolute(localeHref('sv')),
    },
  };
}

export function metadataFor(locale: Locale): Metadata {
  const t = getDictionary(locale).meta;
  const image = { url: absolute(ogImagePath[locale]), width: 1200, height: 630, alt: t.ogAlt };
  return {
    metadataBase: new URL(siteUrl),
    title: t.title,
    description: t.description,
    applicationName: 'Klokka',
    alternates: alternates(locale),
    openGraph: {
      type: 'website',
      siteName: 'Klokka',
      locale: ogLocale[locale],
      alternateLocale: [ogLocale[locale === 'sv' ? 'en' : 'sv']],
      url: absolute(localeHref(locale)),
      title: t.title,
      description: t.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.title,
      description: t.description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    formatDetection: { telephone: false, address: false, email: false },
  };
}

/** Organization and SoftwareApplication (free to use, MIT, Android and web) as one JSON-LD graph. */
export function jsonLd(locale: Locale) {
  const t = getDictionary(locale).meta;
  const org = `${siteUrl}/#organization`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': org,
        name: 'Klokka',
        url: siteUrl,
        logo: absolute('/logo.png'),
        sameAs: [repoUrl],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#app`,
        name: 'Klokka',
        url: absolute(localeHref(locale)),
        description: t.jsonLdDescription,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Android, Web',
        inLanguage: [htmlLang.sv, htmlLang.en],
        isAccessibleForFree: true,
        license: licenseUrl,
        installUrl: apkUrl,
        downloadUrl: apkUrl,
        sameAs: [appUrl, repoUrl],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'SEK' },
        publisher: { '@id': org },
      },
    ],
  };
}
