import type { PageId } from '@/lib/pages/registry';
import type { Locale } from '../config';
import { getDictionary } from '../index';
import * as about from './about';
import * as app from './app';
import * as calculator from './calculator';
import * as guideChange from './guide-change';
import * as guideTimesheet from './guide-timesheet';
import * as openSource from './open-source';
import * as privacy from './privacy';
import * as smallBusiness from './small-business';
import * as template from './template';
import * as terms from './terms';
import type { GuideCopy, PageCopyBase, TableCopy, ToolCopy } from './types';

export type * from './types';

type GuideId = Extract<PageId, `guide-${string}`>;
type ToolId = 'calculator' | 'template';
type TableId = 'hours' | 'hours-2026' | 'hours-2027';

/** The copy type a page id carries: guides, tools and tables add their own fields to the base. */
type CopyFor<K extends PageId> = K extends GuideId
  ? GuideCopy
  : K extends ToolId
    ? ToolCopy
    : K extends TableId
      ? TableCopy
      : PageCopyBase;

/** The homepage keeps its own dictionary (dictionaries.ts); this is the part every page shares. */
function homeCopy(locale: Locale): PageCopyBase {
  const t = getDictionary(locale);
  return {
    meta: { title: t.meta.title, description: t.meta.description, ogAlt: t.meta.ogAlt },
    card: t.meta.card,
    breadcrumb: t.meta.breadcrumb,
    h1: `${t.hero.line1} ${t.hero.line2}`,
    lede: [t.hero.lead],
    sections: [t.how, t.employers, t.employees, t.pay, t.insights, t.openSource].map((s) => ({
      h2: s.title,
      body: [s.lead],
    })),
    faq: t.faq.items,
    cta: { title: t.cta.startTitle, body: t.cta.startLead, button: t.cta.create },
  };
}

const copies: { [K in PageId]?: Record<Locale, CopyFor<K>> } = {
  home: { sv: homeCopy('sv'), en: homeCopy('en') },
  about,
  app,
  'small-business': smallBusiness,
  'open-source': openSource,
  'guide-timesheet': guideTimesheet,
  'guide-change': guideChange,
  calculator,
  template,
  privacy,
  terms,
};

/** A page's copy in one language. Every registered page has copy (test/pages.test.ts); anything else throws. */
export function pageCopy<K extends PageId>(id: K, locale: Locale): CopyFor<K> {
  const copy = copies[id];
  if (!copy) throw new Error(`no copy for page "${id}"`);
  return copy[locale];
}
