'use client';

// The employer's overview (CHQ-124 insights, CHQ-126 nothing-logged nudge; mockup "Overview"): the month's
// hours against the same point last month, the projection, per person, week by week, weekday distribution,
// busiest day, average per person and day, labour cost when pay is on, open flags and the latest
// notifications. Every figure is the API's read model (D9); the browser only draws it.
import Link from 'next/link';
import { useState } from 'react';
import type { WorkspaceInsights } from '@klokka/api-client';
import {
  addMonths,
  formatDate,
  formatHours,
  formatMonthName,
  formatWeekday,
  intlLocale,
  isWeekend,
  monthDays,
  WEEKDAYS,
  weekdayOrder,
  type IsoDate,
} from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { useNotifications } from '@/lib/notifications';
import { useWorkspaceDetails, useWorkspaceInsights } from '@/lib/queries';
import { isoOf, monthIn, todayIn } from '@/lib/time';
import { useMonthParam } from '@/lib/use-month-param';
import { firstName } from '@/lib/visual';
import { useWorkspace } from '@/lib/workspace';
import { Columns, Spark, type SeriesPoint } from './charts';
import { HoursDelta } from './delta';
import { FlowNumber } from './flow-number';
import { Icon } from './icons';
import { Money } from './money';
import { MonthNav } from './month-nav';
import { NotificationItem } from './notification-item';
import { OpenFlags } from './open-flags';
import { ViewHeader } from './view-header';

const BAR_COLOURS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

export function EmployerOverview() {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const details = useWorkspaceDetails(ws.id);
  const current = monthIn(ws.timezone);
  const today = todayIn(ws.timezone);
  const [month, setMonth] = useMonthParam(current);
  const insights = useWorkspaceInsights(ws.id, month);
  const recent = useNotifications(ws.id, false, 4);
  const [now] = useState(() => new Date());
  const data = insights.data;
  const lastMonthName = formatMonthName(addMonths(month, -1), locale, false);
  const weekdaysLeft = monthDays(month).filter((d) => d > today && !isWeekend(d)).length;

  return (
    <section className="view" aria-labelledby="h-overview">
      <ViewHeader
        id="h-overview"
        title={t('overview.title', { month: formatMonthName(month, locale, true) })}
        sub={
          month === current
            ? t('overview.subtitle', {
                workspace: ws.my.name,
                date: capitalize(formatDate(today, locale, 'weekdayDayMonth'), locale),
                daysLeft: t('overview.weekdaysLeft', { count: weekdaysLeft }),
              })
            : t('web.overview.lastMonthOver', { month: formatMonthName(month, locale, true) })
        }
        actions={
          <>
            <MonthNav month={month} current={current} onChange={setMonth} />
            <Link className="btn btn-secondary" href={`/w/${ws.slug}/week`}>
              <Icon name="grid" />
              {t('overview.logThisWeek')}
            </Link>
          </>
        }
      />

      {data ? (
        <>
          <div className="hgrid ov-top">
            <div className="ov-hero">
              <span className="lbl">
                {t('overview.hoursLoggedThisMonth', {
                  people: t('common.people', { count: data.activeMembers }),
                })}
              </span>
              <div className="val">
                <span className="num">
                  <FlowNumber value={data.totalHours} />
                </span>
                <small>{t('common.hourUnit')}</small>
                <Money
                  amount={data.labourCost}
                  currency={data.currency}
                  showPay={ws.showPay && data.showPay}
                />
              </div>
              <div className="deltas">
                <HoursDelta delta={data.vsLastMonthAtSamePointHours}>
                  {(d) => t('overview.vsSamePoint', { delta: d, month: lastMonthName })}
                </HoursDelta>
                <span className="muted">
                  {t('web.overview.projectedLine', {
                    projected: formatHours(data.projectedMonthEndHours, locale),
                    lastMonth: t('overview.lastMonthEndedAt', {
                      month: lastMonthName,
                      hours: formatHours(data.lastMonthTotalHours, locale),
                    }),
                  })}
                </span>
              </div>
              {data.weekByWeek.length > 0 ? (
                <Spark
                  points={data.weekByWeek.map((w) => ({ label: `W${w.isoWeek}`, value: w.hours }))}
                  label={t('insights.teamHoursPerWeek', {
                    values: data.weekByWeek.map((w) => formatHours(w.hours, locale)).join(', '),
                  })}
                />
              ) : null}
            </div>
            <div className="ov-side">
              <span className="lbl">{t('overview.perPerson')}</span>
              <PerPerson data={data} />
              <Nudge data={data} slug={ws.slug} />
            </div>
          </div>

          <div className="ov-grid">
            <div className="hgrid tiles ov-tiles">
              <div className="tile span2">
                <span className="lbl">{t('overview.weekByWeek')}</span>
                <Columns points={weekPoints(data, today)} label={t('overview.hoursPerWeek')} />
              </div>
              <div className="tile">
                <span className="lbl">{t('overview.weekdayDistribution')}</span>
                <Columns
                  points={weekdayPoints(data, details.data?.weekStart ?? ws.my.weekStart, locale)}
                  label={t('overview.hoursPerWeekday')}
                  height={110}
                  showValues={false}
                />
              </div>
              <div className="tile">
                <span className="lbl">{t('overview.busiestDay')}</span>
                <div className="val">
                  {data.busiestDay
                    ? capitalize(
                        formatWeekday(WEEKDAYS.indexOf(data.busiestDay.weekday), locale, 'long'),
                        locale,
                      )
                    : ''}
                </div>
                <span className="delta muted">
                  {data.busiestDay
                    ? t('overview.onAverage', { hours: formatHours(data.busiestDay.avgHours, locale) })
                    : ''}
                </span>
              </div>
              <div className="tile">
                <span className="lbl">{t('overview.projectedMonthEnd')}</span>
                <div className="val">
                  {formatHours(data.projectedMonthEndHours, locale, { unit: false })}
                  <small> {t('common.hourUnit')}</small>
                </div>
                <span className="delta muted">
                  {t('overview.hoursInMonth', {
                    hours: formatHours(data.lastMonthTotalHours, locale),
                    month: lastMonthName,
                  })}
                </span>
              </div>
              <div className="tile">
                <span className="lbl">{t('overview.avgPerWorkingDay')}</span>
                <div className="val">
                  {formatHours(data.avgHoursPerPersonPerWorkingDay, locale, { unit: false })}
                  <small> {t('common.hourUnit')}</small>
                </div>
                <span className="delta muted">{t('overview.perPersonAndDay')}</span>
              </div>
              {ws.showPay && data.showPay && data.labourCost != null ? (
                <div className="tile span2 pop-in">
                  <span className="lbl">{t('overview.labourCostThisMonth')}</span>
                  <div className="val">
                    <Money amount={data.labourCost} currency={data.currency} showPay />
                  </div>
                  <span className="delta muted">{t('overview.ratesHint')}</span>
                </div>
              ) : null}
            </div>
            <div className="stack">
              <OpenFlags ws={ws} />
              <div className="card pad">
                <div className="card-head">
                  <h2>{t('overview.recent')}</h2>
                  <Link className="btn btn-sm btn-ghost" href={`/w/${ws.slug}/notifications`}>
                    {t('overview.allNotifications')}
                  </Link>
                </div>
                {recent.data && recent.data.pages[0]?.items.length === 0 ? (
                  <p className="muted small">{t('web.overview.noRecent')}</p>
                ) : (
                  <div className="hgrid list">
                    {(recent.data?.pages[0]?.items ?? []).map((n) => (
                      <NotificationItem
                        key={n.id}
                        n={n}
                        slug={ws.slug}
                        workspaceId={ws.id}
                        employer
                        timeZone={ws.timezone}
                        now={now}
                        actions={<></>}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="illustrative">
            <Icon name="info" />
            {t('overview.numbersFromApi')}
          </p>
        </>
      ) : null}
    </section>
  );
}

function capitalize(text: string, locale: 'sv' | 'en'): string {
  return text.charAt(0).toLocaleUpperCase(intlLocale(locale)) + text.slice(1);
}

function PerPerson({ data }: { data: WorkspaceInsights }) {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const max = Math.max(1, ...data.perMember.map((m) => m.hours));
  return (
    <div className="bars" role="list" aria-label={t('overview.perPerson')}>
      {data.perMember.map((m, i) => (
        <div className="bar" role="listitem" key={m.membershipId}>
          <span>{firstName(m.name)}</span>
          <div className="track" aria-hidden="true">
            <div
              className="fill"
              style={
                {
                  '--w': `${((m.hours / max) * 100).toFixed(1)}%`,
                  '--c': BAR_COLOURS[i % 4],
                } as React.CSSProperties
              }
            />
          </div>
          <span className="v">
            {formatHours(m.hours, locale)}
            <Money block amount={m.earnings} currency={data.currency} showPay={ws.showPay && data.showPay} />
          </span>
        </div>
      ))}
    </div>
  );
}

// CHQ-126: the working days so far with nothing logged, straight from the API.
function Nudge({ data, slug }: { data: WorkspaceInsights; slug: string }) {
  const t = useT();
  const locale = useLocale();
  const days = data.nothingLoggedDays.map((d) => isoOf(d.date));
  if (days.length === 0) return null;
  const list = new Intl.ListFormat(intlLocale(locale), { type: 'conjunction' }).format(
    days.map((d) => formatDate(d, locale, 'weekdayDay')),
  );
  return (
    <div className="nudge" role="status">
      <Icon name="alert" />
      <div>
        <b>{t('overview.nothingLoggedDays', { count: days.length })}</b>
        <p>{list}.</p>
      </div>
      <Link className="btn btn-sm btn-ghost" href={`/w/${slug}/week?d=${days[0]}`}>
        {t('overview.openWeekGrid')}
      </Link>
    </div>
  );
}

function weekPoints(data: WorkspaceInsights, today: IsoDate): SeriesPoint[] {
  const max = Math.max(...data.weekByWeek.map((w) => w.hours));
  return data.weekByWeek.map((w) => {
    const from = isoOf(w.from);
    const to = isoOf(w.to);
    const tone: SeriesPoint['tone'] =
      from > today ? 'empty' : to >= today ? 'part' : w.hours === max && max > 0 ? 'top' : undefined;
    return { label: `W${w.isoWeek}`, value: w.hours, ...(tone ? { tone } : {}) };
  });
}

function weekdayPoints(
  data: WorkspaceInsights,
  weekStart: 'MONDAY' | 'SUNDAY',
  locale: 'sv' | 'en',
): SeriesPoint[] {
  const byDay = new Map(data.weekdayDistribution.map((d) => [d.weekday, d]));
  const busiest = data.busiestDay?.weekday;
  return weekdayOrder(weekStart).map((w) => ({
    label: formatWeekday(WEEKDAYS.indexOf(w), locale, 'narrow'),
    value: byDay.get(w)?.avgHours ?? 0,
    ...(w === busiest ? { tone: 'top' as const } : {}),
  }));
}
