import type { HolidayKey } from '@/lib/workdays';

/**
 * The copy of one page. Each page file declares `sv` (`as const satisfies` the kind's type) and
 * `en: PageCopyOf<typeof sv>`, so the English has exactly the Swedish shape: same keys, same list lengths.
 *
 * Any string may carry inline links: `[label](page:<id>)` to another page of the site (a test resolves every
 * id against the registry), `[label](https://...)` to another site and `[label](mailto:...)` for an address.
 * RichText renders them; everything else is plain text. No em dash anywhere (test/pages.test.ts).
 */
export interface PageCopyBase {
  meta: { title: string; description: string; ogAlt: string };
  /** The link card's text: eyebrow at most 20 characters, title at most 45. */
  card: { eyebrow: string; title: string };
  /** The page's name in breadcrumbs and footer links. */
  breadcrumb: string;
  h1: string;
  /** Paragraphs under the H1; the first two sentences state the facts. */
  lede: readonly string[];
  sections: readonly {
    h2: string;
    body: readonly string[];
    list?: readonly string[];
    /** A comparison table after the body (guides only); cells may carry links. */
    table?: CopyTable;
  }[];
  faq: readonly { q: string; a: string }[];
  cta: { title: string; body: string; button: string };
}

/** A small data table in running copy: the caption names what and when, the first column is the row header. */
export interface CopyTable {
  caption: string;
  head: readonly string[];
  rows: readonly (readonly string[])[];
}

export interface GuideCopy extends PageCopyBase {
  author: string;
  /** YYYY-MM-DD */
  reviewed: string;
  sources: readonly { label: string; url: string }[];
}

/** A trade page: the product shell plus the trade's personalliggare line and its example week. */
export interface IndustryCopy extends PageCopyBase {
  /** One line right under the lede, in the first screen: whether the trade must keep a personalliggare. */
  notice: string;
  /** The example week's card (the hours are in lib/sample.ts): business, week, grid label, caption. */
  week: { title: string; subtitle: string; label: string; caption: string };
}

export interface ToolCopy extends PageCopyBase {
  /** The calculator's or the template's UI labels. */
  tool: Readonly<Record<string, string>>;
}

/** The labels of the working-hours tables, the holiday list and the bridge days. */
export type TableLabel =
  | 'caption'
  | 'month'
  | 'days'
  | 'legal'
  | 'practice'
  | 'hours'
  | 'fullTime'
  | 'part75'
  | 'part50'
  | 'total'
  | 'tableNote'
  | 'about'
  | 'holidaysTitle'
  | 'holidaysIntro'
  | 'kindPublic'
  | 'kindEve'
  | 'onWeekend'
  | 'bridgeTitle'
  | 'bridgeIntro'
  | 'bridgeNone'
  | 'summaryCaption'
  | 'summaryHours'
  | 'summaryNote'
  | 'yearLink';

/** The working-hours tables: labels for the table and the holiday list; the numbers come from lib/workdays.ts. */
export interface TableCopy extends PageCopyBase {
  /** Plain text (no links); `{year}` and `{legalHours}` are filled in by TablePage. */
  columns: Readonly<Record<TableLabel, string>>;
  /** January first. */
  monthNames: readonly string[];
  holidays: Readonly<Record<HolidayKey, string>>;
}

/** The shape of a Swedish `as const` copy object with every literal widened to string (as `Dictionary` does). */
export type PageCopyOf<T> = T extends string ? string : { readonly [K in keyof T]: PageCopyOf<T[K]> };
