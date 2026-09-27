// Intl formatters per locale for the numbers both clients show: hours ("22,5 h" / "22.5 h"), money in the
// workspace currency ("85 660 kr" / "SEK 85,660" style per locale), dates, deltas and percentages.
// Hermes ships Intl.NumberFormat and DateTimeFormat, so this file is safe on the phone.
import type { Locale } from './i18n/index.ts';
import { parseMonth, type IsoDate, type IsoMonth } from './month.ts';

const INTL_LOCALE: Record<Locale, string> = { sv: 'sv-SE', en: 'en-GB' };

export function intlLocale(locale: Locale): string {
  return INTL_LOCALE[locale];
}

export function formatNumber(value: number, locale: Locale, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

// "22,5 h" (sv) / "22.5 h" (en). `unit: false` gives just the number.
export function formatHours(hours: number, locale: Locale, options: { unit?: boolean } = {}): string {
  const n = formatNumber(hours, locale, 2);
  return options.unit === false ? n : `${n} h`;
}

// "+31 h" / "-2,5 h" / "0 h": the "vs last month" figures.
export function formatHoursDelta(delta: number, locale: Locale): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '\u2212' : '';
  return `${sign}${formatHours(Math.abs(delta), locale)}`;
}

// "+3 %" (sv) / "+3%" (en); one decimal only when needed.
export function formatPercentDelta(percent: number, locale: Locale): string {
  const sign = percent > 0 ? '+' : percent < 0 ? '\u2212' : '';
  const n = formatNumber(Math.abs(percent), locale, 1);
  return locale === 'sv' ? `${sign}${n} %` : `${sign}${n}%`;
}

export function formatPercent(percent: number, locale: Locale): string {
  const n = formatNumber(percent, locale, 1);
  return locale === 'sv' ? `${n} %` : `${n}%`;
}

// Money in the workspace currency's major unit. Whole amounts drop the decimals ("85 660 kr"), fractional
// amounts keep two. Swedish shows the krona as "kr"; other locales use the ISO code or symbol Intl picks.
export function formatMoney(amount: number, currency: string, locale: Locale): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency,
    currencyDisplay: locale === 'sv' ? 'narrowSymbol' : 'symbol',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// "170 kr/h" style rate labels; the unit word comes from the catalogue (`common.perHour`).
export function formatRate(rate: number, currency: string, locale: Locale): string {
  return formatMoney(rate, currency, locale);
}

export type DateStyle = 'day' | 'weekdayDay' | 'weekdayDayMonth' | 'dayMonth' | 'long' | 'iso';

const DATE_OPTIONS: Record<Exclude<DateStyle, 'iso'>, Intl.DateTimeFormatOptions> = {
  day: { day: 'numeric' },
  weekdayDay: { weekday: 'short', day: 'numeric' },
  weekdayDayMonth: { weekday: 'long', day: 'numeric', month: 'long' },
  dayMonth: { day: 'numeric', month: 'short' },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
};

function utcDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function formatDate(date: IsoDate, locale: Locale, style: DateStyle = 'dayMonth'): string {
  if (style === 'iso') return date;
  return new Intl.DateTimeFormat(intlLocale(locale), { ...DATE_OPTIONS[style], timeZone: 'UTC' }).format(
    utcDate(date),
  );
}

// "September 2026" (en) / "september 2026" (sv); `capitalize` upper-cases the first letter for headings.
export function formatMonth(
  month: IsoMonth,
  locale: Locale,
  options: { year?: boolean; capitalize?: boolean } = {},
): string {
  const { year, month: m } = parseMonth(month);
  const text = new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'long',
    ...(options.year === false ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, m - 1, 1)));
  return options.capitalize ? text.charAt(0).toLocaleUpperCase(intlLocale(locale)) + text.slice(1) : text;
}

export function formatMonthName(month: IsoMonth, locale: Locale, capitalize = true): string {
  return formatMonth(month, locale, { year: false, capitalize });
}

export function formatWeekday(
  weekdayIndex: number,
  locale: Locale,
  style: 'short' | 'long' | 'narrow' = 'short',
): string {
  // 2024-01-01 is a Monday.
  const d = new Date(Date.UTC(2024, 0, 1 + weekdayIndex));
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: style, timeZone: 'UTC' }).format(d);
}

export function formatTime(isoDateTime: string, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { hour: '2-digit', minute: '2-digit', timeZone }).format(
    new Date(isoDateTime),
  );
}

// ISO week label, "W39" for chart axes.
export function formatWeekLabel(week: number): string {
  return `W${week}`;
}
