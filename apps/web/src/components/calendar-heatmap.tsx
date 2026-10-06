'use client';

// The month as a heat-map (CHQ-123, mockups "Calendar"): a 7-column CSS grid of real buttons, one per day,
// coloured by how full the day is. Every day says its hours in its accessible name; notes and flags are
// marked. Days outside the month keep the grid square but are hidden. Every day opens, future ones too; a
// future day with hours is planned work (CHQ-156) and drawn dashed.
import type { MemberMonthDay, WeekStart } from '@klokka/api-client';
import {
  formatDate,
  formatHours,
  formatWeekday,
  weekdayOrder,
  weeksOf,
  WEEKDAYS,
  type IsoDate,
  type IsoMonth,
} from '@klokka/core';
import { heatLevel } from '@/lib/heat';
import { useLocale, useT } from '@/lib/i18n';
import { isoOf } from '@/lib/time';
import './jobs/jobs.css';

// A member's day, or the team's (CHQ-171): the date and its hours, and for a member the note, jobs and flag.
export type HeatDay = Pick<MemberMonthDay, 'date' | 'hours'> &
  Partial<Pick<MemberMonthDay, 'note' | 'jobs' | 'flag'>>;

export function CalendarHeatmap({
  month,
  days,
  weekStart,
  dayLength,
  today,
  selected,
  onSelect,
  label,
  markers,
}: {
  month: IsoMonth;
  days: readonly HeatDay[];
  weekStart: WeekStart;
  dayLength: number;
  today: IsoDate;
  selected: IsoDate | null;
  onSelect: (date: IsoDate) => void;
  label: string;
  // Small dots along the bottom of a day, one colour each (the team calendar's people).
  markers?: (date: IsoDate) => readonly string[];
}) {
  const t = useT();
  const locale = useLocale();
  const byDate = new Map(days.map((d) => [isoOf(d.date), d]));

  return (
    <>
      <div className="cal" role="group" aria-label={label}>
        {weekdayOrder(weekStart).map((w) => (
          <span key={w} className="dow" aria-hidden="true">
            {formatWeekday(WEEKDAYS.indexOf(w), locale, 'narrow')}
          </span>
        ))}
        {weeksOf(month, weekStart).flatMap((week) =>
          week.days.map((day) => {
            if (!day.inMonth) return <span key={day.date} className="d pad" aria-hidden="true" />;
            const info = byDate.get(day.date);
            const hours = info?.hours ?? null;
            const future = day.date > today;
            const flag = info?.flag?.status === 'OPEN';
            const cls = [
              'd',
              day.date === today ? 'today' : '',
              future && hours === null ? 'future' : '',
              future && hours !== null ? 'planned' : '',
              flag ? 'flag' : '',
              info?.note ? 'note' : '',
            ]
              .filter(Boolean)
              .join(' ');
            const name = [
              formatDate(day.date, locale, 'weekdayDayMonth'),
              hours !== null ? formatHours(hours, locale) : t('entry.nothingYet'),
              future && hours !== null ? t('jobs.planned') : '',
              info?.jobs && info.jobs.length > 1 ? t('jobs.jobCount', { count: info.jobs.length }) : '',
              info?.note ? t('web.week.noteLabel', { note: info.note }) : '',
              flag ? t('web.week.flagged') : '',
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <button
                key={day.date}
                type="button"
                className={cls}
                data-l={heatLevel(hours, dayLength)}
                aria-pressed={selected === day.date}
                aria-label={name}
                onClick={() => onSelect(day.date)}
              >
                <span className="n" aria-hidden="true">
                  {formatDate(day.date, locale, 'day')}
                </span>
                <span className="h" aria-hidden="true">
                  {hours !== null ? formatHours(hours, locale, { unit: false }) : ''}
                </span>
                {markers?.(day.date).length ? (
                  <span className="dots" aria-hidden="true">
                    {markers(day.date)
                      .slice(0, 4)
                      .map((colour, i) => (
                        <i key={i} style={{ background: colour }} />
                      ))}
                  </span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>
      <div className="cal-legend" aria-hidden="true">
        <span>{t('month.less')}</span>
        <i data-l="0" />
        <i data-l="1" />
        <i data-l="2" />
        <i data-l="3" />
        <i data-l="4" />
        <span>{t('month.more')}</span>
        <span className="flagdot">
          <i />
          {t('month.flag')}
        </span>
        <span className="planneddot">
          <i />
          {t('jobs.planned')}
        </span>
      </div>
    </>
  );
}
