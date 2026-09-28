// "170", "172,50", "172.5" as an hourly rate in the currency's major unit; anything else is null.
export function parseRate(input: string): number | null {
  const m = /^\s*(\d{1,6})(?:[.,](\d{1,2}))?\s*$/.exec(input);
  if (!m) return null;
  return Number(m[1]) + (m[2] ? Number(m[2].padEnd(2, '0')) / 100 : 0);
}
