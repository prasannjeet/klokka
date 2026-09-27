// Hours input and rounding, shared by the week grid (web), the add-hours sheet (mobile) and tests.
// The API stores hours as a decimal with two places; these helpers only shape what a person types and
// what a screen shows. Totals and averages come from the API (docs/DECISIONS.md D9).

export const HOURS_MIN = 0;
export const HOURS_MAX = 24;
export const HOURS_STEP = 0.5;
export const QUICK_CHIPS = [0.5, 1, 2, 4, 8] as const;

export type Rounding = 'NONE' | 'QUARTER' | 'HALF';
export const ROUNDINGS: readonly Rounding[] = ['NONE', 'QUARTER', 'HALF'];

const INPUT = /^\s*(\d{1,2})(?:[.,](\d{1,2}))?\s*(?:h|t|tim|timmar|hours?)?\s*$/i;

// "2,5", "2.5", " 3 ", "7,5 h" become numbers; anything else (negative, letters, 25) is null so the caller
// can show `entry.invalidHours` instead of guessing. Two decimals max, matching the API.
export function parseHours(input: string | null | undefined): number | null {
  if (input == null) return null;
  const m = INPUT.exec(input);
  if (!m) return null;
  const whole = Number(m[1]);
  const fraction = m[2] ? Number(m[2].padEnd(2, '0')) / 100 : 0;
  const value = whole + fraction;
  if (value < HOURS_MIN || value > HOURS_MAX) return null;
  return roundToCents(value);
}

export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

// The workspace rounding rule, applied when an entry is saved (settings.roundingHint): half-up to the
// nearest quarter or half hour, capped at 24.
export function roundHours(hours: number, rule: Rounding): number {
  if (!Number.isFinite(hours)) throw new RangeError(`roundHours: not a number: ${hours}`);
  const step = rule === 'QUARTER' ? 0.25 : rule === 'HALF' ? 0.5 : null;
  const rounded = step === null ? roundToCents(hours) : Math.round(hours / step + Number.EPSILON) * step;
  return Math.min(HOURS_MAX, Math.max(HOURS_MIN, roundToCents(rounded)));
}

export function isValidHours(value: number): boolean {
  return Number.isFinite(value) && value >= HOURS_MIN && value <= HOURS_MAX && roundToCents(value) === value;
}

// Nudge by half an hour (the sheet's stepper), staying inside the range.
export function stepHours(hours: number, direction: 1 | -1, step = HOURS_STEP): number {
  return Math.min(HOURS_MAX, Math.max(HOURS_MIN, roundToCents(hours + direction * step)));
}

export function sumHours(values: readonly number[]): number {
  return roundToCents(values.reduce((acc, v) => acc + v, 0));
}
