// The example workspace drawn as UI on the page (Café Nord, week 39 of 2026, September 2026). Illustrative
// numbers, labelled as such on the page; the same people as every mockup (Nora the employer; Maria, Jonas,
// Ayla, Sam). Kept as numbers so each language formats them its own way (@klokka/core/format).

/** Avatar colour classes from the page CSS: secondary, then chart-2..4. */
export type AvatarTone = 'c1' | 'c2' | 'c3' | 'c4';

/** Hours for Monday..Sunday; null is a day off. */
export type WeekHours = readonly [
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
];

export type WeekRow = { readonly name: string; readonly tone: AvatarTone; readonly hours: WeekHours };

const maria: WeekRow = { name: 'Maria', tone: 'c1', hours: [4, 4, 6.5, 4, 4, null, null] };
const jonas: WeekRow = { name: 'Jonas', tone: 'c2', hours: [8, 8, 8, 8, 6, null, null] };
const ayla: WeekRow = { name: 'Ayla', tone: 'c3', hours: [null, 5, 5, null, 5, 6, null] };
const sam: WeekRow = { name: 'Sam', tone: 'c4', hours: [6, 6, null, 6, 8, 4, null] };

/** The hero stage: Nora is filling Maria's week (those cells pop in). */
export const stageRows: readonly WeekRow[] = [maria, jonas, ayla];
export const stageFilledRow = 0;

/** The employer section's grid, with Ayla's Wednesday open for editing. */
export const employerRows: readonly WeekRow[] = [maria, jonas, ayla, sam];
export const editing = { row: 2, day: 2, chips: [0.5, 1, 2, 4, 5, 8], selected: 5 } as const;

/** The quick chips in "How it works", step 02. */
export const logChips = { chips: [0.5, 1, 2, 4, 8], selected: 4 } as const;

export function weekTotal(rows: readonly WeekRow[]): number {
  return rows.reduce((sum, row) => sum + row.hours.reduce<number>((s, h) => s + (h ?? 0), 0), 0);
}

export function rowTotal(row: WeekRow): number {
  return row.hours.reduce<number>((s, h) => s + (h ?? 0), 0);
}

/** Hourly rates in the pay card (SEK). */
export const rates: Readonly<Record<string, number>> = { Maria: 170, Jonas: 190, Ayla: 170, Sam: 170 };
export const currency = 'SEK';

/** Insights, September 2026. Per employee sums to hoursThisMonth. */
export const insights = {
  hoursThisMonth: 486,
  projected: 612,
  empty: 2,
  labourCost: 85_660,
  spark: 'M0 30 L66 20 L133 14 L200 10',
  sparkArea: 'M0 40 L0 30 L66 20 L133 14 L200 10 L200 44 Z',
  perEmployee: [
    { name: 'Jonas', hours: 152, chart: 1 },
    { name: 'Maria', hours: 118, chart: 2 },
    { name: 'Sam', hours: 112, chart: 3 },
    { name: 'Ayla', hours: 104, chart: 4 },
  ],
  /** Share of the busiest weekday, Monday..Sunday; Friday is the top. */
  weekdayShare: [78, 74, 80, 82, 100, 46, 10],
  weekdayTop: 4,
} as const;

/** Maria's September on the phone: 1 September 2026 is a Tuesday. */
export type CalDay = { readonly day: number; readonly kind: 'none' | 'full' | 'short'; readonly flag?: true };
const full = new Set([1, 2, 3, 7, 8, 9, 10, 11, 14, 15, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30]);
const short = new Set([4, 16, 19]);
export const calendarLeadingBlanks = 1;
export const calendar: readonly CalDay[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const kind = full.has(day) ? 'full' : short.has(day) ? 'short' : 'none';
  return day === 22 ? { day, kind, flag: true } : { day, kind };
});
