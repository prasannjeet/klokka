import { describe, expect, it } from 'vitest';
import { localeFrom, modeFrom, previewLocaleFrom } from './prefs';

describe('localeFrom', () => {
  it('prefers the stored cookie', () => {
    expect(localeFrom('en', 'sv-SE,sv;q=0.9')).toBe('en');
  });
  it('falls back to the first Accept-Language entry: Swedish stays Swedish, the rest is English', () => {
    expect(localeFrom(undefined, 'sv-SE,sv;q=0.9,en;q=0.8')).toBe('sv');
    expect(localeFrom(undefined, 'nb-NO,nb;q=0.9')).toBe('en');
    expect(localeFrom('xx', 'sv;q=0.9')).toBe('sv');
  });
  it('treats a missing header as English', () => {
    expect(localeFrom(undefined, null)).toBe('en');
  });
});

describe('previewLocaleFrom', () => {
  it('gives a request with no language signal (a link-preview bot) Swedish', () => {
    expect(previewLocaleFrom(undefined, null)).toBe('sv');
    expect(previewLocaleFrom(undefined, '')).toBe('sv');
    expect(previewLocaleFrom('xx', '  ')).toBe('sv');
  });
  it('follows the cookie or the header whenever there is one, like the page', () => {
    expect(previewLocaleFrom('en', null)).toBe('en');
    expect(previewLocaleFrom(undefined, 'en-US,en;q=0.9')).toBe('en');
    expect(previewLocaleFrom(undefined, 'nb-NO')).toBe('en');
    expect(previewLocaleFrom(undefined, 'sv-SE')).toBe('sv');
  });
});

describe('modeFrom', () => {
  it('forces only light or dark; anything else follows the device', () => {
    expect(modeFrom('light')).toBe('light');
    expect(modeFrom('dark')).toBe('dark');
    expect(modeFrom('system')).toBeNull();
    expect(modeFrom(undefined)).toBeNull();
  });
});
