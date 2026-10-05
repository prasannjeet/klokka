'use client';

import { Weekday, type JobRecurrence } from '@klokka/api-client';
import { formatDate } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { isoOf } from '@/lib/time';
import { Icon } from '../icons';

export function RecurrenceSummary({ series }: { series: JobRecurrence }) {
  const t = useT();
  const locale = useLocale();
  const rule = series.recurrence;
  const weekly = rule.frequency === 'WEEKLY';
  const names = Object.values(Weekday);
  const days = names
    .filter((d) => rule.weekdays?.has(d))
    .map((d) =>
      new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 9, 5 + names.indexOf(d))),
    )
    .join(', ');
  const period = t(weekly ? 'recurrence.weeks' : 'recurrence.months', { count: rule.interval });
  const label = weekly
    ? t('recurrence.weeklySummary', { period, days })
    : rule.lastDayOfMonth
      ? t('recurrence.monthlyLastSummary', { period })
      : t('recurrence.monthlySummary', { period, day: Number(isoOf(series.firstDate).slice(8)) });
  return (
    <div className="recurrence-summary">
      <Icon name="refresh" />
      <span>
        <b>{label}</b>
        <small>
          {series.stopped
            ? t('recurrence.stopped')
            : t('recurrence.until', { date: formatDate(isoOf(series.endDate), locale, 'long') })}
        </small>
      </span>
    </div>
  );
}
