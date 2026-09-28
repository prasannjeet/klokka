'use client';

// The employee's own month (CHQ-121, mockup web-employee.html "My month") with the employee insights
// (CHQ-125): hours so far against last month, average per working day, best week, streak or earnings, the
// week-by-week line, the heat-map calendar and the selected day with its note and history.
import { useState } from 'react';
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
import { useMemberInsights, useMemberMonth, useWorkspaceDetails } from '@/lib/queries';
import { isoOf, monthIn, todayIn } from '@/lib/time';
import { useMonthParam } from '@/lib/use-month-param';
import { firstName } from '@/lib/visual';
import { useWorkspace } from '@/lib/workspace';
import { CalendarHeatmap } from './calendar-heatmap';
import { Spark } from './charts';
import { HoursDelta } from './delta';
import { EntryHistory } from './entry-history';
import { FlowNumber } from './flow-number';
import { Icon } from './icons';
import { Money } from './money';
import { MonthNav } from './month-nav';
import { ViewHeader } from './view-header';

export function EmployeeMonth() {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const details = useWorkspaceDetails(ws.id);
  const current = monthIn(ws.timezone);
  const today = todayIn(ws.timezone);
  const [month, setMonth] = useMonthParam(current);
  const insights = useMemberInsights(ws.id, ws.membershipId, month);
  const memberMonth = useMemberMonth(ws.id, ws.membershipId, month);
  const [picked, setPicked] = useState<IsoDate | null>(null);

  const mi = insights.data;
  const mm = memberMonth.data;
  const monthName = formatMonthName(month, locale, false);
  const employer = ws.my.employerName ? firstName(ws.my.employerName) : '';
  const lastDay =
    mm?.days
      .filter((d) => d.hours != null)
      .map((d) => isoOf(d.date))
      .sort()
      .at(-1) ?? null;
  const selected = picked ?? lastDay;
  const selectedDay = mm?.days.find((d) => isoOf(d.date) === selected) ?? null;
  const currentWeek = mi?.weekByWeek.at(-1);

  return (
    <section className="view" aria-labelledby="h-my-month">
      <ViewHeader
        id="h-my-month"
        title={t('month.titleMine', { month: formatMonthName(month, locale, locale === 'en') })}
        sub={`${ws.my.name}. ${employer ? t('month.subtitleMine', { name: employer }) : ''}`}
        actions={<MonthNav month={month} current={current} onChange={setMonth} />}
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
          <DayDetail day={selectedDay} date={selected} employer={employer} locked={mm.locked} />
        </div>
      ) : null}
    </section>
  );
}

function DayDetail({
  day,
  date,
  employer,
  locked: _locked,
}: {
  day: MemberMonthDay | null;
  date: IsoDate | null;
  employer: string;
  locked: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
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
            <span className="num">{formatHours(day.hours, locale, { unit: false })}</span>
            <small>{t('common.hourUnit')}</small>
            <Money amount={day.earnings} currency={ws.currency} showPay={ws.showPay} />
          </div>
          {day.note ? (
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
          {day.entryId ? (
            <>
              <h3>{t('entry.history')}</h3>
              <EntryHistory workspaceId={ws.id} entryId={day.entryId} timeZone={ws.timezone} />
            </>
          ) : null}
        </>
      ) : (
        <p className="empty-day">{t('entry.nothingYet')}</p>
      )}
    </div>
  );
}
