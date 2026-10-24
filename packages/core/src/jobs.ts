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

// The fields a job's label reads (the contract's Job fits it).
export type JobLike = { title?: string | null; location?: { name: string } | null };

// A job's main label on every surface (CHQ-191): its title, else its place's name, else null (the caller shows
// "1 job" or "No place"). The API's push, digest and workbook use the same rule (JobLabels.java).
export function jobLabel(job: JobLike): string | null {
  const title = job.title?.trim();
  if (title) return title;
  const place = job.location?.name.trim();
  return place ? place : null;
}

// The distinct labels of a day's jobs, in order (titles and places alike); jobs with neither are left out.
export function jobLabels(jobs: readonly JobLike[]): string[] {
  const out: string[] = [];
  for (const job of jobs) {
    const label = jobLabel(job);
    if (label !== null && !out.includes(label)) out.push(label);
  }
  return out;
}
