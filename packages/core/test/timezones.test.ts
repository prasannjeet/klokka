import { describe, expect, it } from 'vitest';
import {
  CURATED_TIME_ZONES,
  isIanaTimeZone,
  matchesTimeZone,
  timeZoneLabel,
  timeZoneOptions,
} from '../src/timezones.ts';

describe('timeZoneOptions (CHQ-145)', () => {
  it('puts Europe first, then the rest of the world, each alphabetical', () => {
    const options = timeZoneOptions(undefined, [
      'Asia/Tokyo',
      'Europe/Stockholm',
      'America/Chicago',
      'Europe/Berlin',
      'UTC',
    ]);
    expect(options).toEqual(['Europe/Berlin', 'Europe/Stockholm', 'America/Chicago', 'Asia/Tokyo', 'UTC']);
  });

  it('falls back to the curated list when the runtime lists nothing (Hermes)', () => {
    const options = timeZoneOptions(undefined, []);
    expect(options.length).toBe(CURATED_TIME_ZONES.length);
    expect(options[0]?.startsWith('Europe/')).toBe(true);
    expect(options.indexOf('Europe/Stockholm')).toBeLessThan(options.indexOf('America/New_York'));
  });

  it('always offers the current value, even one the list does not know', () => {
    expect(timeZoneOptions('Antarctica/Troll', ['Europe/Oslo'])).toEqual(['Europe/Oslo', 'Antarctica/Troll']);
    expect(timeZoneOptions('Europe/Oslo', ['Europe/Oslo'])).toEqual(['Europe/Oslo']);
  });

  it('reads and searches like a person would', () => {
    expect(timeZoneLabel('America/New_York')).toBe('America/New York');
    expect(matchesTimeZone('America/New_York', 'new york')).toBe(true);
    expect(matchesTimeZone('Europe/Zurich', 'zürich')).toBe(true);
    expect(matchesTimeZone('Europe/Stockholm', 'oslo')).toBe(false);
    expect(matchesTimeZone('Europe/Stockholm', '')).toBe(true);
  });

  it('offers IANA ids only, never an offset such as UTC+1 (the API refuses them)', () => {
    for (const ok of [
      'Europe/Stockholm',
      'America/Argentina/Buenos_Aires',
      'Etc/GMT-1',
      'UTC',
      'America/Port-au-Prince',
    ]) {
      expect(isIanaTimeZone(ok)).toBe(true);
    }
    for (const bad of ['UTC+1', 'UTC+01:00', 'GMT+2', '+01:00', 'CET', '', null, undefined]) {
      expect(isIanaTimeZone(bad)).toBe(false);
    }
    expect(timeZoneOptions('UTC+01:00', ['Europe/Oslo', 'GMT+1'])).toEqual(['Europe/Oslo']);
    for (const zone of timeZoneOptions()) expect(isIanaTimeZone(zone)).toBe(true);
    for (const zone of CURATED_TIME_ZONES) expect(isIanaTimeZone(zone)).toBe(true);
  });
});
