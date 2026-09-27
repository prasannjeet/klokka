// Month and week arithmetic on plain ISO strings ("2026-09", "2026-09-27"), timezone-free on purpose:
// the API stores a work date as a date in the workspace time zone and the clients only lay it out.
// Everything here is presentation geometry; totals per week or month come from the API (D9).

export type IsoDate = string; // YYYY-MM-DD
export type IsoMonth = string; // YYYY-MM
export type WeekStart = 'MONDAY' | 'SUNDAY';
export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export const WEEKDAYS: readonly Weekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export interface YearMonth {
  year: number;
  month: number; // 1..12
}

export function parseMonth(value: string): YearMonth {
  const m = MONTH_RE.exec(value);
  if (!m) throw new RangeError(`parseMonth: expected YYYY-MM, got "${value}"`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function monthKey(year: number, month: number): IsoMonth {
  if (month < 1 || month > 12) throw new RangeError(`monthKey: month out of range: ${month}`);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

export function monthOf(date: IsoDate): IsoMonth {
  assertDate(date);
  return date.slice(0, 7);
}

export function addMonths(month: IsoMonth, delta: number): IsoMonth {
  const { year, month: m } = parseMonth(month);
  const index = year * 12 + (m - 1) + delta;
  return monthKey(Math.floor(index / 12), (index % 12) + 1);
}

export const previousMonth = (month: IsoMonth): IsoMonth => addMonths(month, -1);
export const nextMonth = (month: IsoMonth): IsoMonth => addMonths(month, 1);

export function daysInMonth(month: IsoMonth): number {
  const { year, month: m } = parseMonth(month);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

export function isoDate(year: number, month: number, day: number): IsoDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function assertDate(date: string): void {
  if (!DATE_RE.test(date)) throw new RangeError(`expected YYYY-MM-DD, got "${date}"`);
}

function toUtc(date: IsoDate): Date {
  assertDate(date);
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(d: Date): IsoDate {
  return isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(date: IsoDate, delta: number): IsoDate {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + delta);
  return fromUtc(d);
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Monday = 0 ... Sunday = 6 (ISO), independent of the workspace week start.
export function isoWeekdayIndex(date: IsoDate): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export function weekdayOf(date: IsoDate): Weekday {
  return WEEKDAYS[isoWeekdayIndex(date)] as Weekday;
}

export function isWeekend(date: IsoDate): boolean {
  return isoWeekdayIndex(date) >= 5;
}

// Every date of the month in order.
export function monthDays(month: IsoMonth): IsoDate[] {
  const { year, month: m } = parseMonth(month);
  const n = daysInMonth(month);
  return Array.from({ length: n }, (_, i) => isoDate(year, m, i + 1));
}

// Working days = Monday to Friday. Used for "average per working day" labels; the API computes the
// average itself and sends `workingDays` along, so this exists for previews and tests.
export function workingDays(month: IsoMonth): number {
  return monthDays(month).filter((d) => !isWeekend(d)).length;
}

// ISO 8601 week number and week-based year of a date.
export function isoWeek(date: IsoDate): { week: number; year: number } {
  const d = toUtc(date);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day + 3); // nearest Thursday
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week =
    1 + Math.round(((d.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return { week, year };
}

// The seven dates of the week containing `date`, starting on the workspace week start.
export function weekOf(date: IsoDate, weekStart: WeekStart): IsoDate[] {
  const offset = weekStart === 'MONDAY' ? isoWeekdayIndex(date) : (isoWeekdayIndex(date) + 1) % 7;
  const first = addDays(date, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

export interface CalendarDay {
  date: IsoDate;
  inMonth: boolean;
  weekday: Weekday;
  weekend: boolean;
}

export interface CalendarWeek {
  isoWeek: number;
  days: CalendarDay[]; // always 7, padded with the neighbouring months
}

// The calendar grid of a month: whole weeks from the week start, padded so every row has seven days.
export function weeksOf(month: IsoMonth, weekStart: WeekStart): CalendarWeek[] {
  const days = monthDays(month);
  const first = days[0] as IsoDate;
  const last = days[days.length - 1] as IsoDate;
  const weeks: CalendarWeek[] = [];
  let cursor = weekOf(first, weekStart)[0] as IsoDate;
  while (compareDates(cursor, last) <= 0) {
    const week = weekOf(cursor, weekStart);
    weeks.push({
      isoWeek: isoWeek(week[weekStart === 'MONDAY' ? 0 : 1] as IsoDate).week,
      days: week.map((date) => ({
        date,
        inMonth: date.slice(0, 7) === month,
        weekday: weekdayOf(date),
        weekend: isWeekend(date),
      })),
    });
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

// Weekday order for a header row given the week start.
export function weekdayOrder(weekStart: WeekStart): Weekday[] {
  return weekStart === 'MONDAY' ? [...WEEKDAYS] : ['SUNDAY', ...WEEKDAYS.slice(0, 6)];
}

export function isToday(date: IsoDate, today: IsoDate): boolean {
  return date === today;
}

// Days of the month that are today or in the past ("so far"), for projections in previews.
export function elapsedDays(month: IsoMonth, today: IsoDate): number {
  return monthDays(month).filter((d) => compareDates(d, today) <= 0).length;
}
