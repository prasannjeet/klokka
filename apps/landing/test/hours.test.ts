import { describe, expect, it } from 'vitest';
import { formatHours, parseBreak, parseClock, parseRate, pay, shiftMinutes, sumMinutes } from '@/lib/hours';

describe('parseClock', () => {
  it.each([
    ['8', 480],
    ['08', 480],
    ['0', 0],
    ['17', 1020],
    ['23', 1380],
    ['8:30', 510],
    ['08:30', 510],
    ['08.30', 510],
    ['8.30', 510],
    ['0830', 510],
    ['0000', 0],
    ['2359', 1439],
    ['17:05', 1025],
    ['  17:05 ', 1025],
    ['\t8\n', 480],
  ])('reads %j as %i minutes', (input, minutes) => {
    expect(parseClock(input)).toBe(minutes);
  });

  it.each([
    '',
    '   ',
    'abc',
    '24',
    '25',
    '99',
    '8:61',
    '8:60',
    '24:00',
    '2400',
    '0860',
    '830',
    '08300',
    '8:5',
    '8:305',
    '8,30',
    '-8',
    '8h',
    '8:30pm',
    '8::30',
    ':30',
  ])('rejects %j', (input) => {
    expect(parseClock(input)).toBeNull();
  });
});

describe('parseBreak and parseRate', () => {
  it('reads a break in whole minutes, empty as none', () => {
    expect(parseBreak('')).toBe(0);
    expect(parseBreak(' 30 ')).toBe(30);
    expect(parseBreak('0')).toBe(0);
    expect(parseBreak('120')).toBe(120);
    for (const bad of ['-5', '1,5', '0:30', 'abc', '1000']) expect(parseBreak(bad), bad).toBeNull();
  });

  it('reads a wage with a comma or a point, empty or anything else as none', () => {
    expect(parseRate('150')).toBe(150);
    expect(parseRate('150,50')).toBe(150.5);
    expect(parseRate(' 150.5 ')).toBe(150.5);
    expect(parseRate('0')).toBe(0);
    for (const bad of ['', 'abc', '-150', '150,555', '1 500', '150kr'])
      expect(parseRate(bad), bad).toBeNull();
  });
});

describe('shiftMinutes', () => {
  it('subtracts the break from a day shift', () => {
    expect(shiftMinutes(480, 990, 30)).toBe(480);
    expect(shiftMinutes(510, 1020, 45)).toBe(465);
    expect(shiftMinutes(480, 990, 0)).toBe(510);
  });

  it('runs past midnight when the end is before the start', () => {
    expect(shiftMinutes(1320, 360, 30)).toBe(450);
    expect(shiftMinutes(1380, 0, 0)).toBe(60);
  });

  it('is 0 minutes when the end equals the start', () => {
    expect(shiftMinutes(480, 480, 0)).toBe(0);
  });

  it('allows a break as long as the shift, rejects a longer or negative one', () => {
    expect(shiftMinutes(480, 510, 30)).toBe(0);
    expect(shiftMinutes(480, 510, 31)).toBeNull();
    expect(shiftMinutes(480, 480, 1)).toBeNull();
    expect(shiftMinutes(480, 990, -1)).toBeNull();
  });
});

describe('sumMinutes', () => {
  it('adds the days with a value and ignores the rest', () => {
    expect(sumMinutes([480, null, 450, null, 30])).toBe(960);
    expect(sumMinutes([])).toBe(0);
    expect(sumMinutes([null, null])).toBe(0);
  });
});

describe('formatHours', () => {
  it.each([
    [450, '7,5 h', '7.5 h', '7:30'],
    [480, '8 h', '8 h', '8:00'],
    [465, '7,75 h', '7.75 h', '7:45'],
    [0, '0 h', '0 h', '0:00'],
    [7, '0,12 h', '0.12 h', '0:07'],
    [20, '0,33 h', '0.33 h', '0:20'],
    [2400, '40 h', '40 h', '40:00'],
    [2405, '40,08 h', '40.08 h', '40:05'],
  ])('%i minutes is %s / %s / %s', (minutes, sv, en, clock) => {
    expect(formatHours(minutes, 'sv')).toEqual({ decimal: sv, clock });
    expect(formatHours(minutes, 'en')).toEqual({ decimal: en, clock });
  });
});

describe('pay', () => {
  it('is hours times the rate, rounded to two decimals', () => {
    expect(pay(450, 150)).toBe(1125);
    expect(pay(450, 150.5)).toBe(1128.75);
    expect(pay(7, 99.99)).toBe(11.67);
    expect(pay(20, 100)).toBe(33.33);
  });

  it('is 0 for a rate of 0 or no minutes', () => {
    expect(pay(480, 0)).toBe(0);
    expect(pay(0, 150)).toBe(0);
  });
});
