import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en, messageKeys, resolveLocale, sv, t, translator } from '../src/i18n/index.ts';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = '', acc: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') acc[key] = v;
    else flatten(v, key, acc);
  }
  return acc;
}

const json = (locale: string) =>
  flatten(
    JSON.parse(readFileSync(fileURLToPath(new URL(`../i18n/${locale}.json`, import.meta.url)), 'utf8')),
  );

const EM_DASH = String.fromCharCode(0x2014);
const placeholders = (s: string) => [...s.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((m) => m[1]).sort();

describe('the catalogue files', () => {
  const svJson = json('sv');
  const enJson = json('en');

  it('have exactly the same keys in sv and en', () => {
    expect(Object.keys(enJson).sort()).toEqual(Object.keys(svJson).sort());
  });

  it('use the same placeholders per key', () => {
    for (const key of Object.keys(svJson)) {
      expect(placeholders(enJson[key] as string), key).toEqual(placeholders(svJson[key] as string));
    }
  });

  it('pair every _one with an _other', () => {
    for (const key of Object.keys(svJson)) {
      const m = /^(.*)_(one|other)$/.exec(key);
      if (!m) continue;
      expect(svJson, key).toHaveProperty(`${m[1]}_${m[2] === 'one' ? 'other' : 'one'}`);
    }
  });

  it('contain no em dash (AGENTS.md)', () => {
    for (const [key, value] of [...Object.entries(svJson), ...Object.entries(enJson)]) {
      expect(value, key).not.toContain(EM_DASH);
    }
  });

  it('are what the generated module contains', () => {
    expect(sv).toEqual(svJson);
    expect(en).toEqual(enJson);
  });

  it('seed the strings the mockups show', () => {
    expect(enJson['notifications.hours.added_other']).toBe('{name} added {count} days');
    expect(enJson['week.fullDay']).toBe('Full day');
    expect(enJson['settings.showPay']).toBe('Show pay to employees');
    expect(svJson['nav.myMonth']).toBe('Min månad');
  });
});

describe('t()', () => {
  it('interpolates named placeholders', () => {
    expect(t('en', 'notifications.hours.changedOne', { name: 'Nora', date: 'Wednesday 23 Sept' })).toBe(
      'Nora changed Wednesday 23 Sept',
    );
    expect(t('sv', 'week.noteFor', { name: 'Maria', date: 'onsdag 23' })).toBe(
      'Anteckning för Maria, onsdag 23',
    );
  });

  it('picks the plural form by count', () => {
    expect(t('en', 'notifications.hours.added', { name: 'Maria', count: 5 })).toBe('Maria added 5 days');
    expect(t('en', 'notifications.hours.added', { name: 'Maria', count: 1 })).toBe('Maria added 1 day');
    expect(t('sv', 'notifications.hours.added', { name: 'Maria', count: 2 })).toBe('Maria la till 2 dagar');
    expect(t('sv', 'common.people', { count: 4 })).toBe('4 personer');
    expect(t('sv', 'common.people', { count: 1 })).toBe('1 person');
    expect(t('en', 'common.days', { count: 0 })).toBe('0 days');
  });

  it('returns plain keys without params', () => {
    expect(t('en', 'nav.overview')).toBe('Overview');
    expect(t('sv', 'nav.overview')).toBe('Översikt');
  });

  it('fails loudly on a plural key without a count', () => {
    // @ts-expect-error count is required for plural keys
    expect(() => t('en', 'common.people')).toThrow(TypeError);
  });

  it('binds a locale', () => {
    const tr = translator('sv');
    expect(tr('common.signIn')).toBe('Logga in');
  });

  it('resolves device languages to sv or en', () => {
    expect(resolveLocale('sv-SE')).toBe('sv');
    expect(resolveLocale('sv')).toBe('sv');
    expect(resolveLocale('en-US')).toBe('en');
    expect(resolveLocale('nb-NO')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });

  it('lists every public key once', () => {
    const keys = messageKeys();
    expect(keys).toContain('common.people');
    expect(keys).not.toContain('common.people_one');
    expect(new Set(keys).size).toBe(keys.length);
  });
});
