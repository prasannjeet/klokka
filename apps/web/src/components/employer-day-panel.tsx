'use client';

// The selected day on the employer's Employee view (CHQ-145): the hours, the note, the whole change
// history and, for a day without hours, the way to the week grid. Same shape as the employee's day panel.
import Link from 'next/link';
import type { MemberMonthDay } from '@klokka/api-client';
import { formatDate, formatHours, isoWeek, type IsoDate } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { firstName } from '@/lib/visual';
import type { WorkspaceView } from '@/lib/workspace';
import { EntryHistory } from './entry-history';
import { Icon } from './icons';
import { Money } from './money';

export function EmployerDayPanel({
  ws,
  day,
  date,
  personName,
  currency,
}: {
  ws: WorkspaceView;
  day: MemberMonthDay | null;
  date: IsoDate | null;
  personName: string;
  currency: string;
}) {
  const t = useT();
  const locale = useLocale();
  if (!date) {
    return (
      <div className="card pad dd" id="day-panel">
        <p className="muted">{t('web.month.pickDay')}</p>
      </div>
    );
  }
  const title = formatDate(date, locale, 'weekdayDayMonth');
  return (
    <div className="card pad dd" id="day-panel" aria-live="polite">
      <div className="dd-head">
        <div>
          <h2>{title.charAt(0).toLocaleUpperCase() + title.slice(1)}</h2>
          <p className="sub">{t('web.dayList.dayOf', { week: isoWeek(date).week, name: personName })}</p>
        </div>
      </div>
      {day?.hours != null ? (
        <>
          <div className="big">
            <span className="num">{formatHours(day.hours, locale, { unit: false })}</span>
            <small>{t('common.hourUnit')}</small>
            <Money amount={day.earnings} currency={currency} showPay={ws.showPay} />
          </div>
          {day.note ? (
            <div className="note-row">
              <Icon name="note" />
              <div>
                {day.note}
                {day.updatedBy ? (
                  <span>{t('entry.note', { name: firstName(day.updatedBy.name) })}</span>
                ) : null}
              </div>
            </div>
          ) : null}
          {day.entryId ? (
            <>
              <h3>{t('entry.history')}</h3>
              <EntryHistory workspaceId={ws.id} entryId={day.entryId} timeZone={ws.timezone} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <p className="empty-day">{t('entry.nothingYet')}</p>
          <div className="acts">
            <Link className="btn btn-ghost btn-sm" href={`/w/${ws.slug}/week?d=${date}`}>
              <Icon name="grid" />
              {t('web.dayList.logInGrid')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
