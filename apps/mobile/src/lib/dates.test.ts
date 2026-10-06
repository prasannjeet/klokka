import { currentMonthIn, fromIsoDate, minutesNowIn, todayIn, toIsoDate } from './dates';

describe('dates', () => {
  it('round-trips an ISO date through a local-midnight Date', () => {
    const d = fromIsoDate('2026-09-22');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(22);
    expect(d.getHours()).toBe(0);
    expect(toIsoDate(d)).toBe('2026-09-22');
  });

  it('cuts today by the workspace time zone, not the phone', () => {
    // 23:30 UTC on the 27th is already the 28th in Stockholm and still the 27th in Los Angeles.
    const now = new Date('2026-09-27T23:30:00Z');
    expect(todayIn('Europe/Stockholm', now)).toBe('2026-09-28');
    expect(todayIn('America/Los_Angeles', now)).toBe('2026-09-27');
    expect(currentMonthIn('Europe/Stockholm', new Date('2026-09-30T22:30:00Z'))).toBe('2026-10');
  });

  it('reads the clock in the workspace time zone (CHQ-171)', () => {
    // 06:30 UTC is 08:30 in Stockholm (summer time) and 23:30 the day before in Los Angeles.
    const now = new Date('2026-10-07T06:30:00Z');
    expect(minutesNowIn('Europe/Stockholm', now)).toBe(8 * 60 + 30);
    expect(minutesNowIn('America/Los_Angeles', now)).toBe(23 * 60 + 30);
  });
});
