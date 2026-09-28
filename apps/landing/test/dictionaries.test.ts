import { describe, expect, it } from 'vitest';
import { en, sv, type Dictionary } from '@/lib/i18n';

type Leaf = { path: string; value: string };

function leaves(node: unknown, path = ''): Leaf[] {
  if (typeof node === 'string') return [{ path, value: node }];
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (node && typeof node === 'object')
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  throw new Error(`unexpected value at ${path}: ${String(node)}`);
}

/** The shape of a dictionary: every leaf path, array positions included. */
function shape(d: Dictionary): string[] {
  return leaves(d)
    .map((l) => l.path)
    .sort();
}

const EM_DASH = String.fromCharCode(0x2014);
const dictionaries = { sv, en } as const;

describe('landing dictionaries', () => {
  it('en has exactly the shape of sv (same keys, same list lengths)', () => {
    expect(shape(en)).toEqual(shape(sv));
  });

  for (const [locale, dict] of Object.entries(dictionaries)) {
    describe(locale, () => {
      const all = leaves(dict);

      it('has no empty strings', () => {
        expect(all.filter((l) => l.value.trim() === '').map((l) => l.path)).toEqual([]);
      });

      it('has no em dash (AGENTS.md)', () => {
        expect(all.filter((l) => l.value.includes(EM_DASH)).map((l) => l.path)).toEqual([]);
      });

      it('never talks about pricing, tiers or seats (business model rule)', () => {
        const banned =
          /\b(pric(e|es|ing)|tiers?|seats?|subscriptions?|premium|paid plans?|pris(er|plan)?|abonnemang|licensavgift|per användare)\b/i;
        expect(all.filter((l) => banned.test(l.value)).map((l) => `${l.path}: ${l.value}`)).toEqual([]);
      });

      it('says free to use and open source', () => {
        const text = all.map((l) => l.value).join('\n');
        expect(text).toMatch(locale === 'sv' ? /Gratis att använda/ : /Free to use/);
        expect(text).toMatch(locale === 'sv' ? /öppen källkod/i : /open source/i);
      });
    });
  }

  it('translates, it does not copy: the Swedish copy differs from the English', () => {
    const svLeaves = new Map(leaves(sv).map((l) => [l.path, l.value]));
    const same = leaves(en).filter((l) => svLeaves.get(l.path) === l.value && /[a-z]{4,}/i.test(l.value));
    // Names and proper nouns may repeat; whole sentences must not.
    expect(same.filter((l) => l.value.split(' ').length > 2).map((l) => l.path)).toEqual([]);
  });
});
