import { describe, expect, it } from 'vitest';
import {
  bridgeDays,
  easterSunday,
  isoWeekday,
  monthTable,
  swedishHolidays,
  yearTotals,
} from '@/lib/workdays';

// The reference tables: docs/research/seo/gapfill.md section 2e (output of workdays.py, cross-checked against
// Swedish calendar sites: 251 working days and 2 008 hours in 2026).
const reference = {
  2026: {
    legal: [20, 20, 22, 20, 19, 22, 23, 21, 22, 22, 21, 22],
    practice: [20, 20, 22, 20, 19, 21, 23, 21, 22, 22, 21, 20],
    totals: { legalDays: 254, practiceDays: 251 },
  },
  2027: {
    legal: [19, 20, 21, 22, 20, 22, 22, 22, 22, 21, 22, 23],
    practice: [19, 20, 21, 22, 20, 21, 22, 22, 22, 21, 22, 21],
    totals: { legalDays: 256, practiceDays: 253 },
  },
} as const;

describe('easterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2028, '2028-04-16'],
    [2029, '2029-04-01'],
    [2030, '2030-04-21'],
  ])('%i is %s', (year, date) => {
    expect(easterSunday(year)).toBe(date);
  });
});

describe('swedishHolidays', () => {
  it('lists 13 public holidays and 3 eves, in date order', () => {
    for (const year of [2026, 2027]) {
      const list = swedishHolidays(year);
      expect(list.filter((h) => h.kind === 'public')).toHaveLength(13);
      expect(list.filter((h) => h.kind === 'eve').map((h) => h.key)).toEqual([
        'midsummerEve',
        'christmasEve',
        'newYearsEve',
      ]);
      expect(list.map((h) => h.date)).toEqual([...list.map((h) => h.date)].sort());
    }
  });

  it('matches the 2026 dates', () => {
    expect(Object.fromEntries(swedishHolidays(2026).map((h) => [h.key, h.date]))).toEqual({
      newYearsDay: '2026-01-01',
      epiphany: '2026-01-06',
      goodFriday: '2026-04-03',
      easterSunday: '2026-04-05',
      easterMonday: '2026-04-06',
      mayDay: '2026-05-01',
      ascensionDay: '2026-05-14',
      whitSunday: '2026-05-24',
      nationalDay: '2026-06-06',
      midsummerEve: '2026-06-19',
      midsummerDay: '2026-06-20',
      allSaintsDay: '2026-10-31',
      christmasEve: '2026-12-24',
      christmasDay: '2026-12-25',
      boxingDay: '2026-12-26',
      newYearsEve: '2026-12-31',
    });
  });

  it('matches the 2027 dates', () => {
    expect(Object.fromEntries(swedishHolidays(2027).map((h) => [h.key, h.date]))).toEqual({
      newYearsDay: '2027-01-01',
      epiphany: '2027-01-06',
      goodFriday: '2027-03-26',
      easterSunday: '2027-03-28',
      easterMonday: '2027-03-29',
      mayDay: '2027-05-01',
      ascensionDay: '2027-05-06',
      whitSunday: '2027-05-16',
      nationalDay: '2027-06-06',
      midsummerEve: '2027-06-25',
      midsummerDay: '2027-06-26',
      allSaintsDay: '2027-11-06',
      christmasEve: '2027-12-24',
      christmasDay: '2027-12-25',
      boxingDay: '2027-12-26',
      newYearsEve: '2027-12-31',
    });
  });

  it('puts midsommardagen and alla helgons dag on the Saturday of their window, midsommarafton the day before', () => {
    for (let year = 2020; year <= 2040; year++) {
      const byKey = Object.fromEntries(swedishHolidays(year).map((h) => [h.key, h.date]));
      for (const key of ['midsummerDay', 'allSaintsDay'] as const)
        expect(isoWeekday(byKey[key]!), `${year}`).toBe(6);
      expect(isoWeekday(byKey.midsummerEve!), `${year}`).toBe(5);
      expect(
        byKey.midsummerDay! >= `${year}-06-20` && byKey.midsummerDay! <= `${year}-06-26`,
        `${year}`,
      ).toBe(true);
      expect(
        byKey.allSaintsDay! >= `${year}-10-31` && byKey.allSaintsDay! <= `${year}-11-06`,
        `${year}`,
      ).toBe(true);
    }
  });
});

describe('monthTable', () => {
  for (const year of [2026, 2027] as const) {
    it(`${year} equals the reference table`, () => {
      const rows = monthTable(year);
      expect(rows.map((r) => r.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      expect(rows.map((r) => r.legalDays)).toEqual(reference[year].legal);
      expect(rows.map((r) => r.practiceDays)).toEqual(reference[year].practice);
      expect(yearTotals(year)).toEqual(reference[year].totals);
    });
  }
});

describe('bridgeDays', () => {
  it('finds the klämdagar of 2026 and 2027', () => {
    expect(bridgeDays(2026)).toEqual(['2026-01-02', '2026-01-05', '2026-05-15']);
    expect(bridgeDays(2027)).toEqual(['2027-05-07']);
  });
});

describe('isoWeekday', () => {
  it('is 1 for Monday and 7 for Sunday', () => {
    expect(isoWeekday('2026-09-28')).toBe(1);
    expect(isoWeekday('2026-10-04')).toBe(7);
  });
});

// The year pages (i18n/pages/hours-2026.ts, hours-2027.ts) name these weekdays in words; the numbers are computed.
describe('calendar facts the year pages state in words', () => {
  const weekdayOf = (year: number) =>
    Object.fromEntries(swedishHolidays(year).map((h) => [h.key, isoWeekday(h.date)]));

  it('2026', () => {
    const w = weekdayOf(2026);
    expect([w.newYearsDay, w.epiphany, w.mayDay, w.ascensionDay]).toEqual([4, 2, 5, 4]);
    expect([w.nationalDay, w.boxingDay]).toEqual([6, 6]);
    expect([w.christmasEve, w.christmasDay, w.newYearsEve]).toEqual([4, 5, 4]);
  });

  it('2027', () => {
    const w = weekdayOf(2027);
    expect([w.mayDay, w.christmasDay, w.nationalDay, w.boxingDay]).toEqual([6, 6, 7, 7]);
    expect([w.newYearsDay, w.epiphany, w.christmasEve, w.newYearsEve]).toEqual([5, 3, 5, 5]);
    expect(monthTable(2027)[3]).toEqual({ month: 4, legalDays: 22, practiceDays: 22 });
  });
});
