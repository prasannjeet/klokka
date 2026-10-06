'use client';

// The team calendar (CHQ-171, the phone's Calendar tab on the web): every date of the month with the team's
// hours and a dot per person who worked it; a click shows that date's jobs across the team, with who worked
// how long (a person opens their day in the Employee view). Hours only, also when pay is on. The month's
// figures are the summary read model (D9); the day's total is the sum of its listed entries.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { addMonths, formatDate, formatHours, formatMonthName, sumHours, type IsoDate } from '@klokka/core';
import { Avatar } from '@/components/avatar';
import { CalendarHeatmap } from '@/components/calendar-heatmap';
import { MonthNav } from '@/components/month-nav';
import { TeamJobs } from '@/components/team-jobs';
import { ViewHeader } from '@/components/view-header';
import { formatDuration, PLAN_AHEAD_MONTHS } from '@/lib/jobs';
import { useLocale, useT } from '@/lib/i18n';
import { useEntries, useMonthSummary, useWorkspaceDetails } from '@/lib/queries';
import { isoOf, monthIn, todayIn } from '@/lib/time';
import { useMonthParam } from '@/lib/use-month-param';
import { firstName } from '@/lib/visual';
import { useWorkspace } from '@/lib/workspace';

const COLOURS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function TeamCalendarView() {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const details = useWorkspaceDetails(ws.id);
  const current = monthIn(ws.timezone);
  const today = todayIn(ws.timezone);
  const [month, setMonth] = useMonthParam(current, addMonths(current, PLAN_AHEAD_MONTHS));
  const summary = useMonthSummary(ws.id, month);
  const data = summary.data;
  // ?day=2026-10-07 picks the date; otherwise today in the current month, the 1st in any other.
  const dayParam = search.get('day');
  const selected: IsoDate =
    dayParam && DAY_RE.test(dayParam) && dayParam.slice(0, 7) === month
      ? dayParam
      : month === current
        ? today
        : `${month}-01`;
  const entries = useEntries(ws.id, selected, selected);
  const worked = (entries.data ?? []).filter((e) => e.hours > 0 || e.jobs.length > 0);
  const colourOf = new Map((data?.members ?? []).map((m, i) => [m.membershipId, COLOURS[i % 4] as string]));
  const nameOf = new Map((data?.members ?? []).map((m) => [m.membershipId, m.name]));
  const byDate = new Map((data?.days ?? []).map((d) => [isoOf(d.date), d]));
  const busiest = Math.max(1, ...(data?.days ?? []).map((d) => d.hours));
  const monthName = formatMonthName(month, locale, false);

  function select(date: IsoDate) {
    const params = new URLSearchParams(search.toString());
    params.set('day', date);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <section className="view" aria-labelledby="h-calendar">
      <ViewHeader
        id="h-calendar"
        title={t('nav.calendar')}
        sub={
          data
            ? t('team.calendarSubtitle', { hours: formatHours(data.totalHours, locale), month: monthName })
            : t('team.wholeTeam')
        }
        actions={
          <MonthNav
            month={month}
            current={current}
            latest={addMonths(current, PLAN_AHEAD_MONTHS)}
            onChange={setMonth}
          />
        }
      />
      <div className="twocol" style={{ marginTop: 16 }}>
        <div className="card pad">
          <CalendarHeatmap
            month={month}
            days={(data?.days ?? []).map((d) => ({ date: d.date, hours: d.hours > 0 ? d.hours : null }))}
            weekStart={details.data?.weekStart ?? ws.my.weekStart}
            dayLength={busiest}
            today={today}
            selected={selected}
            onSelect={select}
            label={t('team.calendarLabel', { month: monthName })}
            markers={(date) =>
              (byDate.get(date)?.membershipIds ?? []).map((id) => ({
                colour: colourOf.get(id) ?? '',
                name: firstName(nameOf.get(id) ?? ''),
              }))
            }
          />
          {data ? (
            <div className="chips" style={{ marginTop: 12 }}>
              {data.members
                .filter((m) => m.hours > 0)
                .map((m) => (
                  <span key={m.membershipId} className="pill">
                    <span className="dot" style={{ background: colourOf.get(m.membershipId) }} />
                    {firstName(m.name)}
                  </span>
                ))}
            </div>
          ) : null}
        </div>
        <div className="card pad" data-testid="team-day">
          <div className="card-head">
            <h2>{formatDate(selected, locale, 'weekdayDayMonth')}</h2>
            <span className="sub">{formatDuration(sumHours(worked.map((e) => e.hours)), t)}</span>
          </div>
          {worked.length > 0 ? (
            <div className="chips" style={{ marginBottom: 12 }}>
              {worked.map((e, i) => (
                <Link
                  key={e.id}
                  className="pill"
                  href={`/w/${ws.slug}/month?member=${e.membershipId}&month=${month}&day=${selected}`}
                >
                  <Avatar name={e.memberName} index={i} size="sm" />
                  {t('team.dayTotalFor', {
                    name: firstName(e.memberName),
                    hours: formatHours(e.hours, locale),
                  })}
                </Link>
              ))}
            </div>
          ) : null}
          {entries.data && worked.length === 0 ? (
            <p className="muted small">{t('team.noJobsDay')}</p>
          ) : (
            <TeamJobs entries={worked} date={selected} />
          )}
        </div>
      </div>
    </section>
  );
}
