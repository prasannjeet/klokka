'use client';

// The employer's list of an employee's days (CHQ-122): newest first, who logged it and when, the note, the
// hours and, on demand, the full change history (CHQ-119).
import { useState } from 'react';
import type { MemberMonthDay } from '@klokka/api-client';
import { formatDate, formatHours, formatWeekday, isoWeekdayIndex, type IsoDate } from '@klokka/core';
import { formatDayTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { isoOf } from '@/lib/time';
import { firstName } from '@/lib/visual';
import { EntryHistory } from './entry-history';
import { Icon } from './icons';
import { Money } from './money';

export function DayList({
  workspaceId,
  days,
  timeZone,
  showPay,
  currency,
  highlighted,
}: {
  workspaceId: string;
  days: readonly MemberMonthDay[];
  timeZone: string;
  showPay: boolean;
  currency: string;
  highlighted: IsoDate | null;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const rows = days.filter((d) => d.hours != null).sort((a, b) => (isoOf(a.date) < isoOf(b.date) ? 1 : -1));

  return (
    <div className="hgrid dlist" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
      {rows.map((day) => {
        const date = isoOf(day.date);
        const isOpen = open.has(date) || highlighted === date;
        const edits = Math.max(0, day.changeCount - 1);
        return (
          <div
            key={date}
            id={`day-${date}`}
            className={day.flag?.status === 'OPEN' ? 'drow flagged' : 'drow'}
            style={highlighted === date ? { boxShadow: 'inset 0 0 0 2px var(--focus)' } : undefined}
          >
            <div className="dn">
              <b>{formatDate(date, locale, 'day')}</b>
              {formatWeekday(isoWeekdayIndex(date), locale, 'short')}
            </div>
            <div>
              <div className="meta">
                {day.updatedBy && day.updatedAt ? (
                  <span>
                    {t('entry.loggedItAt', {
                      name: firstName(day.updatedBy.name),
                      time: formatDayTime(day.updatedAt, locale, timeZone),
                    })}
                  </span>
                ) : null}
                {edits > 0 ? <span>{t('web.month.editedTimes', { count: edits })}</span> : null}
                {day.flag?.status === 'OPEN' ? (
                  <span className="pill warn">
                    <Icon name="flag" />
                    {t('overview.openFlag')}
                  </span>
                ) : null}
              </div>
              {day.note ? <p className="note">{day.note}</p> : null}
            </div>
            <div className="h">
              {formatHours(day.hours ?? 0, locale, { unit: false })}
              <small>{t('common.hourUnit')}</small>
              <Money block amount={day.earnings} currency={currency} showPay={showPay} />
            </div>
            {day.entryId ? (
              <details
                open={isOpen}
                onToggle={(e) => {
                  const nowOpen = e.currentTarget.open;
                  setOpen((prev) => {
                    const next = new Set(prev);
                    if (nowOpen) next.add(date);
                    else next.delete(date);
                    return next;
                  });
                }}
              >
                <summary>
                  {t('entry.history')}
                  <Icon name="chev-down" />
                </summary>
                {isOpen ? (
                  <EntryHistory workspaceId={workspaceId} entryId={day.entryId} timeZone={timeZone} />
                ) : null}
              </details>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
