import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatHours,
  formatHoursDelta,
  formatMoney,
  formatMonth,
  formatMonthName,
  formatPercentDelta,
  formatTime,
  formatWeekday,
} from '../src/format.ts';

// Intl output uses U+00A0 / U+202F as group and unit separators; normalise for readable assertions.
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('hours', () => {
  it('uses the locale decimal separator and drops trailing zeros', () => {
    expect(plain(formatHours(22.5, 'sv'))).toBe('22,5 h');
    expect(plain(formatHours(22.5, 'en'))).toBe('22.5 h');
    expect(plain(formatHours(118, 'en'))).toBe('118 h');
    expect(plain(formatHours(4.6, 'sv', { unit: false }))).toBe('4,6');
  });

  it('formats deltas with a sign', () => {
    expect(plain(formatHoursDelta(31, 'en'))).toBe('+31 h');
    expect(plain(formatHoursDelta(-2.5, 'sv'))).toBe('−2,5 h');
    expect(plain(formatHoursDelta(0, 'en'))).toBe('0 h');
    expect(plain(formatPercentDelta(3, 'en'))).toBe('+3%');
    expect(plain(formatPercentDelta(3, 'sv'))).toBe('+3 %');
  });
});

describe('money', () => {
  it('shows kronor the Swedish way and drops decimals on whole amounts', () => {
    expect(plain(formatMoney(85660, 'SEK', 'sv'))).toBe('85 660 kr');
    expect(plain(formatMoney(1073, 'SEK', 'sv'))).toBe('1 073 kr');
    expect(plain(formatMoney(3825.5, 'SEK', 'sv'))).toBe('3 825,50 kr');
  });

  it('formats other currencies for English', () => {
    expect(plain(formatMoney(15263, 'SEK', 'en'))).toBe('SEK 15,263');
    expect(plain(formatMoney(1200, 'EUR', 'en'))).toBe('€1,200');
  });
});

describe('dates', () => {
  it('formats months and dates per locale', () => {
    expect(formatMonth('2026-09', 'en')).toBe('September 2026');
    expect(formatMonth('2026-09', 'sv')).toBe('september 2026');
    expect(formatMonth('2026-09', 'sv', { capitalize: true })).toBe('September 2026');
    expect(formatMonthName('2026-08', 'en')).toBe('August');
    expect(formatMonthName('2026-08', 'sv')).toBe('Augusti');
    expect(plain(formatDate('2026-09-22', 'en', 'weekdayDayMonth'))).toBe('Tuesday 22 September');
    expect(plain(formatDate('2026-09-22', 'sv', 'weekdayDayMonth'))).toBe('tisdag 22 september');
    expect(plain(formatDate('2026-09-22', 'en', 'dayMonth'))).toBe('22 Sept');
    expect(formatDate('2026-09-22', 'sv', 'iso')).toBe('2026-09-22');
  });

  it('formats weekdays and times', () => {
    expect(formatWeekday(0, 'en', 'long')).toBe('Monday');
    expect(formatWeekday(6, 'sv', 'long')).toBe('söndag');
    expect(formatTime('2026-09-25T11:50:00Z', 'sv', 'Europe/Stockholm')).toBe('13:50');
  });
});
