import type { Href } from 'expo-router';
import type { IsoDate } from '@klokka/core';
import { fromIsoDate, toIsoDate } from '@/lib/dates';

// The job editor page (CHQ-185): `single` adds one job to a day (no date, no repeat), `full` is New job (a date and
// a repeat), `edit` changes the job `jobId` on that day.
export type JobEditorMode = 'single' | 'full' | 'edit';

export interface JobEditorParams {
  membershipId: string;
  date: IsoDate;
  mode: JobEditorMode;
  jobId?: string | undefined;
}

const MODES: readonly JobEditorMode[] = ['single', 'full', 'edit'];

export function jobEditorHref({ membershipId, date, mode, jobId }: JobEditorParams): Href {
  return { pathname: '/job', params: { membershipId, date, mode, ...(jobId ? { jobId } : {}) } };
}

const one = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

// The route's params, or null when any is missing or malformed (an old link, a hand-typed URL).
export function parseJobEditorParams(
  raw: Record<string, string | string[] | undefined>,
): JobEditorParams | null {
  const membershipId = one(raw.membershipId);
  const date = one(raw.date);
  const mode = MODES.find((m) => m === one(raw.mode));
  const jobId = one(raw.jobId);
  if (!membershipId || !mode || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (toIsoDate(fromIsoDate(date)) !== date) return null;
  if ((mode === 'edit') !== (jobId !== undefined)) return null;
  return { membershipId, date, mode, ...(jobId ? { jobId } : {}) };
}
