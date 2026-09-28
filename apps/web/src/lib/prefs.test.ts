import { describe, expect, it } from 'vitest';
import { localeFrom, modeFrom } from './prefs';

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

describe('modeFrom', () => {
  it('forces only light or dark; anything else follows the device', () => {
    expect(modeFrom('light')).toBe('light');
    expect(modeFrom('dark')).toBe('dark');
    expect(modeFrom('system')).toBeNull();
    expect(modeFrom(undefined)).toBeNull();
  });
});
