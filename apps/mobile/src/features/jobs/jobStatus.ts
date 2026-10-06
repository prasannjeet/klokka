import type { Job } from '@klokka/api-client';
import type { IsoDate } from '@klokka/core';

export type JobStatus = 'done' | 'now' | 'later';

// Where a job stands against the workspace clock (CHQ-171, Home and the team day): before its start it is
// later, inside its hours now, after them done. A job without a start time has no status on its own day.
export function jobStatus(
  job: Pick<Job, 'startTime' | 'hours'>,
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
