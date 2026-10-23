// How a recurring job reads to a person (CHQ-186): the defaults the monthly rule starts from and the one
// sentence both clients show for a rule and a series. Presentation only: which dates a rule produces is the
// API's job (RecurrencePattern, the preview endpoint), D9. The types are narrow structural copies of the
// generated JobRecurrenceRule / JobRecurrence so core stays dependency free; the clients pass the generated
// objects as they are (dates as local-midnight Date, weekdays as a Set).
import { formatDate, formatWeekday } from './format.ts';
import type { Locale, Translator } from './i18n/index.ts';
import { WEEKDAYS, weekdayOf, type IsoDate, type Weekday } from './month.ts';

export type RecurrenceFrequency = 'WEEKLY' | 'MONTHLY';
export type MonthlyMode = 'DAY_OF_MONTH' | 'WEEKDAY_OF_MONTH';
export type WeekOfMonth = 'FIRST' | 'SECOND' | 'THIRD' | 'FOURTH' | 'LAST';

export const WEEKS_OF_MONTH: readonly WeekOfMonth[] = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'LAST'];

// How far ahead an open-ended series is planned (the API's `klokka.recurrence.horizon-months` default), for the
// "No end date" hint.
export const RECURRENCE_HORIZON_MONTHS = 12;

// A day of month of 31 means "the last day" (shorter months clamp), as on the API.
export const LAST_DAY_OF_MONTH = 31;

export interface RecurrenceRuleLike {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays?: ReadonlySet<Weekday> | readonly Weekday[];
  lastDayOfMonth?: boolean;
  monthlyBy?: MonthlyMode;
  dayOfMonth?: number;
  weekOfMonth?: WeekOfMonth;
  weekday?: Weekday;
  endDate?: Date | IsoDate;
  periodCount?: number;
}

export interface RecurrenceLike {
  firstDate: Date | IsoDate;
  recurrence: RecurrenceRuleLike;
  endDate: Date | IsoDate;
  stopped: boolean;
  openEnded: boolean;
}

export interface MonthlyDefaults {
  dayOfMonth: number;
  weekOfMonth: WeekOfMonth;
  weekday: Weekday;
}

// The generated client gives `date` fields as local midnight, so the local calendar fields are the date.
function isoOf(date: Date | IsoDate): IsoDate {
  if (typeof date === 'string') return date.slice(0, 10);
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Both monthly modes prefilled from the first date: 24 Oct 2026 is day 24 and the fourth Saturday. A fifth
// weekday (day 29 to 31, always in the month's last seven days) becomes LAST, since not every month has one.
export function defaultMonthly(date: IsoDate): MonthlyDefaults {
  const day = Number(date.slice(8, 10));
  const nth = Math.ceil(day / 7);
  return {
    dayOfMonth: day,
    weekOfMonth: nth >= 5 ? 'LAST' : (WEEKS_OF_MONTH[nth - 1] as WeekOfMonth),
    weekday: weekdayOf(date),
  };
}

function weekdaysOf(rule: RecurrenceRuleLike, firstDate: IsoDate): Weekday[] {
  const chosen = new Set<Weekday>(rule.weekdays ?? []);
  const ordered = WEEKDAYS.filter((d) => chosen.has(d));
  return ordered.length > 0 ? ordered : [weekdayOf(firstDate)];
}

function describeRule(rule: RecurrenceRuleLike, firstDate: IsoDate, t: Translator, locale: Locale): string {
  const count = rule.interval;
  if (rule.frequency === 'WEEKLY') {
    const days = weekdaysOf(rule, firstDate)
      .map((d) => formatWeekday(WEEKDAYS.indexOf(d), locale, 'short'))
      .join(', ');
    return t('recurrence.sentence.weekly', { count, days });
  }
  if (rule.monthlyBy === 'WEEKDAY_OF_MONTH') {
    const defaults = defaultMonthly(firstDate);
    const ordinal = t(`recurrence.ordinal.${rule.weekOfMonth ?? defaults.weekOfMonth}`);
    const weekday = t(`recurrence.weekdayInMonth.${rule.weekday ?? defaults.weekday}`);
    return t('recurrence.sentence.monthlyWeekday', { count, ordinal, weekday });
  }
  const day =
    rule.dayOfMonth ?? (rule.lastDayOfMonth ? LAST_DAY_OF_MONTH : defaultMonthly(firstDate).dayOfMonth);
  return day >= LAST_DAY_OF_MONTH
    ? t('recurrence.sentence.monthlyLast', { count })
    : t('recurrence.sentence.monthlyDay', { count, day });
}

// "Every month on the third Wednesday, from 18 November 2026, no end date", "Every 2 weeks on Mon, Wed,
// until 31 March 2027", "Every month on day 15, for 6 months".
export function describeRecurrence(
  rule: RecurrenceRuleLike,
  firstDate: IsoDate,
  t: Translator,
  locale: Locale,
): string {
  const text = describeRule(rule, firstDate, t, locale);
  if (rule.periodCount !== undefined) {
    const period = t(rule.frequency === 'WEEKLY' ? 'recurrence.weeks' : 'recurrence.months', {
      count: rule.periodCount,
    });
    return t('recurrence.sentence.forCount', { rule: text, period });
  }
  if (rule.endDate !== undefined) {
    return t('recurrence.sentence.until', {
      rule: text,
      date: formatDate(isoOf(rule.endDate), locale, 'dayMonthYear'),
    });
  }
  const from = t('recurrence.sentence.from', {
    rule: text,
    date: formatDate(firstDate, locale, 'dayMonthYear'),
  });
  return t('recurrence.sentence.noEnd', { rule: from });
}

// The end line on a job card: "Stopped", "No end date" or "Ends 31 March 2027".
export function describeEnd(series: RecurrenceLike, t: Translator, locale: Locale): string {
  if (series.stopped) return t('recurrence.stopped');
  if (series.openEnded) return t('recurrence.endsNever');
  return t('recurrence.until', { date: formatDate(isoOf(series.endDate), locale, 'dayMonthYear') });
}
