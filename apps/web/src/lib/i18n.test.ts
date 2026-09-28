// The web app's strings (docs/DECISIONS.md D2): every catalogue key the code asks for exists in both
// languages, the web.* keys this app added are complete and em-dash free, and switching the locale
// switches the text.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { en, sv, t, translator } from '@klokka/core';
import svJson from '@klokka/core/i18n/sv.json';
import enJson from '@klokka/core/i18n/en.json';

const SRC = path.resolve(import.meta.dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

type Tree = { [key: string]: string | Tree };
function flatten(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : flatten(v, `${prefix}${k}.`),
  );
}

const catalogue = new Set(Object.keys(sv).map((k) => k.replace(/_(one|other)$/, '')));

describe('web strings', () => {
  it('every literal key passed to t() exists in the catalogue', () => {
    const used = new Set<string>();
    for (const file of files(SRC)) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'/g)) used.add(m[1] as string);
    }
    expect(used.size).toBeGreaterThan(200);
    const missing = [...used].filter((k) => !catalogue.has(k));
    expect(missing).toEqual([]);
  });

  it('the web.* section has the same keys in Swedish and English and no em dash', () => {
    const svWeb = flatten((svJson as unknown as Tree).web as Tree).sort();
    const enWeb = flatten((enJson as unknown as Tree).web as Tree).sort();
    expect(svWeb).toEqual(enWeb);
    const values = [...Object.values(sv), ...Object.values(en)];
    const emDash = String.fromCharCode(0x2014);
    expect(values.filter((v) => v.includes(emDash))).toEqual([]);
  });

  it('switches language and plural form', () => {
    expect(t('sv', 'web.week.unsaved', { count: 1 })).toBe('1 osparad ändring');
    expect(t('en', 'web.week.unsaved', { count: 3 })).toBe('3 unsaved changes');
    expect(translator('en')('nav.weekGrid')).toBe('Week grid');
    expect(translator('sv')('nav.weekGrid')).not.toBe('Week grid');
  });
});
