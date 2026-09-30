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
  sections: readonly { h2: string; body: readonly string[]; list?: readonly string[] }[];
  faq: readonly { q: string; a: string }[];
  cta: { title: string; body: string; button: string };
}

export interface GuideCopy extends PageCopyBase {
  author: string;
  /** YYYY-MM-DD */
  reviewed: string;
  sources: readonly { label: string; url: string }[];
}

export interface ToolCopy extends PageCopyBase {
  /** The calculator's or the template's UI labels. */
  tool: Readonly<Record<string, string>>;
}

export interface TableCopy extends PageCopyBase {
  columns: Readonly<Record<string, string>>;
  monthNames: readonly string[];
}

/** The shape of a Swedish `as const` copy object with every literal widened to string (as `Dictionary` does). */
export type PageCopyOf<T> = T extends string ? string : { readonly [K in keyof T]: PageCopyOf<T[K]> };
