import { localeHref, locales, type Locale } from '@/lib/i18n/config';
import { pageCopy } from '@/lib/i18n/pages';
import { pages, type FooterGroup, type PageEntry, type PageId } from './registry';

export * from './registry';

export function pageById(id: PageId): PageEntry {
  const page = pages.find((p) => p.id === id);
  if (!page) throw new Error(`page "${id}" is not in the registry`);
  return page;
}

/** The page a catch-all slug names in that language; the homepage is never a slug. */
export function pageForSlug(locale: Locale, slug: readonly string[]): PageEntry | undefined {
  const path = `/${slug.join('/')}`;
  return pages.find((p) => p.id !== 'home' && p.path[locale] === path);
}

/** hrefFor('about', 'sv') is '/om', hrefFor('about', 'en') is '/en/about', hrefFor('home', 'en', '#how') is '/en#how'. */
export function hrefFor(id: PageId, locale: Locale, hash = ''): string {
  const path = pageById(id).path[locale];
  if (path === '/') return localeHref(locale, hash || '/');
  return `${localeHref(locale, path)}${hash}`;
}

/** Route params for every page but the homepage, in both languages, each with its own language's slug. */
export function staticSlugParams(): { lang: Locale; slug: string[] }[] {
  return pages
    .filter((p) => p.id !== 'home')
    .flatMap((p) => locales.map((lang) => ({ lang, slug: p.path[lang].slice(1).split('/') })));
}

/** Home, then each parent, then the page itself; names are the pages' `breadcrumb` copy. */
export function breadcrumbs(id: PageId, locale: Locale): { name: string; href: string }[] {
  const trail: PageEntry[] = [];
  let page: PageEntry | undefined = pageById(id);
  while (page) {
    if (trail.length === pages.length) throw new Error(`page "${id}" has a parent cycle`);
    trail.unshift(page);
    page = page.parent ? pageById(page.parent) : undefined;
  }
  return trail.map((p) => ({ name: pageCopy(p.id, locale).breadcrumb, href: hrefFor(p.id, locale) }));
}

const footerOrder: readonly FooterGroup[] = ['product', 'tools', 'guides', 'industries', 'klokka'];

/** The footer's page links per group, in registry order; a group without pages is left out. */
export function footerColumns(
  locale: Locale,
): { group: FooterGroup; links: { id: PageId; href: string }[] }[] {
  return footerOrder
    .map((group) => ({
      group,
      links: pages.filter((p) => p.footer === group).map((p) => ({ id: p.id, href: hrefFor(p.id, locale) })),
    }))
    .filter((column) => column.links.length > 0);
}
