// Every page of the site as plain data. Routes, metadata, hreflang, the sitemap, the footer, llms.txt and each
// page's link card are all read from this list, so pages never hand-list each other. No imports: next.config.ts
// loads this file for the Swedish rewrites. An entry is added in the change that builds its page, so nothing
// ever links to a page that does not exist yet.

/** Re-declared to keep this file import-free; test/pages.test.ts checks it against `locales` in i18n/config.ts. */
export type Locale = 'sv' | 'en';

export type PageId =
  | 'home'
  | 'app'
  | 'small-business'
  | 'open-source'
  | 'calculator'
  | 'template'
  | 'guide-timesheet'
  | 'guide-change'
  | 'hours'
  | 'hours-2026'
  | 'hours-2027'
  | 'hourly'
  | 'guide-best-free'
  | 'guide-personalliggare'
  | 'guide-working-hours-act'
  | 'trade-cafe'
  | 'trade-cleaning'
  | 'trade-salon'
  | 'trade-shop'
  | 'about'
  | 'privacy'
  | 'terms';

export type PageKind = 'home' | 'product' | 'tool' | 'guide' | 'industry' | 'table' | 'legal';

export type FooterGroup = 'product' | 'tools' | 'guides' | 'industries' | 'klokka';

/** The artwork behind the page's link card (`phones` picks the Swedish or English screens by locale). */
export type CardBackground = 'phones' | 'grid' | 'clock' | 'cafe';

export interface PageEntry {
  id: PageId;
  kind: PageKind;
  /** Site paths without the locale prefix: sv '/tidrapport-mall', en '/timesheet-template'; home is '/'. */
  path: { sv: string; en: string };
  parent?: PageId;
  footer: FooterGroup | null;
  /** YYYY-MM-DD: the sitemap's lastmod, and the published and modified dates of a guide. */
  lastmod: string;
  background: CardBackground;
}

export const pages: readonly PageEntry[] = [
  {
    id: 'home',
    kind: 'home',
    path: { sv: '/', en: '/' },
    footer: null,
    lastmod: '2026-09-30',
    background: 'phones',
  },
  {
    id: 'about',
    kind: 'legal',
    path: { sv: '/om', en: '/about' },
    parent: 'home',
    footer: 'klokka',
    lastmod: '2026-09-29',
    background: 'clock',
  },
  {
    id: 'privacy',
    kind: 'legal',
    path: { sv: '/integritet', en: '/privacy' },
    parent: 'home',
    footer: 'klokka',
    lastmod: '2026-09-30',
    background: 'clock',
  },
  {
    id: 'terms',
    kind: 'legal',
    path: { sv: '/villkor', en: '/terms' },
    parent: 'home',
    footer: 'klokka',
    lastmod: '2026-09-29',
    background: 'clock',
  },
];

/** Swedish lives at the root: '/om' is served by '/sv/om' (next.config.ts, beforeFiles). */
export function swedishRewrites(): { source: string; destination: string }[] {
  return pages
    .filter((page) => page.path.sv !== '/')
    .map((page) => ({ source: page.path.sv, destination: `/sv${page.path.sv}` }));
}
