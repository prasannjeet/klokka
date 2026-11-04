import { describe, expect, it } from 'vitest';
import { classifyClick, CONSENT_KEY, readConsent, resolveGtmId, writeConsent } from '@/lib/analytics';

const APP = 'https://app.klokka.se';

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

describe('resolveGtmId', () => {
  it('is null when unset or blank, so a build without it has no analytics', () => {
    expect(resolveGtmId(undefined)).toBeNull();
    expect(resolveGtmId('  ')).toBeNull();
  });

  it('accepts a container id and trims it', () => {
    expect(resolveGtmId(' GTM-P6RRM6CL ')).toBe('GTM-P6RRM6CL');
  });

  it('fails the build on a present but malformed id', () => {
    expect(() => resolveGtmId('G-NJCCFQD2L6')).toThrow(/NEXT_PUBLIC_GTM_ID/);
    expect(() => resolveGtmId('gtm-p6rrm6cl')).toThrow(/NEXT_PUBLIC_GTM_ID/);
  });
});

describe('consent storage', () => {
  it('reads back what it wrote', () => {
    const store = memory();
    writeConsent(store, 'granted', new Date('2026-11-04T12:00:00Z'));
    expect(readConsent(store)).toBe('granted');
    writeConsent(store, 'denied', new Date('2026-11-05T12:00:00Z'));
    expect(readConsent(store)).toBe('denied');
    expect(JSON.parse(store.data.get(CONSENT_KEY)!)).toEqual({
      v: 1,
      choice: 'denied',
      at: '2026-11-05T12:00:00.000Z',
    });
  });

  it('asks again (null) for nothing stored, a foreign value or an older version', () => {
    expect(readConsent(memory())).toBeNull();
    expect(readConsent(memory({ [CONSENT_KEY]: 'yes' }))).toBeNull();
    expect(readConsent(memory({ [CONSENT_KEY]: JSON.stringify({ v: 0, choice: 'granted' }) }))).toBeNull();
    expect(readConsent(memory({ [CONSENT_KEY]: JSON.stringify({ v: 1, choice: 'maybe' }) }))).toBeNull();
  });
});

describe('classifyClick', () => {
  it('a link into the web app is a sign-up unless marked as the login', () => {
    expect(classifyClick({ href: `${APP}/`, track: undefined }, APP)).toBe('sign_up_click');
    expect(classifyClick({ href: `${APP}/`, track: 'login_click' }, APP)).toBe('login_click');
  });

  it('the APK and the template files', () => {
    expect(classifyClick({ href: 'https://klokka.se/download/android', track: undefined }, APP)).toBe(
      'apk_download',
    );
    expect(
      classifyClick({ href: 'https://klokka.se/downloads/tidrapport-mall.xlsx', track: undefined }, APP),
    ).toBe('template_download');
  });

  it('ignores every other link, and an unknown data-track value', () => {
    expect(classifyClick({ href: 'https://klokka.se/guide/tidrapport', track: undefined }, APP)).toBeNull();
    expect(
      classifyClick({ href: 'https://github.com/prasannjeet/klokka', track: undefined }, APP),
    ).toBeNull();
    expect(classifyClick({ href: 'https://klokka.se/om', track: 'something_else' }, APP)).toBeNull();
    expect(classifyClick({ href: 'not a url', track: undefined }, APP)).toBeNull();
  });
});
