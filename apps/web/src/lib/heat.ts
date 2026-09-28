// The calendar heat-map's five steps (CHQ-123): how full a day is against the workspace's default day
// length, so a 7.5 h day in a café and an 8 h day in an office both read as a full day. The mobile
// calendar uses the same thresholds.
export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export function heatLevel(hours: number | null | undefined, dayLength: number): HeatLevel {
  if (hours == null || hours <= 0) return 0;
  const full = dayLength > 0 ? dayLength : 8;
  const share = hours / full;
  if (share >= 1) return 4;
  if (share >= 0.7) return 3;
  if (share >= 0.4) return 2;
  return 1;
}
