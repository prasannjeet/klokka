import type { Entry } from '@klokka/api-client';

// Tapping a day in the week grid (CHQ-156): a day with jobs opens the day page, where each job is its own card and
// another can be added; an empty day opens the job editor for a single job on it (CHQ-185). A day's one job is never
// edited from here, since that read as "adding" a second job overwrote the first.
export type DayAction = { kind: 'day' } | { kind: 'single' };

export function dayActionFor(entry: Entry | null | undefined): DayAction {
  return (entry?.jobs ?? []).length > 0 ? { kind: 'day' } : { kind: 'single' };
}
