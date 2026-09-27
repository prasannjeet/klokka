import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  daysInMonth,
  elapsedDays,
  isoWeek,
  monthDays,
  monthKey,
  nextMonth,
  parseMonth,
  previousMonth,
  weekOf,
  weekdayOf,
  weekdayOrder,
  weeksOf,
  workingDays,
} from '../src/month.ts';

describe('month keys', () => {
  it('parses and formats YYYY-MM', () => {
    expect(parseMonth('2026-09')).toEqual({ year: 2026, month: 9 });
    expect(monthKey(2026, 9)).toBe('2026-09');
    expect(() => parseMonth('2026-13')).toThrow(RangeError);
    expect(() => parseMonth('2026-9')).toThrow(RangeError);
  });

  it('steps across year boundaries', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(nextMonth('2026-12')).toBe('2027-01');
    expect(addMonths('2026-09', -9)).toBe('2025-12');
    expect(addMonths('2026-09', 15)).toBe('2027-12');
  });

  it('knows month lengths, including leap years', () => {
    expect(daysInMonth('2026-09')).toBe(30);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(monthDays('2026-09')).toHaveLength(30);
    expect(monthDays('2026-09')[0]).toBe('2026-09-01');
    expect(monthDays('2026-09')[29]).toBe('2026-09-30');
  });
});

describe('days and weeks', () => {
  it('adds days across month ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('names weekdays (27 September 2026 is a Sunday)', () => {
    expect(weekdayOf('2026-09-27')).toBe('SUNDAY');
    expect(weekdayOf('2026-09-21')).toBe('MONDAY');
    expect(weekdayOf('2026-09-25')).toBe('FRIDAY');
  });

  it('computes ISO week numbers (week 39 is 21 to 27 September 2026)', () => {
    expect(isoWeek('2026-09-21')).toEqual({ week: 39, year: 2026 });
    expect(isoWeek('2026-09-27')).toEqual({ week: 39, year: 2026 });
    expect(isoWeek('2026-09-28')).toEqual({ week: 40, year: 2026 });
    expect(isoWeek('2026-01-01')).toEqual({ week: 1, year: 2026 });
    expect(isoWeek('2027-01-01')).toEqual({ week: 53, year: 2026 });
  });

  it('builds the week around a date for either week start', () => {
    expect(weekOf('2026-09-23', 'MONDAY')).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
    expect(weekOf('2026-09-23', 'SUNDAY')[0]).toBe('2026-09-20');
    expect(weekOf('2026-09-27', 'SUNDAY')[0]).toBe('2026-09-27');
  });

  it('counts working days (September 2026 has 22 weekdays)', () => {
    expect(workingDays('2026-09')).toBe(22);
    expect(workingDays('2026-02')).toBe(20);
  });

  it('counts elapsed days for "so far" figures', () => {
    expect(elapsedDays('2026-09', '2026-09-27')).toBe(27);
    expect(elapsedDays('2026-09', '2026-10-05')).toBe(30);
    expect(elapsedDays('2026-09', '2026-08-01')).toBe(0);
  });
});

describe('weeksOf', () => {
  it('pads September 2026 into five Monday-first rows of seven', () => {
    const weeks = weeksOf('2026-09', 'MONDAY');
    expect(weeks).toHaveLength(5);
    expect(weeks.map((w) => w.isoWeek)).toEqual([36, 37, 38, 39, 40]);
    expect(weeks[0]?.days.map((d) => d.date)).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06',
    ]);
    expect(weeks[0]?.days[0]?.inMonth).toBe(false);
    expect(weeks[0]?.days[1]?.inMonth).toBe(true);
    expect(weeks[4]?.days[6]?.date).toBe('2026-10-04');
    for (const w of weeks) expect(w.days).toHaveLength(7);
  });

  it('starts on Sunday when the workspace says so', () => {
    const weeks = weeksOf('2026-09', 'SUNDAY');
    expect(weeks[0]?.days[0]?.date).toBe('2026-08-30');
    expect(weeks[0]?.days[0]?.weekday).toBe('SUNDAY');
    expect(weekdayOrder('SUNDAY')[0]).toBe('SUNDAY');
    expect(weekdayOrder('MONDAY')[6]).toBe('SUNDAY');
  });
});
