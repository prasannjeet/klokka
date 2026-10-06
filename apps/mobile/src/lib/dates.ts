import type { IsoDate, IsoMonth } from '@klokka/core';

// The generated client parses a `date` as LOCAL midnight and serialises it with local getters, so
// every Date that stands for a work date is built and read the same way here, and never through
// toISOString() (which would shift a day west of UTC).

export function fromIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(2000, 0, 1);
  date.setFullYear(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toIsoDate(date: Date): IsoDate {
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Today's date in the workspace time zone (days are cut by the workspace, not the phone).
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return toIsoDate(now);
  }
}

export function currentMonthIn(timeZone: string, now: Date = new Date()): IsoMonth {
  return todayIn(timeZone, now).slice(0, 7);
}

// Minutes since midnight now, in the workspace time zone (a job's start time is the workspace's clock).
export function minutesNowIn(timeZone: string, now: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return get('hour') * 60 + get('minute');
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}
