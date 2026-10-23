// The job editor's pages (CHQ-185): `single` adds one job to the day it came from (no date, no repeat), `full` is
// New job (a date and a repeat), `edit` changes one job. `back` is where Cancel, Save and Discard return to: the page
// the editor was opened from, only ever a path inside the same workspace.
import type { IsoDate } from '@klokka/core';

export type JobEditorMode = 'single' | 'full' | 'edit';
export type NewJobMode = Exclude<JobEditorMode, 'edit'>;

export type JobEditorLink = { member: string; date: IsoDate; back: string } & (
  { mode: NewJobMode } | { mode: 'edit'; jobId: string }
);

export function jobEditorHref(slug: string, p: JobEditorLink): string {
  const query = new URLSearchParams({ member: p.member, date: p.date });
  if (p.mode !== 'edit') query.set('mode', p.mode);
  query.set('back', p.back);
  const path = p.mode === 'edit' ? `jobs/${encodeURIComponent(p.jobId)}` : 'jobs/new';
  return `/w/${slug}/${path}?${query.toString()}`;
}

// A path inside this workspace, or its week view. Anything else (another workspace, `//host`, `https://...`) is
// refused, so a crafted link cannot send the employer somewhere else after saving.
export function safeBack(back: string | null | undefined, slug: string): string {
  const prefix = `/w/${slug}/`;
  if (back && back.startsWith(prefix) && !/[\\\s]/.test(back)) return back;
  return `/w/${slug}/week`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// A real calendar date (2026-02-30 is not one).
export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

type SearchParams = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

export interface EditorParams {
  member: string;
  date: IsoDate;
  back: string | undefined;
}

// The search params of either editor page, or null when one is missing or malformed (an old or hand-typed URL).
export function parseEditorParams(search: SearchParams): EditorParams | null {
  const member = one(search.member);
  const date = one(search.date);
  if (!member || !date || !isIsoDate(date)) return null;
  return { member, date, back: one(search.back) };
}

export function parseNewJobMode(search: SearchParams): NewJobMode | null {
  const mode = one(search.mode);
  return mode === 'single' || mode === 'full' ? mode : null;
}
