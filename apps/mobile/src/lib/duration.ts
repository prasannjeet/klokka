import { splitHours, type Translator } from '@klokka/core';

// "7 h 15 min" everywhere a person reads a duration (CHQ-155); the API keeps decimal hours (7.25).
export function formatDuration(hours: number, t: Translator): string {
  const p = splitHours(hours, 'NONE');
  if (p.minutes === 0) return t('common.hoursValue', { hours: String(p.hours) });
  if (p.hours === 0) return t('common.durationM', { minutes: String(p.minutes) });
  return t('common.durationHm', { hours: String(p.hours), minutes: String(p.minutes) });
}
