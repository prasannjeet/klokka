import { describe, expect, expectTypeOf, it } from 'vitest';
import { locales, type Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import {
  breadcrumbs,
  footerColumns,
  hrefFor,
  pageForSlug,
  pages,
  staticSlugParams,
  swedishRewrites,
  type Locale as RegistryLocale,
  type PageId,
} from '@/lib/pages';
import { parseRichText } from '@/lib/rich-text';

type Leaf = { path: string; value: string };

function leaves(node: unknown, path = ''): Leaf[] {
  if (typeof node === 'string') return [{ path, value: node }];
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (node && typeof node === 'object')
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  throw new Error(`unexpected value at ${path}: ${String(node)}`);
}

const EM_DASH = String.fromCharCode(0x2014);
const ids = new Set<string>(pages.map((p) => p.id));

describe('page registry', () => {
  it('declares the same locales as i18n/config.ts', () => {
    expectTypeOf<RegistryLocale>().toEqualTypeOf<Locale>();
    expect([...locales].sort()).toEqual(['en', 'sv']);
  });

  it('has unique ids', () => {
    expect(ids.size).toBe(pages.length);
  });

  for (const locale of locales) {
    it(`${locale}: paths are unique, rooted and without a trailing slash`, () => {
      const paths = pages.map((p) => p.path[locale]);
      expect(new Set(paths).size).toBe(paths.length);
      for (const p of pages) {
        if (p.id === 'home') expect(p.path[locale]).toBe('/');
        else expect(p.path[locale], p.id).toMatch(/^\/[^/].*[^/]$|^\/[^/]$/);
      }
    });
  }

  it('Swedish slugs are ASCII only', () => {
    for (const p of pages) expect(p.path.sv, p.id).toMatch(/^\/[a-z0-9/-]*$/);
  });

  it('every parent exists', () => {
    for (const p of pages) if (p.parent) expect(ids, p.id).toContain(p.parent);
  });

  it('every non-home Swedish path has a rewrite to /sv', () => {
    const rewrites = new Map(swedishRewrites().map((r) => [r.source, r.destination]));
    for (const p of pages.filter((p) => p.id !== 'home'))
      expect(rewrites.get(p.path.sv)).toBe(`/sv${p.path.sv}`);
    expect(rewrites.size).toBe(pages.length - 1);
  });

  it('every static slug resolves back to its page', () => {
    for (const { lang, slug } of staticSlugParams()) {
      const page = pageForSlug(lang, slug);
      expect(page && hrefFor(page.id, lang)).toBe(
        lang === 'sv' ? `/${slug.join('/')}` : `/en/${slug.join('/')}`,
      );
    }
    expect(staticSlugParams()).toHaveLength((pages.length - 1) * locales.length);
  });

  it('builds hrefs with the locale prefix and hashes', () => {
    expect(hrefFor('home', 'sv')).toBe('/');
    expect(hrefFor('home', 'en')).toBe('/en');
    expect(hrefFor('home', 'sv', '#how')).toBe('/#how');
    expect(hrefFor('home', 'en', '#how')).toBe('/en#how');
    expect(hrefFor('about', 'sv')).toBe('/om');
    expect(hrefFor('about', 'en')).toBe('/en/about');
  });

  it('breadcrumbs run from home to the page', () => {
    expect(breadcrumbs('privacy', 'sv').map((c) => c.href)).toEqual(['/', '/integritet']);
    expect(breadcrumbs('privacy', 'en').map((c) => c.href)).toEqual(['/en', '/en/privacy']);
  });

  it('the footer lists every page that has a footer group, once', () => {
    for (const locale of locales) {
      const listed = footerColumns(locale).flatMap((c) => c.links.map((l) => l.id));
      expect(listed.sort()).toEqual(
        pages
          .filter((p) => p.footer)
          .map((p) => p.id)
          .sort(),
      );
    }
  });
});

describe('page copy', () => {
  it('sv and en have the same shape for every page', () => {
    for (const p of pages) {
      const shape = (locale: Locale) =>
        leaves(pageCopy(p.id, locale))
          .map((l) => l.path)
          .sort();
      expect(shape('en'), p.id).toEqual(shape('sv'));
    }
  });

  for (const p of pages) {
    for (const locale of locales) {
      describe(`${p.id} (${locale})`, () => {
        const copy = pageCopy(p.id, locale);
        const all = leaves(copy);

        it('fits the title, description and card limits', () => {
          expect(copy.meta.title.length, copy.meta.title).toBeLessThanOrEqual(60);
          expect(copy.meta.description.length, copy.meta.description).toBeLessThanOrEqual(155);
          expect(copy.card.eyebrow.length, copy.card.eyebrow).toBeLessThanOrEqual(20);
          expect(copy.card.title.length, copy.card.title).toBeLessThanOrEqual(45);
        });

        it('has no empty strings and no em dash', () => {
          expect(all.filter((l) => l.value.trim() === '').map((l) => l.path)).toEqual([]);
          expect(all.filter((l) => l.value.includes(EM_DASH)).map((l) => l.path)).toEqual([]);
        });

        it('never talks about pricing, tiers or seats (business model rule)', () => {
          const banned =
            /\b(pric(e|es|ing)|tiers?|seats?|subscriptions?|premium|paid plans?|pris(er|plan)?|abonnemang|licensavgift|per användare)\b/i;
          expect(all.filter((l) => banned.test(l.value)).map((l) => `${l.path}: ${l.value}`)).toEqual([]);
        });

        it('links only to registered pages', () => {
          const targets = all.flatMap((l) =>
            parseRichText(l.value).flatMap((part) => (part.kind === 'page' ? [part.id] : [])),
          );
          expect(targets.filter((id) => !ids.has(id))).toEqual([]);
        });

        if (p.kind !== 'guide') {
          it('keeps "personalliggare" out of the title and H1 (only a guide is about it)', () => {
            expect(copy.meta.title).not.toMatch(/personalliggare/i);
            expect(copy.h1).not.toMatch(/personalliggare/i);
          });
        }
      });
    }
  }

  // The café/restaurant and salon trades are covered by the personalliggare rules: their pages must say plainly that
  // Klokka is not one. Applies from the moment those pages are registered.
  const personalliggareLine: Record<Locale, string> = {
    sv: 'ersätter inte en personalliggare',
    en: 'does not replace a personalliggare',
  };
  for (const id of ['trade-cafe', 'trade-salon'] as const satisfies readonly PageId[]) {
    it.runIf(ids.has(id))(`${id} says it does not replace a personalliggare`, () => {
      for (const locale of locales) {
        const text = leaves(pageCopy(id, locale))
          .map((l) => l.value)
          .join('\n');
        expect(text, locale).toContain(personalliggareLine[locale]);
      }
    });
  }
});
