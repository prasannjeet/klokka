// Jobs as the web shows them (CHQ-156): durations, spans, the directions link and the map URL.
import { describe, expect, it } from 'vitest';
import { translator } from '@klokka/core';
import { directionsUrl, endTime, formatDuration, mapImageUrl, placesOf, timeRange } from './jobs';

const t = translator('en');

describe('jobs', () => {
  it('reads a duration as hours and minutes', () => {
    expect(formatDuration(7.25, t)).toBe('7 h 15 min');
    expect(formatDuration(8, t)).toBe('8 h');
    expect(formatDuration(0.5, t)).toBe('30 min');
  });

  it('ends a job after its hours, past midnight too', () => {
    expect(endTime('13:30', 4.5)).toBe('18:00');
    expect(endTime('22:00', 3)).toBe('01:00');
    expect(timeRange({ startTime: '09:00', hours: 4.5 }, t)).toBe('09:00 to 13:30');
    expect(timeRange({ startTime: null, hours: 4.5 }, t)).toBeNull();
  });

  it('links directions to the place and asks the API for the map, never Google', () => {
    const place = { placeId: 'p1', name: 'Café Nord', latitude: 59.33459, longitude: 18.06324 };
    expect(directionsUrl(place)).toBe(
      'https://www.google.com/maps/search/?api=1&query=59.33459%2C18.06324&query_place_id=p1',
    );
    expect(mapImageUrl('ws1', place, 360, 110, true)).toBe(
      '/api/k/workspaces/ws1/map.png?latitude=59.33459&longitude=18.06324&width=360&height=110&dark=true',
    );
  });

  it("names a day's places once each, in order", () => {
    const job = (name: string | null) => ({
      id: name ?? 'x',
      hours: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(name ? { location: { name, latitude: 0, longitude: 0 } } : {}),
    });
    expect(placesOf([job('Café Nord'), job(null), job('Lager'), job('Café Nord')])).toEqual([
      'Café Nord',
      'Lager',
    ]);
  });
});
