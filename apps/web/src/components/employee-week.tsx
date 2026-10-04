'use client';

// The employee's week (CHQ-145, like the phone's week screen): one line per day with the hours, the pay
// when it applies, the jobs' times and places (CHQ-156) and the note, week by week. Not a grid: the employee
// reads, the employer writes. Totals are sums of the visible entries (presentation); every figure a line
// shows comes from the entries operation.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type { Entry } from '@klokka/api-client';
import {
  addDays,
  formatDate,
  formatHours,
  formatHoursDelta,
  formatWeekday,
  isoWeek,
  isoWeekdayIndex,
  sumHours,
  weekOf,
  type IsoDate,
} from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { useEntries, useWorkspaceDetails } from '@/lib/queries';
import { isoOf, todayIn } from '@/lib/time';
import { firstName } from '@/lib/visual';
import { useWorkspace } from '@/lib/workspace';
import { Icon } from './icons';
import { Money } from './money';
import { ViewHeader } from './view-header';
import './jobs/jobs.css';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function EmployeeWeek() {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const details = useWorkspaceDetails(ws.id);
  const weekStart = details.data?.weekStart ?? ws.my.weekStart;
  const today = todayIn(ws.timezone);
  const param = search.get('d');
  const anchor: IsoDate = param && DATE_RE.test(param) ? param : today;
  const dates = useMemo(() => weekOf(anchor, weekStart), [anchor, weekStart]);
  const from = dates[0] as IsoDate;
  const to = dates[6] as IsoDate;
  // The week before comes along in the same call, for "vs last week".
  const entries = useEntries(ws.id, addDays(from, -7), to);
  const byDate = useMemo(() => {
    const map = new Map<IsoDate, Entry>();
    for (const e of entries.data ?? []) if (e.membershipId === ws.membershipId) map.set(isoOf(e.workDate), e);
    return map;
  }, [entries.data, ws.membershipId]);

  const week = isoWeek(dates[weekStart === 'MONDAY' ? 0 : 1] as IsoDate).week;
  const total = sumHours(dates.map((d) => byDate.get(d)?.hours ?? 0));
  const lastTotal = sumHours(dates.map((d) => byDate.get(addDays(d, -7))?.hours ?? 0));
  const earnings = dates.reduce<number | null>((sum, d) => {
    const e = byDate.get(d)?.earnings;
    return e == null ? sum : (sum ?? 0) + e;
  }, null);
  const employer = ws.my.employerName ? firstName(ws.my.employerName) : '';
  const range = {
    from: formatDate(from, locale, 'dayMonth'),
    to: formatDate(to, locale, 'dayMonth'),
  };

  function goTo(date: IsoDate | null) {
    router.replace(date ? `${pathname}?d=${date}` : pathname, { scroll: false });
  }

  return (
    <section className="view" aria-labelledby="h-my-week">
      <ViewHeader
        id="h-my-week"
        title={t('week.title', { week })}
        sub={
          employer
            ? t('web.employeeWeek.subtitle', { ...range, name: employer })
            : t('web.employeeWeek.subtitlePlain', range)
        }
        actions={
          <div className="mnav" role="group" aria-label={t('nav.week')}>
            <button type="button" aria-label={t('week.previousWeek')} onClick={() => goTo(addDays(from, -7))}>
              <Icon name="chev-left" />
            </button>
            <span className="lbl" aria-live="polite">
              {t('week.title', { week })}
            </span>
            <button type="button" aria-label={t('week.nextWeek')} onClick={() => goTo(addDays(from, 7))}>
              <Icon name="chev-right" />
            </button>
            <button
              type="button"
              className="today"
              disabled={dates.includes(today)}
              onClick={() => goTo(null)}
            >
              {t('week.thisWeek')}
            </button>
          </div>
        }
      />

      <div className="card readable" style={{ overflow: 'hidden' }}>
        <div className="card-head pad" style={{ margin: 0, paddingBottom: 12 }}>
          <h2>{t('web.employeeWeek.days')}</h2>
          {lastTotal > 0 || total > 0 ? (
            <span className={total >= lastTotal ? 'pill ok' : 'pill warn'}>
              <Icon name={total >= lastTotal ? 'up' : 'down'} />
              {t('week.vsLastWeek', { delta: formatHoursDelta(total - lastTotal, locale) })}
            </span>
          ) : null}
        </div>
        <ol className="daylist" aria-label={t('week.title', { week })}>
          {dates.map((date) => {
            const entry = byDate.get(date);
            const flagged = entry?.flag?.status === 'OPEN';
            const hoursText = entry ? formatHours(entry.hours, locale) : t('entry.nothingYet');
            const cls = [date === today ? 'today' : '', flagged ? 'flagged' : ''].filter(Boolean).join(' ');
            return (
              <li key={date} className={cls || undefined}>
                <Link
                  className="row"
                  href={`/w/${ws.slug}?month=${date.slice(0, 7)}&day=${date}`}
                  aria-label={t('web.employeeWeek.openDay', {
                    date: formatDate(date, locale, 'weekdayDayMonth'),
                    hours: hoursText,
                  })}
                  data-testid={`week-day-${date}`}
                >
                  <span className="when" aria-hidden="true">
                    {formatWeekday(isoWeekdayIndex(date), locale, 'short')}
                    <b>{formatDate(date, locale, 'day')}</b>
                  </span>
                  <span className="what">
                    {entry && entry.jobs.some((j) => j.location || j.startTime) ? (
                      <span className="places">
                        <Icon name="pin" />
                        {entry.jobs
                          .map((j) => [j.startTime, j.location?.name].filter(Boolean).join(' '))
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    ) : null}
                    {entry?.note ? <span className="note">{entry.note}</span> : null}
                    {date === today || flagged ? (
                      <span className="meta">
                        {date === today ? <span>{t('common.today')}</span> : null}
                        {flagged ? (
                          <span className="pill bad">
                            <Icon name="flag" />
                            {t('overview.openFlag')}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                  {entry ? (
                    <span className="h">
                      {formatHours(entry.hours, locale, { unit: false })}
                      <small>{t('common.hourUnit')}</small>
                      <Money block amount={entry.earnings} currency={ws.currency} showPay={ws.showPay} />
                    </span>
                  ) : (
                    <span className="h none">{t('entry.nothingYet')}</span>
                  )}
                </Link>
              </li>
            );
          })}
          <li className="total">
            <div className="row">
              <span />
              <span className="what">{t('week.weekTotal')}</span>
              <span className="h">
                {formatHours(total, locale, { unit: false })}
                <small>{t('common.hourUnit')}</small>
                <Money block amount={earnings} currency={ws.currency} showPay={ws.showPay} />
              </span>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
