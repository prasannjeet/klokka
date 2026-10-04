'use client';

// The employer's list of an employee's days (CHQ-122, redrawn in CHQ-145 as a clean list): newest first,
// one line per day with the date, the note, who changed it last and when, the flag if any, and the hours.
// A line selects the day; its history and flag live in the day panel next to the calendar.
import type { MemberMonthDay } from '@klokka/api-client';
import { formatDate, formatHours, formatWeekday, isoWeekdayIndex, type IsoDate } from '@klokka/core';
import { formatDayTime } from '@/lib/format';
import { placesOf } from '@/lib/jobs';
import { useLocale, useT } from '@/lib/i18n';
import { isoOf } from '@/lib/time';
import { firstName } from '@/lib/visual';
import { Icon } from './icons';
import { Money } from './money';
import './jobs/jobs.css';

export function DayList({
  days,
  timeZone,
  showPay,
  currency,
  selected,
  onSelect,
}: {
  days: readonly MemberMonthDay[];
  timeZone: string;
  showPay: boolean;
  currency: string;
  selected: IsoDate | null;
  onSelect: (date: IsoDate) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const rows = days.filter((d) => d.hours != null).sort((a, b) => (isoOf(a.date) < isoOf(b.date) ? 1 : -1));

  return (
    <ol className="daylist">
      {rows.map((day) => {
        const date = isoOf(day.date);
        const flagged = day.flag?.status === 'OPEN';
        const edits = Math.max(0, day.changeCount - 1);
        const who =
          day.updatedBy && day.updatedAt
            ? t(edits > 0 ? 'web.dayList.changedBy' : 'web.dayList.loggedBy', {
                name: firstName(day.updatedBy.name),
                time: formatDayTime(day.updatedAt, locale, timeZone),
              })
            : null;
        return (
          <li key={date} id={`day-${date}`} className={flagged ? 'flagged' : undefined}>
            <button
              type="button"
              className="row"
              aria-current={selected === date ? 'true' : undefined}
              aria-label={t('web.dayList.select', {
                date: formatDate(date, locale, 'weekdayDayMonth'),
                hours: formatHours(day.hours ?? 0, locale),
              })}
              onClick={() => onSelect(date)}
            >
              <span className="when" aria-hidden="true">
                {formatWeekday(isoWeekdayIndex(date), locale, 'short')}
                <b>{formatDate(date, locale, 'day')}</b>
              </span>
              <span className="what">
                {placesOf(day.jobs).length > 0 ? (
                  <span className="places">
                    <Icon name="pin" />
                    {placesOf(day.jobs).join(', ')}
                  </span>
                ) : null}
                {day.note ? <span className="note">{day.note}</span> : null}
                <span className="meta">
                  {who ? <span>{who}</span> : null}
                  {day.jobs.length > 1 ? <span>{t('jobs.jobCount', { count: day.jobs.length })}</span> : null}
                  {edits > 0 ? <span>{t('web.month.editedTimes', { count: edits })}</span> : null}
                  {flagged ? (
                    <span className="pill bad">
                      <Icon name="flag" />
                      {t('overview.openFlag')}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="h">
                {formatHours(day.hours ?? 0, locale, { unit: false })}
                <small>{t('common.hourUnit')}</small>
                <Money block amount={day.earnings} currency={currency} showPay={showPay} />
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
