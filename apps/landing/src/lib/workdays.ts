// Swedish public holidays and working days per month, for any year (/arbetstid-per-manad). Pure: dates are
// 'YYYY-MM-DD' strings and all arithmetic is in UTC, so the tables never depend on the build machine's time zone.
// The holidays are Lag (1989:253) om allmänna helgdagar; the three eves are not holidays by law but most workplaces
// take them off, so the table counts working days both ways. Holiday names live in the page copy, not here.

export type HolidayKey =
  | 'newYearsDay'
  | 'epiphany'
  | 'goodFriday'
  | 'easterSunday'
  | 'easterMonday'
  | 'mayDay'
  | 'ascensionDay'
  | 'whitSunday'
  | 'nationalDay'
  | 'midsummerEve'
  | 'midsummerDay'
  | 'allSaintsDay'
  | 'christmasEve'
  | 'christmasDay'
  | 'boxingDay'
  | 'newYearsEve';

export interface Holiday {
  date: string;
  key: HolidayKey;
  /** `public`: allmän helgdag by law. `eve`: not a holiday by law, a day off in practice. */
  kind: 'public' | 'eve';
}

export interface MonthRow {
  /** 1 to 12 */
  month: number;
  /** Monday to Friday minus the public holidays that fall on them. */
  legalDays: number;
  /** legalDays minus midsommarafton, julafton and nyårsafton when they fall on a weekday. */
  practiceDays: number;
}

/** Full time: 40 hours a week (arbetstidslagen 5 §) over five days. */
export const HOURS_PER_DAY = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

function utc(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day);
}

function iso(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function time(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

/** ISO weekday of a date: 1 is Monday, 7 is Sunday. */
export function isoWeekday(date: string): number {
  return ((new Date(time(date)).getUTCDay() + 6) % 7) + 1;
}

export function isWeekend(date: string): boolean {
  return isoWeekday(date) >= 6;
}

/** Easter Sunday by the Anonymous Gregorian algorithm (Meeus/Jones/Butcher). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(utc(year, month, day));
}

/** The Saturday in a seven-day window (midsommardagen: 20 to 26 June; alla helgons dag: 31 October to 6 November). */
function saturdayFrom(year: number, month: number, day: number): number {
  const first = utc(year, month, day);
  const offset = (6 - isoWeekday(iso(first)) + 7) % 7;
  return first + offset * DAY_MS;
}

/** Every public holiday and the three eves of a year, in date order. */
export function swedishHolidays(year: number): Holiday[] {
  const easter = time(easterSunday(year));
  const midsummer = saturdayFrom(year, 6, 20);
  const shifted = (base: number, days: number) => iso(base + days * DAY_MS);
  const list: Holiday[] = [
    { date: iso(utc(year, 1, 1)), key: 'newYearsDay', kind: 'public' },
    { date: iso(utc(year, 1, 6)), key: 'epiphany', kind: 'public' },
    { date: shifted(easter, -2), key: 'goodFriday', kind: 'public' },
    { date: shifted(easter, 0), key: 'easterSunday', kind: 'public' },
    { date: shifted(easter, 1), key: 'easterMonday', kind: 'public' },
    { date: iso(utc(year, 5, 1)), key: 'mayDay', kind: 'public' },
    { date: shifted(easter, 39), key: 'ascensionDay', kind: 'public' },
    { date: shifted(easter, 49), key: 'whitSunday', kind: 'public' },
    { date: iso(utc(year, 6, 6)), key: 'nationalDay', kind: 'public' },
    { date: shifted(midsummer, -1), key: 'midsummerEve', kind: 'eve' },
    { date: shifted(midsummer, 0), key: 'midsummerDay', kind: 'public' },
    { date: iso(saturdayFrom(year, 10, 31)), key: 'allSaintsDay', kind: 'public' },
    { date: iso(utc(year, 12, 24)), key: 'christmasEve', kind: 'eve' },
    { date: iso(utc(year, 12, 25)), key: 'christmasDay', kind: 'public' },
    { date: iso(utc(year, 12, 26)), key: 'boxingDay', kind: 'public' },
    { date: iso(utc(year, 12, 31)), key: 'newYearsEve', kind: 'eve' },
  ];
  return list.sort((x, y) => x.date.localeCompare(y.date));
}

/** Working days per month, by law and in practice. Hours are days x 8 (40 h a week), worked out in the view. */
export function monthTable(year: number): MonthRow[] {
  const kinds = new Map(swedishHolidays(year).map((h) => [h.date, h.kind]));
  const rows: MonthRow[] = [];
  for (let month = 1; month <= 12; month++) {
    let legalDays = 0;
    let practiceDays = 0;
    const end = utc(year, month + 1, 1);
    for (let t = utc(year, month, 1); t < end; t += DAY_MS) {
      const date = iso(t);
      if (isWeekend(date) || kinds.get(date) === 'public') continue;
      legalDays++;
      if (kinds.get(date) !== 'eve') practiceDays++;
    }
    rows.push({ month, legalDays, practiceDays });
  }
  return rows;
}

/** The year's totals of monthTable. */
export function yearTotals(year: number): { legalDays: number; practiceDays: number } {
  return monthTable(year).reduce(
    (sum, row) => ({
      legalDays: sum.legalDays + row.legalDays,
      practiceDays: sum.practiceDays + row.practiceDays,
    }),
    { legalDays: 0, practiceDays: 0 },
  );
}

/**
 * Klämdagar: a working day squeezed between a weekend and a weekday that is off (a public holiday or one of the
 * three eves), so one day of leave makes a four-day weekend. Not a holiday by law; listed for information.
 */
export function bridgeDays(year: number): string[] {
  const offDays = new Set([year - 1, year, year + 1].flatMap((y) => swedishHolidays(y).map((h) => h.date)));
  const offWeekday = (date: string) => !isWeekend(date) && offDays.has(date);
  const bridges: string[] = [];
  for (let t = utc(year, 1, 1); t < utc(year + 1, 1, 1); t += DAY_MS) {
    const date = iso(t);
    if (isWeekend(date) || offDays.has(date)) continue;
    const before = iso(t - DAY_MS);
    const after = iso(t + DAY_MS);
    if ((offWeekday(before) && isWeekend(after)) || (isWeekend(before) && offWeekday(after)))
      bridges.push(date);
  }
  return bridges;
}
