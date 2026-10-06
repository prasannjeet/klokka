'use client';

// "Employee view" (CHQ-122, renamed in CHQ-145): pick a person from the dropdown, see the month's figures
// from the API, the heat-map calendar and every day with who logged it and its history. Close the month and
// export it from here too.
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { addMonths, formatHours, formatMoney, formatMonthName, type IsoDate } from '@klokka/core';
import { CalendarHeatmap } from '@/components/calendar-heatmap';
import { CsvButton } from '@/components/csv-button';
import { DayList } from '@/components/day-list';
import { EmployerDayPanel } from '@/components/employer-day-panel';
import { HoursDelta } from '@/components/delta';
import { Icon } from '@/components/icons';
import { Money } from '@/components/money';
import { MonthLockButton } from '@/components/month-lock';
import { MonthNav } from '@/components/month-nav';
import { ViewHeader } from '@/components/view-header';
import { formatDay } from '@/lib/format';
import { formatDuration, PLAN_AHEAD_MONTHS } from '@/lib/jobs';
import { useLocale, useT } from '@/lib/i18n';
import { useMemberMonth, useMembers, useMonthStatus, useWorkspaceDetails } from '@/lib/queries';
import { isoOf, monthIn, todayIn } from '@/lib/time';
import { useMonthParam } from '@/lib/use-month-param';
import { firstName } from '@/lib/visual';
import { useWorkspace } from '@/lib/workspace';

export function EmployerMonthView() {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const details = useWorkspaceDetails(ws.id);
  const current = monthIn(ws.timezone);
  const today = todayIn(ws.timezone);
  const latest = addMonths(current, PLAN_AHEAD_MONTHS);
  const [month, setMonth] = useMonthParam(current, latest);
  const members = useMembers(ws.id, month);
  // Employees, and an employer who logged hours this month (the team calendar links to anyone who worked).
  const people = (members.data ?? []).filter((m) =>
    m.role === 'EMPLOYEE' ? m.status !== 'DEACTIVATED' || m.month.hours > 0 : m.month.hours > 0,
  );
  const chosen = search.get('member');
  const person = people.find((p) => p.id === chosen) ?? people[0] ?? null;
  const memberMonth = useMemberMonth(ws.id, person?.id ?? null, month);
  const status = useMonthStatus(ws.id, month);
  // ?day=2026-10-07 (a cell of the week grid with several jobs) opens that day.
  const dayParam = search.get('day');
  const [picked, setPicked] = useState<IsoDate | null>(
    dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : null,
  );

  const mm = memberMonth.data;
  // The day in the panel: the one picked in this month, else the newest open flag, else the newest day.
  const withHours = (mm?.days ?? []).filter((d) => d.hours != null).map((d) => isoOf(d.date));
  const flaggedDays = (mm?.days ?? []).filter((d) => d.flag?.status === 'OPEN').map((d) => isoOf(d.date));
  const selectedDay =
    picked && picked.slice(0, 7) === month
      ? picked
      : (flaggedDays.sort().at(-1) ?? withHours.sort().at(-1) ?? null);
  const selectedInfo = mm?.days.find((d) => isoOf(d.date) === selectedDay) ?? null;
  const monthName = formatMonthName(month, locale, false);
  const lastMonthName = formatMonthName(addMonths(month, -1), locale, false);
  const name = person ? firstName(person.displayName) : '';

  function choose(id: string) {
    const params = new URLSearchParams(search.toString());
    params.set('member', id);
    setPicked(null);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function selectDay(date: IsoDate) {
    setPicked(date);
    document.getElementById('day-panel')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  return (
    <section className="view" aria-labelledby="h-month">
      <ViewHeader
        id="h-month"
        title={t('nav.employeeView')}
        sub={person ? t('month.subtitle', { name }) : undefined}
        actions={
          <>
            {people.length > 0 ? (
              <select
                className="input person-select"
                aria-label={t('web.month.person')}
                value={person?.id ?? ''}
                onChange={(e) => choose(e.target.value)}
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            ) : null}
            <MonthNav month={month} current={current} latest={latest} onChange={setMonth} />
            <MonthLockButton ws={ws} month={month} />
            {person ? (
              <CsvButton
                workspaceId={ws.id}
                slug={ws.slug}
                month={month}
                membershipId={person.id}
                personName={person.displayName}
              />
            ) : null}
          </>
        }
      />

      {members.isSuccess && people.length === 0 ? (
        <div className="card empty-state">
          <Icon name="users" />
          <p>{t('web.month.noPeople')}</p>
        </div>
      ) : null}

      {mm ? (
        <>
          <div className="hgrid em-stats" style={{ marginTop: 16 }}>
            <div className="tile">
              <span className="lbl">{t('month.hoursIn', { month: monthName })}</span>
              <div className="val">
                {formatHours(mm.totalHours, locale, { unit: false })}
                <small> {t('common.hourUnit')}</small>
              </div>
              {mm.plannedHours > 0 ? (
                <span className="delta muted">
                  {t('jobs.soFarPlanned', {
                    hours: formatDuration(mm.totalHours - mm.plannedHours, t),
                    planned: formatDuration(mm.plannedHours, t),
                  })}
                </span>
              ) : null}
              <HoursDelta delta={mm.vsLastMonthHours}>
                {(d) =>
                  `${t('month.vsLastMonth', { delta: d, month: lastMonthName })} ${t('web.month.lastMonthHours', { hours: formatHours(mm.lastMonthHours, locale) })}`
                }
              </HoursDelta>
            </div>
            <div className="tile">
              <span className="lbl">{t('month.avgPerWorkingDay')}</span>
              <div className="val">
                {formatHours(mm.avgPerWorkingDay, locale, { unit: false })}
                <small> {t('common.hourUnit')}</small>
              </div>
              <span className="delta muted">{t('month.workingDays', { count: mm.workingDays })}</span>
            </div>
            <div className="tile">
              <span className="lbl">{t('month.bestWeek')}</span>
              <div className="val">
                {mm.bestWeek ? formatHours(mm.bestWeek.hours, locale, { unit: false }) : '0'}
                <small> {t('common.hourUnit')}</small>
              </div>
              <span className="delta muted">
                {mm.bestWeek ? t('month.weekLabel', { week: mm.bestWeek.isoWeek }) : ''}
              </span>
            </div>
            {ws.showPay && mm.earnings != null ? (
              <div className="tile pop-in">
                <span className="lbl">{t('month.earnedIn', { month: monthName })}</span>
                <div className="val">
                  <Money amount={mm.earnings} currency={mm.currency} showPay={ws.showPay} />
                </div>
                <span className="delta muted">
                  {mm.hourlyRate != null
                    ? t('month.ratePerHour', { rate: formatMoney(mm.hourlyRate, mm.currency, locale) })
                    : ''}
                </span>
              </div>
            ) : (
              <div className="tile">
                <span className="lbl">{t('month.daysWithNote')}</span>
                <div className="val">{mm.daysWithNote}</div>
                <span className="delta muted">{t('month.notesVisibleHint')}</span>
              </div>
            )}
          </div>

          <div className="twocol" style={{ marginTop: 16 }}>
            <div className="stack">
              <div className="card pad">
                <div className="card-head">
                  <h2>{t('month.calendar')}</h2>
                  <span className={mm.locked ? 'pill ink' : 'pill'}>
                    {mm.locked && status.data?.lockedAt && status.data.lockedBy
                      ? t('web.month.closedBy', {
                          date: formatDay(status.data.lockedAt, locale, ws.timezone),
                          name: firstName(status.data.lockedBy.name),
                        })
                      : mm.locked
                        ? t('status.monthClosed')
                        : t('status.openForEdits')}
                  </span>
                </div>
                <CalendarHeatmap
                  month={month}
                  days={mm.days}
                  weekStart={details.data?.weekStart ?? ws.my.weekStart}
                  dayLength={details.data?.defaultDayHours ?? 8}
                  today={today}
                  selected={selectedDay}
                  onSelect={selectDay}
                  label={t('month.calendarLabel', { month: monthName })}
                />
              </div>
              <EmployerDayPanel
                key={`${person?.id ?? ''}-${selectedDay ?? ''}`}
                ws={ws}
                day={selectedInfo}
                date={selectedDay}
                personName={person?.displayName ?? ''}
                currency={mm.currency}
                {...(person
                  ? {
                      editing: {
                        membershipId: person.id,
                        rounding: details.data?.rounding ?? ws.my.rounding,
                        defaultDayHours: details.data?.defaultDayHours ?? ws.my.defaultDayHours,
                        locked: mm.locked,
                      },
                    }
                  : {})}
              />
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-head pad" style={{ margin: 0, paddingBottom: 12 }}>
                <h2>{t('month.days')}</h2>
                <span className="sub">{t('month.daysNewestFirst', { count: mm.daysWorked })}</span>
              </div>
              {mm.daysWorked === 0 ? (
                <p className="pad muted">{t('web.month.noDays', { month: monthName })}</p>
              ) : (
                <DayList
                  days={mm.days}
                  timeZone={ws.timezone}
                  showPay={ws.showPay}
                  currency={mm.currency}
                  selected={selectedDay}
                  onSelect={selectDay}
                />
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
