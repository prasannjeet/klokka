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
  | 'terms'
  | 'delete-account';

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
    id: 'app',
    kind: 'product',
    path: { sv: '/tidrapportering-app', en: '/employee-hours-app' },
    parent: 'home',
    footer: 'product',
    lastmod: '2026-09-30',
    background: 'phones',
  },
  {
    id: 'small-business',
    kind: 'product',
    path: { sv: '/tidrapportering-smaforetag', en: '/small-business-time-tracking' },
    parent: 'home',
    footer: 'product',
    lastmod: '2026-09-30',
    background: 'phones',
  },
  {
    id: 'hourly',
    kind: 'product',
    path: { sv: '/timanstallda', en: '/hourly-employees' },
    parent: 'home',
    footer: 'product',
    lastmod: '2026-09-30',
    background: 'phones',
  },
  {
    id: 'open-source',
    kind: 'product',
    path: { sv: '/oppen-kallkod', en: '/open-source' },
    parent: 'home',
    footer: 'product',
    lastmod: '2026-09-30',
    background: 'clock',
  },
  {
    id: 'guide-timesheet',
    kind: 'guide',
    path: { sv: '/guide/tidrapport', en: '/guide/how-to-track-employee-hours' },
    parent: 'home',
    footer: 'guides',
    lastmod: '2026-09-30',
    background: 'clock',
  },
  {
    id: 'guide-change',
    kind: 'guide',
    path: { sv: '/guide/far-arbetsgivaren-andra-tidrapport', en: '/guide/can-an-employer-change-hours' },
    parent: 'home',
    footer: 'guides',
    lastmod: '2026-09-30',
    background: 'clock',
  },
  {
    id: 'guide-best-free',
    kind: 'guide',
    path: { sv: '/guide/basta-gratis-tidrapportering', en: '/guide/best-free-timesheet-apps' },
    parent: 'home',
    footer: 'guides',
    lastmod: '2026-09-30',
    background: 'clock',
  },
  {
    id: 'guide-personalliggare',
    kind: 'guide',
    path: { sv: '/guide/personalliggare-eller-tidrapport', en: '/guide/personalliggare-sweden' },
    parent: 'home',
    footer: 'guides',
    lastmod: '2026-09-30',
    background: 'clock',
  },
  {
    id: 'guide-working-hours-act',
    kind: 'guide',
    path: { sv: '/guide/arbetstidslagen', en: '/guide/swedish-working-hours-act' },
    parent: 'home',
    footer: 'guides',
    lastmod: '2026-09-30',
    background: 'clock',
  },
  {
    id: 'calculator',
    kind: 'tool',
    path: { sv: '/rakna-arbetstimmar', en: '/work-hours-calculator' },
    parent: 'home',
    footer: 'tools',
    lastmod: '2026-09-30',
    background: 'grid',
  },
  {
    id: 'template',
    kind: 'tool',
    path: { sv: '/tidrapport-mall', en: '/timesheet-template' },
    parent: 'home',
    footer: 'tools',
    lastmod: '2026-09-30',
    background: 'grid',
  },
  {
    id: 'hours',
    kind: 'table',
    path: { sv: '/arbetstid-per-manad', en: '/working-hours-per-month-sweden' },
    parent: 'home',
    footer: 'tools',
    lastmod: '2026-09-30',
    background: 'grid',
  },
  {
    id: 'hours-2026',
    kind: 'table',
    path: { sv: '/arbetstid-per-manad/2026', en: '/working-hours-per-month-sweden/2026' },
    parent: 'hours',
    footer: null,
    lastmod: '2026-09-30',
    background: 'grid',
  },
  {
    id: 'hours-2027',
    kind: 'table',
    path: { sv: '/arbetstid-per-manad/2027', en: '/working-hours-per-month-sweden/2027' },
    parent: 'hours',
    footer: null,
    lastmod: '2026-09-30',
    background: 'grid',
  },
  {
    id: 'trade-cafe',
    kind: 'industry',
    path: { sv: '/tidrapportering-cafe-restaurang', en: '/cafes-restaurants' },
    parent: 'home',
    footer: 'industries',
    lastmod: '2026-09-30',
    background: 'cafe',
  },
  {
    id: 'trade-cleaning',
    kind: 'industry',
    path: { sv: '/tidrapportering-stadfirma', en: '/cleaning-companies' },
    parent: 'home',
    footer: 'industries',
    lastmod: '2026-09-30',
    background: 'cafe',
  },
  {
    id: 'trade-salon',
    kind: 'industry',
    path: { sv: '/tidrapportering-frisor-salong', en: '/salons' },
    parent: 'home',
    footer: 'industries',
    lastmod: '2026-09-30',
    background: 'cafe',
  },
  {
    id: 'trade-shop',
    kind: 'industry',
    path: { sv: '/tidrapportering-butik', en: '/shops' },
    parent: 'home',
    footer: 'industries',
    lastmod: '2026-09-30',
    background: 'cafe',
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
    lastmod: '2026-10-04',
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
  {
    id: 'delete-account',
    kind: 'legal',
    path: { sv: '/radera-konto', en: '/delete-account' },
    parent: 'privacy',
    footer: 'klokka',
    lastmod: '2026-10-04',
    background: 'clock',
  },
];

/** Swedish lives at the root: '/om' is served by '/sv/om' (next.config.ts, beforeFiles). */
export function swedishRewrites(): { source: string; destination: string }[] {
  return pages
    .filter((page) => page.path.sv !== '/')
    .map((page) => ({ source: page.path.sv, destination: `/sv${page.path.sv}` }));
}
