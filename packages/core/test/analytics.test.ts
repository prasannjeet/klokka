import { describe, expect, it } from 'vitest';
import { ANALYTICS_EVENTS, analyticsPath } from '../src/analytics.ts';

const ID = '0b6f9c1e-3a4d-4e5f-9a8b-7c6d5e4f3a2b';

describe('analyticsPath', () => {
  it('keeps plain routes as they are', () => {
    expect(analyticsPath('/')).toBe('/');
    expect(analyticsPath('')).toBe('/');
    expect(analyticsPath('/new')).toBe('/new');
    expect(analyticsPath('/create-workspace')).toBe('/create-workspace');
    expect(analyticsPath('/notifications-list')).toBe('/notifications-list');
  });

  it('hides the business slug, ids and dates in web routes', () => {
    expect(analyticsPath('/w/cafe-nord')).toBe('/w/:workspace');
    expect(analyticsPath('/w/cafe-nord/month')).toBe('/w/:workspace/month');
    expect(analyticsPath(`/w/cafe-nord/jobs/${ID}`)).toBe('/w/:workspace/jobs/:id');
    expect(analyticsPath('/w/cafe-nord/jobs/new')).toBe('/w/:workspace/jobs/new');
  });

  it('hides ids and dates in phone routes', () => {
    expect(analyticsPath(`/day/${ID}/2026-11-04`)).toBe('/day/:id/:date');
    expect(analyticsPath(`/member/${ID}`)).toBe('/member/:id');
    expect(analyticsPath(`/flag/${ID.toUpperCase()}`)).toBe('/flag/:id');
    expect(analyticsPath('/team-day/2026-11-04')).toBe('/team-day/:date');
    expect(analyticsPath('/insights/2026-11')).toBe('/insights/:month');
  });

  it('drops the query and the hash, where invitation tokens and filters ride', () => {
    expect(analyticsPath('/join?token=abc123&email=a%40b.se')).toBe('/join');
    expect(analyticsPath('/w/cafe-nord/week?date=2026-11-04#today')).toBe('/w/:workspace/week');
  });

  it('turns any other non-word segment into :id', () => {
    expect(analyticsPath('/share/AbC123xyz')).toBe('/share/:id');
    expect(analyticsPath('/ops/users/42')).toBe('/ops/users/:id');
  });
});

describe('ANALYTICS_EVENTS', () => {
  it('are snake_case names, the same on both clients', () => {
    expect(Object.values(ANALYTICS_EVENTS)).toEqual(['workspace_created', 'invitation_sent', 'hours_saved']);
  });
});
