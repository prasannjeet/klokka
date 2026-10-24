import { describe, expect, it } from 'vitest';
import { jobLabel, jobLabels, jobStatus } from '../src/jobs.ts';

describe('jobStatus (CHQ-171)', () => {
  const job = { startTime: '08:00', hours: 4 };

  it('is later before the start, now inside the hours and done after them', () => {
    expect(jobStatus(job, '2026-10-07', '2026-10-07', 7 * 60 + 59)).toBe('later');
    expect(jobStatus(job, '2026-10-07', '2026-10-07', 8 * 60)).toBe('now');
    expect(jobStatus(job, '2026-10-07', '2026-10-07', 11 * 60 + 59)).toBe('now');
    expect(jobStatus(job, '2026-10-07', '2026-10-07', 12 * 60)).toBe('done');
  });

  it('follows the date on other days, and has none today without a start time', () => {
    expect(jobStatus(job, '2026-10-06', '2026-10-07', 0)).toBe('done');
    expect(jobStatus(job, '2026-10-08', '2026-10-07', 23 * 60)).toBe('later');
    expect(jobStatus({ startTime: null, hours: 4 }, '2026-10-07', '2026-10-07', 600)).toBeNull();
  });
});

describe('jobLabel and jobLabels (CHQ-191)', () => {
  const cafe = { name: 'Café Nord' };

  it('is the title, else the place, else null', () => {
    expect(jobLabel({ title: 'Window cleaning', location: cafe })).toBe('Window cleaning');
    expect(jobLabel({ title: null, location: cafe })).toBe('Café Nord');
    expect(jobLabel({ location: cafe })).toBe('Café Nord');
    expect(jobLabel({ title: null, location: null })).toBeNull();
    expect(jobLabel({})).toBeNull();
  });

  it('treats a blank title as none and trims what it shows', () => {
    expect(jobLabel({ title: '   ', location: cafe })).toBe('Café Nord');
    expect(jobLabel({ title: '  Windows ', location: null })).toBe('Windows');
    expect(jobLabel({ title: '', location: { name: ' ' } })).toBeNull();
  });

  it('lists each label once, in order, leaving out jobs with neither', () => {
    expect(
      jobLabels([
        { title: 'Window cleaning', location: cafe },
        { location: cafe },
        { title: null, location: null },
        { title: 'Window cleaning' },
        { location: { name: 'Kafé Syd' } },
      ]),
    ).toEqual(['Window cleaning', 'Café Nord', 'Kafé Syd']);
    expect(jobLabels([])).toEqual([]);
  });
});
