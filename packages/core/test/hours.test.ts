import { describe, expect, it } from 'vitest';
import {
  isValidHours,
  joinHours,
  minuteOptions,
  parseHours,
  roundHours,
  splitHours,
  stepHours,
  sumHours,
} from '../src/hours.ts';

describe('parseHours', () => {
  it('accepts a comma or a dot as the decimal separator', () => {
    expect(parseHours('2,5')).toBe(2.5);
    expect(parseHours('2.5')).toBe(2.5);
    expect(parseHours('3')).toBe(3);
    expect(parseHours(' 7,5 ')).toBe(7.5);
    expect(parseHours('0,25')).toBe(0.25);
    expect(parseHours('8 h')).toBe(8);
    expect(parseHours('2,5 timmar')).toBe(2.5);
  });

  it('keeps two decimals and pads a single one', () => {
    expect(parseHours('3,8')).toBe(3.8);
    expect(parseHours('3,75')).toBe(3.75);
    expect(parseHours('1.05')).toBe(1.05);
  });

  it('rejects what is not an hours value', () => {
    for (const bad of ['', ' ', 'abc', '-1', '25', '24,5', '2,555', '1e3', '2..5', null, undefined]) {
      expect(parseHours(bad), String(bad)).toBeNull();
    }
  });

  it('allows the whole range 0 to 24', () => {
    expect(parseHours('0')).toBe(0);
    expect(parseHours('24')).toBe(24);
  });
});

describe('roundHours', () => {
  it('NONE keeps two decimals', () => {
    expect(roundHours(3.8, 'NONE')).toBe(3.8);
    expect(roundHours(3.789, 'NONE')).toBe(3.79);
  });

  it('QUARTER rounds to the nearest 0.25 (settings.roundingHint: 3.8 becomes 3.75)', () => {
    expect(roundHours(3.8, 'QUARTER')).toBe(3.75);
    expect(roundHours(3.9, 'QUARTER')).toBe(4);
    expect(roundHours(2.125, 'QUARTER')).toBe(2.25);
    expect(roundHours(2.124, 'QUARTER')).toBe(2);
  });

  it('HALF rounds to the nearest 0.5', () => {
    expect(roundHours(3.8, 'HALF')).toBe(4);
    expect(roundHours(3.7, 'HALF')).toBe(3.5);
    expect(roundHours(3.25, 'HALF')).toBe(3.5);
    expect(roundHours(6.4, 'HALF')).toBe(6.5);
  });

  it('never leaves the 0 to 24 range', () => {
    expect(roundHours(23.9, 'HALF')).toBe(24);
    expect(roundHours(0.1, 'HALF')).toBe(0);
    expect(() => roundHours(Number.NaN, 'NONE')).toThrow(RangeError);
  });
});

describe('stepHours and sums', () => {
  it('steps by half an hour inside the range', () => {
    expect(stepHours(4, 1)).toBe(4.5);
    expect(stepHours(4, -1)).toBe(3.5);
    expect(stepHours(0, -1)).toBe(0);
    expect(stepHours(24, 1)).toBe(24);
  });

  it('sums without floating point noise', () => {
    expect(sumHours([4, 4, 6.5, 4, 4])).toBe(22.5);
    expect(sumHours([0.1, 0.2])).toBe(0.3);
    expect(sumHours([])).toBe(0);
  });

  it('isValidHours accepts only two-decimal values in range', () => {
    expect(isValidHours(2.5)).toBe(true);
    expect(isValidHours(2.555)).toBe(false);
    expect(isValidHours(-1)).toBe(false);
    expect(isValidHours(24.01)).toBe(false);
  });
});

describe('minuteOptions, splitHours and joinHours', () => {
  it('offers the minutes the rounding rule allows', () => {
    expect(minuteOptions('QUARTER')).toEqual([0, 15, 30, 45]);
    expect(minuteOptions('HALF')).toEqual([0, 30]);
    expect(minuteOptions('NONE')).toHaveLength(60);
  });

  it('splits decimal hours into hours and the nearest offered minute, carrying into the next hour', () => {
    expect(splitHours(7.25, 'QUARTER')).toEqual({ hours: 7, minutes: 15 });
    expect(splitHours(7.33, 'QUARTER')).toEqual({ hours: 7, minutes: 15 });
    expect(splitHours(7.33, 'NONE')).toEqual({ hours: 7, minutes: 20 });
    expect(splitHours(7.9, 'HALF')).toEqual({ hours: 8, minutes: 0 });
    expect(splitHours(23.95, 'QUARTER')).toEqual({ hours: 24, minutes: 0 });
    expect(splitHours(0, 'NONE')).toEqual({ hours: 0, minutes: 0 });
  });

  it('joins back to two decimals, and every minute round-trips', () => {
    expect(joinHours(7, 15)).toBe(7.25);
    expect(joinHours(24, 30)).toBe(24);
    for (let m = 0; m < 60; m++)
      expect(splitHours(joinHours(7, m), 'NONE')).toEqual({ hours: 7, minutes: m });
  });
});
