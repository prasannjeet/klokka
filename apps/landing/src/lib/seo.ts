import type { Metadata } from 'next';
import { getDictionary, htmlLang, locales, ogLocale, otherLocale, type Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import { apkUrl, appUrl, contactEmail, indexable, licenseUrl, repoUrl, siteUrl } from '@/lib/links';
import { breadcrumbs, hrefFor, pageById, type PageId } from '@/lib/pages';
import { plainText } from '@/lib/rich-text';

/** Absolute URL for a site path. The root is the bare origin, which is how Next renders a canonical URL. */
export function absolute(path: string): string {
  return path === '/' ? siteUrl : `${siteUrl}${path}`;
}

/** hreflang for a page: both languages, and Swedish (at the root) as the x-default. */
export function languageAlternates(id: PageId): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((l) => [htmlLang[l], absolute(hrefFor(id, l))])),
    'x-default': absolute(hrefFor(id, 'sv')),
  };
}

/** The page's link card, drawn per page and language by app/og/[file]. */
function ogImage(id: PageId, locale: Locale) {
  return {
    url: absolute(`/og/${id}-${locale}.jpg`),
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt: pageCopy(id, locale).meta.ogAlt,
  };
}

export function metadataForPage(id: PageId, locale: Locale): Metadata {
  const page = pageById(id);
  const t = pageCopy(id, locale).meta;
  const url = absolute(hrefFor(id, locale));
  const image = ogImage(id, locale);
  return {
    metadataBase: new URL(siteUrl),
    title: t.title,
    description: t.description,
    applicationName: 'Klokka',
    alternates: { canonical: url, languages: languageAlternates(id) },
    openGraph: {
      ...(page.kind === 'guide'
        ? { type: 'article' as const, publishedTime: page.lastmod, modifiedTime: page.lastmod }
        : { type: 'website' as const }),
      siteName: 'Klokka',
      locale: ogLocale[locale],
      alternateLocale: [ogLocale[otherLocale(locale)]],
      url,
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
      index: indexable,
      follow: indexable,
      googleBot: { index: indexable, follow: indexable, 'max-image-preview': 'large' },
    },
    formatDetection: { telephone: false, address: false, email: false },
  };
}

/**
 * One JSON-LD graph per page: the Organization and WebSite every page shares (by @id), this page's WebPage, its
 * breadcrumbs, its FAQ, the one SoftwareApplication (home and app page only) and an Article for a guide. No
 * ratings: there are no genuine reviews to mark up.
 */
export function jsonLdForPage(id: PageId, locale: Locale) {
  const page = pageById(id);
  const copy = pageCopy(id, locale);
  const url = absolute(hrefFor(id, locale));
  const org = `${siteUrl}/#organization`;
  const website = `${siteUrl}/#website`;
  const webPage = `${url}#webpage`;

  const graph: object[] = [
    {
      '@type': 'Organization',
      '@id': org,
      name: 'Klokka',
      url: siteUrl,
      logo: absolute('/logo.png'),
      email: contactEmail,
      sameAs: [repoUrl],
    },
    {
      '@type': 'WebSite',
      '@id': website,
      name: 'Klokka',
      url: siteUrl,
      inLanguage: [htmlLang.sv, htmlLang.en],
      publisher: { '@id': org },
    },
    {
      '@type': id === 'about' ? 'AboutPage' : 'WebPage',
      '@id': webPage,
      url,
      name: copy.meta.title,
      description: copy.meta.description,
      isPartOf: { '@id': website },
      inLanguage: htmlLang[locale],
      dateModified: page.lastmod,
    },
  ];

  if (id !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs(id, locale).map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: absolute(crumb.href),
      })),
    });
  }

  if (copy.faq.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      inLanguage: htmlLang[locale],
      mainEntity: copy.faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: plainText(item.a) },
      })),
    });
  }

  if (id === 'home' || id === 'app') {
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${siteUrl}/#app`,
      name: 'Klokka',
      url: absolute(hrefFor('home', 'sv')),
      description: getDictionary(locale).meta.jsonLdDescription,
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
    });
  }

  if (page.kind === 'guide') {
    graph.push({
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: copy.h1,
      inLanguage: htmlLang[locale],
      datePublished: page.lastmod,
      dateModified: page.lastmod,
      author: { '@id': org },
      publisher: { '@id': org },
      mainEntityOfPage: { '@id': webPage },
      image: ogImage(id, locale).url,
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
