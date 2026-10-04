'use client';

import { addMonths, compareDates, formatMonth, type IsoMonth } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { Icon } from './icons';

// Previous / next month; the future is not a place to go, except up to `latest` where work can be planned.
export function MonthNav({
  month,
  current,
  latest = current,
  onChange,
}: {
  month: IsoMonth;
  current: IsoMonth;
  latest?: IsoMonth;
  onChange: (month: IsoMonth) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const atCurrent = compareDates(month, latest) >= 0;
  return (
    <div className="mnav" role="group" aria-label={t('nav.month')}>
      <button
        type="button"
        aria-label={t('month.previousMonth')}
        onClick={() => onChange(addMonths(month, -1))}
      >
        <Icon name="chev-left" />
      </button>
      <span className="lbl" aria-live="polite">
        {formatMonth(month, locale, { capitalize: true })}
      </span>
      <button
        type="button"
        aria-label={t('month.nextMonth')}
        disabled={atCurrent}
        onClick={() => onChange(addMonths(month, 1))}
      >
        <Icon name="chev-right" />
      </button>
    </div>
  );
}
