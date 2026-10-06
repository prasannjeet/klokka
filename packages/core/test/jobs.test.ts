import { describe, expect, it } from 'vitest';
import { jobStatus } from '../src/jobs.ts';

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
