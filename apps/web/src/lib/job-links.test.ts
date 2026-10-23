import { describe, expect, it } from 'vitest';
import { isIsoDate, jobEditorHref, parseEditorParams, parseNewJobMode, safeBack } from './job-links';

describe('job editor links', () => {
  it('builds the new-job and the edit hrefs with where to return to', () => {
    expect(
      jobEditorHref('kafe-nord', {
        member: 'm1',
        date: '2026-10-24',
        mode: 'single',
        back: '/w/kafe-nord/month?member=m1&day=2026-10-24',
      }),
    ).toBe(
      '/w/kafe-nord/jobs/new?member=m1&date=2026-10-24&mode=single&back=%2Fw%2Fkafe-nord%2Fmonth%3Fmember%3Dm1%26day%3D2026-10-24',
    );
    expect(
      jobEditorHref('kafe-nord', {
        member: 'm1',
        date: '2026-10-24',
        mode: 'edit',
        jobId: 'j1',
        back: '/w/kafe-nord/month',
      }),
    ).toBe('/w/kafe-nord/jobs/j1?member=m1&date=2026-10-24&back=%2Fw%2Fkafe-nord%2Fmonth');
  });

  it('returns only to a path inside the same workspace', () => {
    expect(safeBack('/w/kafe-nord/month?member=m1', 'kafe-nord')).toBe('/w/kafe-nord/month?member=m1');
    expect(safeBack('/w/kafe-nord/employees', 'kafe-nord')).toBe('/w/kafe-nord/employees');
    for (const bad of [
      null,
      undefined,
      '',
      '//evil.example/w/kafe-nord/',
      'https://evil.example/w/kafe-nord/month',
      '/w/other/month',
      '/w/kafe-nordic/month',
      '/w/kafe-nord',
      '/w/kafe-nord/\\evil.example',
      'javascript:alert(1)',
    ]) {
      expect(safeBack(bad, 'kafe-nord')).toBe('/w/kafe-nord/week');
    }
  });

  it('parses the editor params and refuses malformed ones', () => {
    expect(parseEditorParams({ member: 'm1', date: '2026-10-24', back: '/w/a/month' })).toEqual({
      member: 'm1',
      date: '2026-10-24',
      back: '/w/a/month',
    });
    expect(parseEditorParams({ member: 'm1', date: '2026-02-30' })).toBeNull();
    expect(parseEditorParams({ member: 'm1', date: '24/10/2026' })).toBeNull();
    expect(parseEditorParams({ date: '2026-10-24' })).toBeNull();
    expect(parseEditorParams({ member: ['m1', 'm2'], date: '2026-10-24' })).toBeNull();
    expect(parseNewJobMode({ mode: 'full' })).toBe('full');
    expect(parseNewJobMode({ mode: 'edit' })).toBeNull();
    expect(parseNewJobMode({})).toBeNull();
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
  });
});
