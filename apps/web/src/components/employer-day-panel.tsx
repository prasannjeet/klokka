'use client';

// The selected day on the employer's Employee view (CHQ-145): the day's total, its jobs with Add, Edit and
// Remove while the month is open (CHQ-156, any day, future ones too), the employee's open flag with the
// resolve actions and the whole change history. Same shape as the employee's day panel.
import type { Flag, FlagReason, MemberMonthDay } from '@klokka/api-client';
import {
  formatDate,
  formatHours,
  formatMonthName,
  isoWeek,
  monthOf,
  type IsoDate,
  type MessageKey,
} from '@klokka/core';
import { formatDayTime } from '@/lib/format';
import { formatDuration } from '@/lib/jobs';
import { useLocale, useT } from '@/lib/i18n';
import { useFlag } from '@/lib/queries';
import { firstName } from '@/lib/visual';
import type { WorkspaceView } from '@/lib/workspace';
import { EntryHistory } from './entry-history';
import { declineNote, FlagActions } from './flag-resolve';
import { Icon } from './icons';
import { DayJobs, type DayJobsEditing } from './jobs/day-jobs';
import { Money } from './money';
import './jobs/jobs.css';

export function EmployerDayPanel({
  ws,
  day,
  date,
  personName,
  currency,
  editing,
}: {
  ws: WorkspaceView;
  day: MemberMonthDay | null;
  date: IsoDate | null;
  personName: string;
  currency: string;
  editing?: Omit<DayJobsEditing, 'personName'>;
}) {
  const t = useT();
  const locale = useLocale();
  if (!date) {
    return (
      <div className="card pad dd" id="day-panel">
        <p className="muted">{t('web.month.pickDay')}</p>
      </div>
    );
  }
  const title = formatDate(date, locale, 'weekdayDayMonth');
  const jobs = day?.jobs ?? [];
  return (
    <div className="card pad dd" id="day-panel" aria-live="polite">
      <div className="dd-head">
        <div>
          <h2>{title.charAt(0).toLocaleUpperCase() + title.slice(1)}</h2>
          <p className="sub">{t('web.dayList.dayOf', { week: isoWeek(date).week, name: personName })}</p>
        </div>
        {jobs.length > 0 ? <span className="pill">{t('jobs.jobCount', { count: jobs.length })}</span> : null}
      </div>
      {editing?.locked ? (
        <p className="lock-banner" role="status">
          <Icon name="lock" />
          {t('jobs.monthClosed', { month: formatMonthName(monthOf(date), locale, false) })}
        </p>
      ) : null}
      {day?.hours != null ? (
        <div className="big">
          <span className="num">{formatDuration(day.hours, t)}</span>
          <Money amount={day.earnings} currency={currency} showPay={ws.showPay} />
        </div>
      ) : (
        <p className="empty-day">{editing && !editing.locked ? t('jobs.noJobs') : t('entry.nothingYet')}</p>
      )}
      {jobs.length === 0 && day?.note ? (
        <div className="note-row">
          <Icon name="note" />
          <div>
            {day.note}
            {day.updatedBy ? <span>{t('entry.note', { name: firstName(day.updatedBy.name) })}</span> : null}
          </div>
        </div>
      ) : null}
      <DayJobs
        ws={ws}
        date={date}
        jobs={jobs}
        dayTotal={day?.hours ?? 0}
        {...(editing ? { editing: { ...editing, personName } } : {})}
      />
      {day?.flag?.status === 'OPEN' ? (
        <OpenFlag ws={ws} flagId={day.flag.id} jobCount={jobs.length} currentHours={day.hours ?? 0} />
      ) : null}
      {day?.entryId ? (
        <>
          <h3>{t('entry.history')}</h3>
          <EntryHistory workspaceId={ws.id} entryId={day.entryId} timeZone={ws.timezone} />
        </>
      ) : null}
    </div>
  );
}

const REASON: Record<FlagReason, MessageKey> = {
  MORE: 'flags.reasonMoreShort',
  LESS: 'flags.reasonLessShort',
  NOT_IN: 'flags.reasonNotInShort',
};

// The employee's flag as they sent it: why, what they say the hours were, their message and when, then
// the employer's answer (set to the suggested hours, or keep what is logged).
interface FlagDay {
  jobCount: number;
  currentHours: number;
}

function OpenFlag({ ws, flagId, ...day }: { ws: WorkspaceView; flagId: string } & FlagDay) {
  const flag = useFlag(ws.id, flagId);
  if (!flag.data) return null;
  return <OpenFlagBody ws={ws} flag={flag.data} {...day} />;
}

function OpenFlagBody({ ws, flag, jobCount, currentHours }: { ws: WorkspaceView; flag: Flag } & FlagDay) {
  const t = useT();
  const locale = useLocale();
  const name = firstName(flag.memberName);
  return (
    <div className="flag-open" role="status" data-testid="panel-flag">
      <b>
        <Icon name="flag" />
        {t('web.month.flagRaised', { name })}
      </b>
      <span>
        {t(REASON[flag.reason])}
        {flag.suggestedHours != null
          ? `. ${t('web.month.suggests', { name, hours: formatHours(flag.suggestedHours, locale) })}`
          : ''}
      </span>
      {flag.message ? <q>{flag.message}</q> : null}
      <span className="when">
        {t('flags.raised', { when: formatDayTime(flag.raisedAt, locale, ws.timezone) })}
      </span>
      <div className="acts">
        <FlagActions ws={ws} flag={flag} inPanel jobCount={jobCount} currentHours={currentHours} />
      </div>
      {jobCount > 1 ? <span className="when">{t('flags.severalJobs', { count: jobCount })}</span> : null}
      <span className="when">{declineNote(t, ws, flag, true)}</span>
    </div>
  );
}
