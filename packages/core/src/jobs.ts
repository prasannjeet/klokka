import type { IsoDate } from './month.ts';

export type JobStatus = 'done' | 'now' | 'later';

// Where a job stands against the workspace clock (CHQ-171, the team's jobs on both clients): before its start
// it is later, inside its hours now, after them done. A job without a start time has no status on its own day.
export function jobStatus(
  job: { startTime?: string | null; hours: number },
  date: IsoDate,
  today: IsoDate,
  minutesNow: number,
): JobStatus | null {
  if (date < today) return 'done';
  if (date > today) return 'later';
  if (!job.startTime) return null;
  const [h, m] = job.startTime.split(':').map(Number) as [number, number];
  const start = h * 60 + m;
  if (minutesNow < start) return 'later';
  return minutesNow < start + Math.round(job.hours * 60) ? 'now' : 'done';
}
