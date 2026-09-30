// The work-hours calculator's maths (/rakna-arbetstimmar), pure and in whole minutes so nothing drifts by a
// floating point cent. Parsing never guesses: an input it cannot read exactly is null, and the form says so.
import type { Locale } from '@/lib/i18n/config';

const DAY = 24 * 60;

const HOURS_ONLY = /^(\d{1,2})$/;
const WITH_SEPARATOR = /^(\d{1,2})[:.](\d{2})$/;
const FOUR_DIGITS = /^(\d{2})(\d{2})$/;

/**
 * A clock time as minutes since midnight: '8', '17', '8:30', '08.30', '0830', '17:05' (surrounding whitespace is
 * ignored). Hours 0 to 23, minutes 0 to 59; anything else ('25', '8:61', '830', 'abc', '') is null.
 */
export function parseClock(input: string): number | null {
  const text = input.trim();
  const match = HOURS_ONLY.exec(text) ?? WITH_SEPARATOR.exec(text) ?? FOUR_DIGITS.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** A break in whole minutes: empty is no break (0), '30' is 30, anything else is null. */
export function parseBreak(input: string): number | null {
  const text = input.trim();
  if (text === '') return 0;
  return /^\d{1,3}$/.test(text) ? Number(text) : null;
}

/** An hourly wage: '150', '150,50' or '150.5'; empty or anything else is null. */
export function parseRate(input: string): number | null {
  const text = input.trim();
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(text)) return null;
  return Number(text.replace(',', '.'));
}

/**
 * Minutes worked between two clock times less the break. An end before the start is the next day (a night shift);
 * an end equal to the start is 0 minutes. Null when the break is negative or longer than the shift.
 */
export function shiftMinutes(start: number, end: number, breakMinutes: number): number | null {
  if (breakMinutes < 0) return null;
  const span = end >= start ? end - start : end + DAY - start;
  if (breakMinutes > span) return null;
  return span - breakMinutes;
}

/** The total of the days that have a value; empty or invalid days (null) count as nothing. */
export function sumMinutes(values: readonly (number | null)[]): number {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

/**
 * Minutes as decimal hours and as hours and minutes: 450 is '7,5 h' / '7:30' in Swedish and '7.5 h' / '7:30' in
 * English. The decimal is rounded to two places without trailing zeros (7 minutes is '0,12 h').
 */
export function formatHours(minutes: number, locale: Locale): { decimal: string; clock: string } {
  const rounded = Math.round((minutes / 60) * 100) / 100;
  const decimal = String(rounded).replace('.', locale === 'sv' ? ',' : '.');
  const clock = `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
  return { decimal: `${decimal} h`, clock };
}

/** Gross pay for the minutes at an hourly rate, rounded to two decimals (no tax, no supplements). */
export function pay(minutes: number, hourlyRate: number): number {
  return Math.round((minutes * hourlyRate * 100) / 60) / 100;
}
