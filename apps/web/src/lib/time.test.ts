import { afterAll, describe, expect, it } from 'vitest';
import { parseDate, serializeDate } from '@klokka/api-client';
import { dateOf, isoOf, todayIn } from './time';

// The generated client parses a `date` as LOCAL midnight and serialises with local getters (runtime.ts), so
// the web's conversions must use the same convention. Staging showed the 23rd's entry drawn under the 22nd
// in Europe/Stockholm: isoOf() read the UTC day of a local-midnight Date.
const ORIGINAL_TZ = process.env.TZ;
const ZONES = ['Europe/Stockholm', 'America/Los_Angeles', 'Pacific/Auckland', 'UTC'];

afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

describe('isoOf and dateOf agree with the generated client in every zone', () => {
  for (const zone of ZONES) {
    it(`round-trips a work date in ${zone}`, () => {
      process.env.TZ = zone;
      expect(new Date(2026, 8, 23).getTimezoneOffset()).toBe(new Date(2026, 8, 23).getTimezoneOffset());
      expect(isoOf(parseDate('2026-09-23'))).toBe('2026-09-23');
      expect(serializeDate(dateOf('2026-09-23'))).toBe('2026-09-23');
      expect(isoOf(dateOf('2026-01-01'))).toBe('2026-01-01');
      expect(isoOf('2026-09-23')).toBe('2026-09-23');
    });
  }
});

describe('todayIn', () => {
  it('uses the workspace zone, not the browser zone', () => {
    process.env.TZ = 'America/Los_Angeles';
    expect(todayIn('Europe/Stockholm', new Date('2026-09-27T22:30:00Z'))).toBe('2026-09-28');
    expect(todayIn('America/Los_Angeles', new Date('2026-09-27T22:30:00Z'))).toBe('2026-09-27');
  });
});
