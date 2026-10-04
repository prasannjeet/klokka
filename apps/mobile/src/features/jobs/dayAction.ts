import type { Entry, Job } from '@klokka/api-client';

// Home's plus and the week grid (CHQ-156): a day with two or more jobs opens the day page, where each job is
// its own card; otherwise the job sheet edits the day's one job, or adds the first.
export type DayAction = { kind: 'day' } | { kind: 'sheet'; job: Job | null; dayHours: number };

export function dayActionFor(entry: Entry | null | undefined): DayAction {
  const jobs = entry?.jobs ?? [];
  if (jobs.length > 1) return { kind: 'day' };
  return { kind: 'sheet', job: jobs[0] ?? null, dayHours: entry?.hours ?? 0 };
}
