'use client';

// Add or change one job (CHQ-156, design screen 13): the time on two wheels (the minutes the workspace
// rounding allows), quick picks, an optional start time (the employee's reminder needs one), the place and a
// note. Saving writes the job; the API keeps the day the sum of its jobs.
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Job, JobLocation, Rounding, JobRecurrenceRule } from '@klokka/api-client';
import { formatDate, joinHours, minuteOptions, splitHours, type IsoDate } from '@klokka/core';
import { api } from '@/lib/api';
import { requestId as newRequestId } from '@/lib/request-id';
import { useLocale, useT } from '@/lib/i18n';
import { endTime, formatDuration } from '@/lib/jobs';
import { problemMessage, toProblem } from '@/lib/problem';
import { invalidateFigures } from '@/lib/queries';
import { dateOf, todayIn } from '@/lib/time';
import { firstName } from '@/lib/visual';
import type { WorkspaceView } from '@/lib/workspace';
import { Dialog } from '../dialog';
import { Icon } from '../icons';
import { useToast } from '../toast';
import { LocationPicker, placesKey } from './location-picker';
import { TimeWheels } from './time-wheels';
import { RecurrenceEditor } from './recurrence-editor';
import { RecurrenceSummary } from './recurrence-summary';

const QUICK = [0.5, 1, 2, 4] as const;

export function JobDialog({
  ws,
  open,
  onClose,
  membershipId,
  personName,
  date,
  job,
  rounding,
  defaultDayHours,
  dayTotal,
}: {
  ws: WorkspaceView;
  open: boolean;
  onClose: () => void;
  membershipId: string;
  personName: string;
  date: IsoDate;
  job: Job | null;
  rounding: Rounding;
  defaultDayHours: number;
  dayTotal: number;
}) {
  const t = useT();
  const locale = useLocale();
  const name = firstName(personName);
  const title = job ? t('jobs.editJobFor', { name }) : t('jobs.newJobFor', { name });
  const dayLabel = formatDate(date, locale, 'weekdayDayMonth');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={t('jobs.dayTotalSoFar', {
        date: dayLabel.charAt(0).toLocaleUpperCase() + dayLabel.slice(1),
        duration: formatDuration(dayTotal, t),
      })}
    >
      {open ? (
        <JobForm
          key={job?.id ?? 'new'}
          ws={ws}
          onClose={onClose}
          membershipId={membershipId}
          name={name}
          date={date}
          job={job}
          rounding={rounding}
          defaultDayHours={defaultDayHours}
        />
      ) : null}
    </Dialog>
  );
}

function JobForm({
  ws,
  onClose,
  membershipId,
  name,
  date,
  job,
  rounding,
  defaultDayHours,
}: {
  ws: WorkspaceView;
  onClose: () => void;
  membershipId: string;
  name: string;
  date: IsoDate;
  job: Job | null;
  rounding: Rounding;
  defaultDayHours: number;
}) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [initial] = useState(() => splitHours(job?.hours ?? 0, rounding));
  const [time, setTime] = useState(initial);
  const [startTime, setStartTime] = useState(job?.startTime ?? '');
  const [note, setNote] = useState(job?.note ?? '');
  const [location, setLocation] = useState<JobLocation | null>(job?.location ?? null);
  const [recurrence, setRecurrence] = useState<JobRecurrenceRule | undefined>();
  const [recurrenceReady, setRecurrenceReady] = useState(true);
  const [requestId] = useState(() => newRequestId());
  const [scope, setScope] = useState<'ONLY_THIS' | 'THIS_AND_FUTURE'>('ONLY_THIS');
  const [error, setError] = useState<string | null>(null);
  // An untouched time keeps the stored hours exactly (whole minutes would turn 7.01 into 7.02 on a note edit).
  const untouched = job != null && time.hours === initial.hours && time.minutes === initial.minutes;
  const hours = untouched ? job.hours : joinHours(time.hours, time.minutes);
  const duration = formatDuration(hours, t);

  const save = useMutation({
    mutationFn: () => {
      const jobWrite = {
        hours,
        startTime: startTime || null,
        note: note.trim() || null,
        ...(location ? { location } : {}),
      };
      return job
        ? api.jobs.updateJob({ workspaceId: ws.id, jobId: job.id, jobWrite, scope })
        : api.jobs.createJob({
            workspaceId: ws.id,
            membershipId,
            date: dateOf(date),
            jobWrite: { ...jobWrite, ...(recurrence ? { recurrence, requestId } : {}) },
          });
    },
    onSuccess: () => {
      toast({
        title: recurrence ? t('recurrence.saved') : t('jobs.saved', { duration, name }),
        icon: 'check',
      });
      onClose();
    },
    onError: async (e) => setError(problemMessage(t, await toProblem(e))),
    onSettled: () => {
      void invalidateFigures(queryClient, ws.id);
      void queryClient.invalidateQueries({ queryKey: placesKey(ws.id) });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (hours <= 0 || !recurrenceReady) return;
    setError(null);
    save.mutate();
  }

  const pick = (h: number) => setTime(splitHours(h, rounding));

  return (
    <form className="job-form" onSubmit={submit} noValidate>
      <div className="job-form-cols">
        <div className="job-form-col">
          <span className="lbl">{t('entry.hoursYouWorked')}</span>
          <TimeWheels
            hours={time.hours}
            minutes={time.minutes}
            minuteOptions={minuteOptions(rounding)}
            onChange={(h, m) => setTime({ hours: h, minutes: m })}
            hourUnit={t('common.hourUnit')}
            minuteUnit={t('common.minuteUnit')}
            hoursLabel={t('entry.hoursWheel')}
            minutesLabel={t('entry.minutesWheel')}
          />
          <div className="chips" role="group" aria-label={t('week.quickHours')}>
            {QUICK.map((h) => (
              <button
                key={h}
                type="button"
                className="chip"
                aria-pressed={hours === h}
                onClick={() => pick(h)}
              >
                {formatDuration(h, t)}
              </button>
            ))}
            <button
              type="button"
              className="chip"
              aria-pressed={hours === defaultDayHours}
              onClick={() => pick(defaultDayHours)}
            >
              {t('week.fullDayWithHours', { hours: formatDuration(defaultDayHours, t) })}
            </button>
          </div>
          <div className="field">
            <label htmlFor="job-start">{t('jobs.startsAt')}</label>
            <input
              id="job-start"
              className="input short"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <span className="hint">
              {startTime
                ? t('jobs.runsReminder', { from: startTime, to: endTime(startTime, hours), name })
                : t('jobs.noStartNoReminder', { name })}
            </span>
          </div>
        </div>
        <div className="job-form-col">
          <span className="lbl">{t('jobs.location')}</span>
          <LocationPicker workspaceId={ws.id} value={location} onChange={setLocation} />
          <div className="field">
            <label htmlFor="job-note">{t('week.noteOptional')}</label>
            <textarea
              id="job-note"
              className="input"
              rows={3}
              maxLength={500}
              placeholder={t('week.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
      </div>
      {job?.recurrence ? (
        <>
          <RecurrenceSummary series={job.recurrence} />
          <div className="field">
            <label htmlFor="job-scope">{t('recurrence.scope')}</label>
            <select
              id="job-scope"
              className="input"
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
            >
              <option value="ONLY_THIS">{t('recurrence.only')}</option>
              {date >= todayIn(ws.timezone) ? (
                <option value="THIS_AND_FUTURE">{t('recurrence.future')}</option>
              ) : null}
            </select>
            <span className="hint">{t('recurrence.scopeHint')}</span>
          </div>
        </>
      ) : !job && date >= todayIn(ws.timezone) ? (
        <RecurrenceEditor
          workspaceId={ws.id}
          date={date}
          value={recurrence}
          onChange={setRecurrence}
          onReady={setRecurrenceReady}
        />
      ) : null}
      {error ? (
        <p className="err" role="alert">
          {error}
        </p>
      ) : null}
      <div className="dlg-actions">
        <button className="btn btn-ghost" type="button" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={hours <= 0 || !recurrenceReady || save.isPending}
        >
          <Icon name="check" />
          {hours > 0
            ? recurrence
              ? t('recurrence.save')
              : t('jobs.saveJob', { duration })
            : t('jobs.chooseTimeFirst')}
        </button>
      </div>
    </form>
  );
}
