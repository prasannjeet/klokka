// "Now" in a workspace's time zone: work dates are dates in that zone (packages/core/src/month.ts), so
// "today", the current week and the current month all come from here, never from the browser's zone.
import type { IsoDate, IsoMonth } from '@klokka/core';

function parts(date: Date, timeZone: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
}

export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  const p = parts(now, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function monthIn(timeZone: string, now: Date = new Date()): IsoMonth {
  return todayIn(timeZone, now).slice(0, 7);
}

export function clockIn(timeZone: string, now: Date = new Date()): { h: number; m: number; s: number } {
  const p = parts(now, timeZone);
  return { h: Number(p.hour), m: Number(p.minute), s: Number(p.second) + now.getMilliseconds() / 1000 };
}

// A Date from the generated client (a work date parsed as UTC midnight) back to its ISO date. The generated
// client leaves arrays of dates as strings at runtime while typing them as Date[] (WorkspaceInsights
// nothingLoggedDays; docs/CONTRACT_REQUESTS.md), so strings are accepted too.
export function isoOf(date: Date | string): IsoDate {
  return typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
}

// An ISO date as the Date the generated client wants for `date`-format parameters.
export function dateOf(iso: IsoDate): Date {
  return new Date(`${iso}T00:00:00Z`);
}
