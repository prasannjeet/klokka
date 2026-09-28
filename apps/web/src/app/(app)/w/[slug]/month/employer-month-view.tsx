'use client';

// One employee's month for the employer (CHQ-122, mockup "Employee month"): pick a person, see the month's
// figures from the API, the heat-map calendar and every day with who logged it and its history. Close the
// month and export it from here too.
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { addMonths, formatHours, formatMoney, formatMonthName, type IsoDate } from '@klokka/core';
import { Avatar } from '@/components/avatar';
import { CalendarHeatmap } from '@/components/calendar-heatmap';
import { CsvButton } from '@/components/csv-button';
import { DayList } from '@/components/day-list';
import { HoursDelta } from '@/components/delta';
import { Icon } from '@/components/icons';
import { Money } from '@/components/money';
import { MonthLockButton } from '@/components/month-lock';
import { MonthNav } from '@/components/month-nav';
import { ViewHeader } from '@/components/view-header';
import { formatDay } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useMemberMonth, useMembers, useMonthStatus, useWorkspaceDetails } from '@/lib/queries';
import { monthIn, todayIn } from '@/lib/time';
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
  const [month, setMonth] = useMonthParam(current);
  const members = useMembers(ws.id, month);
  const people = (members.data ?? []).filter(
    (m) => m.role === 'EMPLOYEE' && (m.status !== 'DEACTIVATED' || m.month.hours > 0),
  );
  const chosen = search.get('member');
  const person = people.find((p) => p.id === chosen) ?? people[0] ?? null;
  const memberMonth = useMemberMonth(ws.id, person?.id ?? null, month);
  const status = useMonthStatus(ws.id, month);
  const [selectedDay, setSelectedDay] = useState<IsoDate | null>(null);

  const mm = memberMonth.data;
  const monthName = formatMonthName(month, locale, false);
  const lastMonthName = formatMonthName(addMonths(month, -1), locale, false);
  const name = person ? firstName(person.displayName) : '';

  function choose(id: string) {
    const params = new URLSearchParams(search.toString());
    params.set('member', id);
    setSelectedDay(null);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function selectDay(date: IsoDate) {
    setSelectedDay(date);
    document.getElementById(`day-${date}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  return (
    <section className="view" aria-labelledby="h-month">
      <ViewHeader
        id="h-month"
        title={person ? t('month.title', { name, month: monthName }) : t('nav.employeeMonth')}
        sub={person ? t('month.subtitle', { name }) : undefined}
        actions={
          <>
            <MonthNav month={month} current={current} onChange={setMonth} />
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

      <div className="people chips" role="group" aria-label={t('web.month.person')}>
        {people.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            aria-pressed={p.id === person?.id}
            onClick={() => choose(p.id)}
          >
            <Avatar name={p.displayName} emoji={p.avatarEmoji} index={i + 1} size="sm" />
            {firstName(p.displayName)}
          </button>
        ))}
      </div>

      {mm ? (
        <>
          <div className="hgrid em-stats" style={{ marginTop: 16 }}>
            <div className="tile">
              <span className="lbl">{t('month.hoursIn', { month: monthName })}</span>
              <div className="val">
                {formatHours(mm.totalHours, locale, { unit: false })}
                <small> {t('common.hourUnit')}</small>
              </div>
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
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-head pad" style={{ margin: 0, paddingBottom: 12 }}>
                <h2>{t('month.days')}</h2>
                <span className="sub">{t('month.daysNewestFirst', { count: mm.daysWorked })}</span>
              </div>
              {mm.daysWorked === 0 ? (
                <p className="pad muted">{t('web.month.noDays', { month: monthName })}</p>
              ) : (
                <DayList
                  workspaceId={ws.id}
                  days={mm.days}
                  timeZone={ws.timezone}
                  showPay={ws.showPay}
                  currency={mm.currency}
                  highlighted={selectedDay}
                />
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
