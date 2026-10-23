'use client';

// The series a job belongs to, in the sentence both clients share ("Every month on the third Wednesday, from
// 18 November 2026, no end date"); a stopped series says so underneath.
import type { JobRecurrence } from '@klokka/api-client';
import { describeEnd, describeRecurrence } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { isoOf } from '@/lib/time';
import { Icon } from '../icons';

export function RecurrenceSummary({ series }: { series: JobRecurrence }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="recurrence-summary">
      <Icon name="refresh" />
      <span>
        <b>{describeRecurrence(series.recurrence, isoOf(series.firstDate), t, locale)}</b>
        {series.stopped ? <small>{describeEnd(series, t, locale)}</small> : null}
      </span>
    </div>
  );
}
