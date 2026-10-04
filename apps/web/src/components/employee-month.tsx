'use client';

// The employee's own month (CHQ-121, mockup web-employee.html "My month") with the employee insights
// (CHQ-125): hours so far against last month, average per working day, best week, streak or earnings, the
// week-by-week line, the heat-map calendar and the selected day with its note and history.
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { MemberMonthDay } from '@klokka/api-client';
import {
  addMonths,
  formatDate,
  formatHours,
  formatMoney,
  formatMonthName,
  isoWeek,
  type IsoDate,
} from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { formatDuration, PLAN_AHEAD_MONTHS, placesOf } from '@/lib/jobs';
import { useMemberInsights, useMemberMonth, useWorkspaceDetails } from '@/lib/queries';
import { isoOf, monthIn, todayIn } from '@/lib/time';
import { useMonthParam } from '@/lib/use-month-param';
import { firstName } from '@/lib/visual';
import { useWorkspace } from '@/lib/workspace';
import { CalendarHeatmap } from './calendar-heatmap';
import { Spark } from './charts';
import { HoursDelta } from './delta';
import { EntryHistory } from './entry-history';
import { FlagDialog } from './flag-dialog';
import { FlowNumber } from './flow-number';
import { Icon } from './icons';
import { DayJobs } from './jobs/day-jobs';
import { Money } from './money';
import { MonthNav } from './month-nav';
import { ShareCard } from './share-card';
import { ViewHeader } from './view-header';
import './jobs/jobs.css';

export function EmployeeMonth() {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const details = useWorkspaceDetails(ws.id);
  const current = monthIn(ws.timezone);
  const today = todayIn(ws.timezone);
  const latest = addMonths(current, PLAN_AHEAD_MONTHS);
  const [month, setMonth] = useMonthParam(current, latest);
  // The employer may turn analysis off for employees (CHQ-156): then no insights call, hours and jobs only.
  const showInsights = ws.my.employeesSeeInsights;
  const insights = useMemberInsights(ws.id, ws.membershipId, month, showInsights);
  const memberMonth = useMemberMonth(ws.id, ws.membershipId, month);
  // ?day=2026-09-29 (a line of the week view) opens that day, when it belongs to the month shown.
  const dayParam = useSearchParams().get('day');
  const [picked, setPicked] = useState<IsoDate | null>(
    dayParam && dayParam.slice(0, 7) === month && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : null,
  );

  const mi = showInsights ? insights.data : undefined;
  const mm = memberMonth.data;
  const monthName = formatMonthName(month, locale, false);
  const employer = ws.my.employerName ? firstName(ws.my.employerName) : '';
  const lastDay =
    mm?.days
      .filter((d) => d.hours != null)
      .map((d) => isoOf(d.date))
      .sort()
      .at(-1) ?? null;
  const selected = picked && picked.slice(0, 7) === month ? picked : lastDay;
  const selectedDay = mm?.days.find((d) => isoOf(d.date) === selected) ?? null;
  const currentWeek = mi?.weekByWeek.at(-1);

  return (
    <section className="view" aria-labelledby="h-my-month">
      <ViewHeader
        id="h-my-month"
        title={t('month.titleMine', { month: formatMonthName(month, locale, locale === 'en') })}
        sub={`${ws.my.name}. ${employer ? t('month.subtitleMine', { name: employer }) : ''}`}
        actions={
          <>
            <MonthNav month={month} current={current} latest={latest} onChange={setMonth} />
            {showInsights ? (
              <a className="btn btn-secondary" href="#share-card">
                <Icon name="share" />
                {t('month.shareMyMonth')}
              </a>
            ) : null}
          </>
        }
      />

      {mi ? (
        <div className="hgrid me-top">
          <div className="me-hero">
            <span className="lbl">
              {month === current
                ? t('month.hoursInSoFar', { month: monthName })
                : t('month.hoursIn', { month: monthName })}
            </span>
            <div className="val">
              <span className="num">
                <FlowNumber value={mi.totalHours} />
              </span>
              <small>{t('common.hourUnit')}</small>
              <Money amount={mi.earnings} currency={mi.currency} showPay={ws.showPay && mi.showPay} />
            </div>
            <div className="deltas">
              <HoursDelta delta={mi.vsLastMonthHours}>
                {(d) =>
                  `${t('month.vsLastMonth', { delta: d, month: formatMonthName(addMonths(month, -1), locale, false) })} ${t('web.month.lastMonthHours', { hours: formatHours(mi.lastMonthHours, locale) })}`
                }
              </HoursDelta>
              <span className="muted">
                {t('month.workingDays', { count: mi.workingDays })},{' '}
                {t('month.avgPerWorkingDayShort', { hours: formatHours(mi.avgPerWorkingDay, locale) })}
              </span>
            </div>
            {mi.weekByWeek.length > 0 ? (
              <Spark
                points={mi.weekByWeek.map((w) => ({ label: `W${w.isoWeek}`, value: w.hours }))}
                label={t('insights.weekByWeekLabel', {
                  values: mi.weekByWeek.map((w) => formatHours(w.hours, locale, { unit: false })).join(', '),
                })}
              />
            ) : null}
          </div>
          <div className="me-side">
            <div>
              <span className="lbl">{t('month.avgPerWorkingDay')}</span>
              <span className="v">
                {formatHours(mi.avgPerWorkingDay, locale, { unit: false })}
                <small> {t('common.hourUnit')}</small>
              </span>
              <span className="s">{t('web.month.daysWithHours', { count: mi.daysWorked })}</span>
            </div>
            <div>
              <span className="lbl">{t('month.bestWeek')}</span>
              <span className="v">
                {formatHours(mi.bestWeek?.hours ?? 0, locale, { unit: false })}
                <small> {t('common.hourUnit')}</small>
              </span>
              <span className="s">
                {mi.bestWeek ? t('month.weekLabel', { week: mi.bestWeek.isoWeek }) : ''}
              </span>
            </div>
            {ws.showPay && mi.showPay && mi.earnings != null ? (
              <div className="pop-in">
                <span className="lbl">{t('month.earnedIn', { month: monthName })}</span>
                <span className="v">
                  <Money amount={mi.earnings} currency={mi.currency} showPay />
                </span>
                <span className="s">
                  {mi.hourlyRate != null
                    ? t('web.month.rateBeforeTax', { rate: formatMoney(mi.hourlyRate, mi.currency, locale) })
                    : ''}
                </span>
              </div>
            ) : (
              <div>
                <span className="lbl">{t('insights.streak')}</span>
                <span className="v">{mi.streakDays}</span>
                <span className="s">{t('insights.streakDays', { count: mi.streakDays })}</span>
              </div>
            )}
            <div>
              <span className="lbl">
                {currentWeek ? t('month.weekLabel', { week: currentWeek.isoWeek }) : t('nav.week')}
              </span>
              <span className="v">
                {formatHours(currentWeek?.hours ?? 0, locale, { unit: false })}
                <small> {t('common.hourUnit')}</small>
              </span>
              <span className="s">
                {currentWeek
                  ? t('week.range', {
                      from: formatDate(isoOf(currentWeek.from), locale, 'weekdayDay'),
                      to: formatDate(isoOf(currentWeek.to), locale, 'weekdayDay'),
                    })
                  : ''}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {!showInsights && mm ? (
        <div className="hgrid me-top">
          <div className="me-hero">
            <span className="lbl">
              {month === current
                ? t('month.hoursInSoFar', { month: monthName })
                : t('month.hoursIn', { month: monthName })}
            </span>
            <div className="val">
              <span className="num">{formatDuration(mm.totalHours - mm.plannedHours, t)}</span>
            </div>
            {mm.plannedHours > 0 ? (
              <div className="deltas">
                <span className="muted">
                  {t('jobs.soFarPlanned', {
                    hours: formatDuration(mm.totalHours - mm.plannedHours, t),
                    planned: formatDuration(mm.plannedHours, t),
                  })}
                </span>
              </div>
            ) : null}
          </div>
          <JobsThisMonth days={mm.days} today={today} onSelect={setPicked} />
        </div>
      ) : null}

      {mm ? (
        <div className="twocol" style={{ marginTop: 16 }}>
          <div className="card pad">
            <div className="card-head">
              <h2>{t('month.calendar')}</h2>
              <span className={mm.locked ? 'pill ink' : 'pill'}>
                {mm.locked ? t('status.monthClosed') : t('status.monthOpen')}
              </span>
            </div>
            <CalendarHeatmap
              month={month}
              days={mm.days}
              weekStart={details.data?.weekStart ?? ws.my.weekStart}
              dayLength={details.data?.defaultDayHours ?? 8}
              today={today}
              selected={selected}
              onSelect={setPicked}
              label={t('month.calendarLabelMine', { month: monthName })}
            />
          </div>
          <DayDetail key={selected ?? 'none'} day={selectedDay} date={selected} employer={employer} />
        </div>
      ) : null}

      {mi ? <ShareCard month={month} insights={mi} /> : null}
    </section>
  );
}

function DayDetail({
  day,
  date,
  employer,
}: {
  day: MemberMonthDay | null;
  date: IsoDate | null;
  employer: string;
}) {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const [flagging, setFlagging] = useState(false);
  if (!date) {
    return (
      <div className="card pad dd">
        <p className="muted">{t('web.month.pickDay')}</p>
      </div>
    );
  }
  const title = formatDate(date, locale, 'weekdayDayMonth');
  return (
    <div className="card pad dd" aria-live="polite">
      <div className="dd-head">
        <div>
          <h2>{title.charAt(0).toLocaleUpperCase() + title.slice(1)}</h2>
          <p className="sub">{t('entry.daySubtitle', { week: isoWeek(date).week, workspace: ws.my.name })}</p>
        </div>
      </div>
      {day?.hours != null ? (
        <>
          <div className="big">
            <span className="num">{formatDuration(day.hours, t)}</span>
            <Money amount={day.earnings} currency={ws.currency} showPay={ws.showPay} />
          </div>
          <DayJobs ws={ws} date={date} jobs={day.jobs} dayTotal={day.hours} />
          {day.jobs.length === 0 && day.note ? (
            <div className="note-row">
              <Icon name="note" />
              <div>
                {day.note}
                <span>
                  {t('entry.note', { name: day.updatedBy ? firstName(day.updatedBy.name) : employer })}
                </span>
              </div>
            </div>
          ) : null}
          {day.flag?.status === 'OPEN' ? (
            <div className="flag-open" role="status">
              <b>
                <Icon name="flag" />
                {t('overview.openFlag')}
              </b>
              <span>
                {day.flag.suggestedHours != null
                  ? t('web.flags.youSuggested', {
                      suggested: formatHours(day.flag.suggestedHours, locale),
                      logged: formatHours(day.hours, locale),
                    })
                  : t('web.flags.youFlagged')}
              </span>
            </div>
          ) : null}
          {day.entryId ? (
            <>
              <h3>{t('entry.history')}</h3>
              <EntryHistory workspaceId={ws.id} entryId={day.entryId} timeZone={ws.timezone} />
            </>
          ) : null}
          {day.entryId && day.flag?.status !== 'OPEN' ? (
            <div className="acts">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setFlagging(true)}>
                <Icon name="flag" />
                {t('flags.flagThisEntry')}
              </button>
              <span className="hint">{t('flags.flagThisEntryHint', { name: employer })}</span>
              <FlagDialog
                ws={ws}
                entryId={day.entryId}
                date={date}
                loggedHours={day.hours}
                employer={employer}
                open={flagging}
                onClose={() => setFlagging(false)}
              />
            </div>
          ) : null}
        </>
      ) : (
        <p className="empty-day">{t('entry.nothingYet')}</p>
      )}
    </div>
  );
}

// When analysis is off: the month's days with jobs, newest first, each opening its day (CHQ-156).
function JobsThisMonth({
  days,
  today,
  onSelect,
}: {
  days: readonly MemberMonthDay[];
  today: IsoDate;
  onSelect: (date: IsoDate) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const rows = days.filter((d) => d.hours != null).sort((a, b) => (isoOf(a.date) < isoOf(b.date) ? 1 : -1));
  return (
    <div className="card jobs-month">
      <h2 className="lbl">{t('jobs.jobsThisMonth')}</h2>
      {rows.length === 0 ? (
        <p className="muted">{t('entry.nothingYet')}</p>
      ) : (
        <ol className="daylist">
          {rows.map((day) => {
            const date = isoOf(day.date);
            const planned = date > today;
            return (
              <li key={date}>
                <button type="button" className="row" onClick={() => onSelect(date)}>
                  <span className="when" aria-hidden="true">
                    {formatDate(date, locale, 'weekdayDay')}
                  </span>
                  <span className="what">
                    <span className="note">
                      {placesOf(day.jobs).join(', ') || t('jobs.jobCount', { count: day.jobs.length })}
                    </span>
                    {planned ? (
                      <span className="meta">
                        <span>{t('jobs.planned')}</span>
                      </span>
                    ) : null}
                  </span>
                  <span className={planned ? 'h planned' : 'h'}>{formatDuration(day.hours ?? 0, t)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
