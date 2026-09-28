// Web-only presentation helpers on top of @klokka/core/format (which owns hours, money and months).
import { intlLocale, type Locale } from '@klokka/core';

export function formatDay(date: Date, locale: Locale, timeZone: string, withYear = false): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone,
  }).format(date);
}

export function formatDayTime(date: Date, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

// "Today 18:02" / "Yesterday 21:10" / "16 Sep" for notification and history rows.
export function formatWhen(
  date: Date,
  now: Date,
  locale: Locale,
  timeZone: string,
  words: { today: string; yesterday: string },
): string {
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(d);
  const time = new Intl.DateTimeFormat(intlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
  if (day(date) === day(now)) return `${words.today} ${time}`;
  if (day(date) === day(new Date(now.getTime() - 86_400_000))) return `${words.yesterday} ${time}`;
  return formatDay(date, locale, timeZone, date.getUTCFullYear() !== now.getUTCFullYear());
}
