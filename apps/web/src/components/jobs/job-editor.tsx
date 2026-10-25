'use client';

// The job editor (CHQ-185, replaces the job dialog of CHQ-156): a page, so a stray click cannot lose what was
// typed. `single` adds one job to the day it came from, `full` (New job) also picks the date and a repeat, `edit`
// changes a job and, for a recurring one, its schedule or a range of its series (CHQ-187). Leaving with changes
// asks first, on every way out (Cancel, a link, the browser's Back, a reload). The time sits on two wheels (the
// minutes the workspace rounding allows), with quick picks, an optional start time (the employee's reminder needs
// one), the place and a note. An optional title (CHQ-191) comes first: it is the job's main label everywhere.
// Saving writes the job; the API keeps the day the sum of its jobs.
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Job, JobChangeScope, JobLocation, JobRecurrenceRule, JobWrite } from '@klokka/api-client';
import {
  addDays,
  describeRecurrence,
  formatDate,
  joinHours,
  minuteOptions,
  splitHours,
  type IsoDate,
} from '@klokka/core';
import { api } from '@/lib/api';
import { useLocale, useT } from '@/lib/i18n';
import type { JobEditorMode } from '@/lib/job-links';
import { endTime, formatDuration } from '@/lib/jobs';
import { problemMessage, toProblem } from '@/lib/problem';
import { invalidateFigures, useEntries, useMember, useWorkspaceDetails } from '@/lib/queries';
import { requestId as newRequestId } from '@/lib/request-id';
import { dateOf, isoOf, todayIn } from '@/lib/time';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { firstName } from '@/lib/visual';
import { useWorkspace, type WorkspaceView } from '@/lib/workspace';
import { Icon } from '../icons';
import { useToast } from '../toast';
import { LocationPicker, placesKey } from './location-picker';
import { RecurrenceEditor, editableRule, ruleKey } from './recurrence-editor';
import { RecurrenceSummary } from './recurrence-summary';
import { ScopeStep } from './scope-step';
import { TimeWheels } from './time-wheels';
import './jobs.css';

const QUICK = [0.5, 1, 2, 4] as const;
// The contract's Job.title maxLength (CHQ-191).
const TITLE_MAX = 120;

type Panel = 'job' | 'repeat' | 'scope';

export interface JobEditorProps {
  membershipId: string;
  date: IsoDate;
  mode: JobEditorMode;
  jobId?: string | undefined;
  // Where Cancel, Save and Discard return to (already checked with safeBack).
  back: string;
}

const capitalise = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

// The page around the editor: a top bar (the way out, the title, what the job is for), one centred column and,
// while editing the job itself, the actions in a footer that stays in reach on a phone.
function EditorFrame({
  leading,
  title,
  subtitle,
  footer,
  children,
}: {
  leading: ReactNode;
  title: string;
  subtitle?: string | undefined;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="view job-editor" aria-labelledby="h-job">
      <header className="je-top">
        {leading}
        <h1 id="h-job">{title}</h1>
        {subtitle ? <p className="sub">{subtitle}</p> : null}
      </header>
      <div className="je-body">{children}</div>
      {footer ? <div className="je-foot">{footer}</div> : null}
    </section>
  );
}

export function JobEditor({ membershipId, date, mode, jobId, back }: JobEditorProps) {
  const t = useT();
  const router = useRouter();
  const ws = useWorkspace();
  const member = useMember(ws.id, membershipId);
  const entries = useEntries(ws.id, addDays(date, -1), date, membershipId);
  const cancel = (
    <button className="btn btn-ghost btn-sm je-out" type="button" onClick={() => router.push(back)}>
      <Icon name="arrow-left" />
      {t('common.cancel')}
    </button>
  );
  if (member.isPending || entries.isPending) {
    return (
      <EditorFrame leading={cancel} title={mode === 'edit' ? t('jobs.edit') : t('jobs.newJob')}>
        <p className="muted" role="status">
          {mode === 'edit' ? t('jobs.loadingJob') : t('common.loading')}
        </p>
      </EditorFrame>
    );
  }
  if (member.isError || entries.isError) {
    return (
      <EditorFrame leading={cancel} title={mode === 'edit' ? t('jobs.edit') : t('jobs.newJob')}>
        <p className="err" role="alert">
          {t('errors.NETWORK')}
        </p>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            void member.refetch();
            void entries.refetch();
          }}
        >
          {t('common.retry')}
        </button>
      </EditorFrame>
    );
  }
  const day = entries.data.find((e) => isoOf(e.workDate) === date) ?? null;
  const job = mode === 'edit' ? (day?.jobs.find((j) => j.id === jobId) ?? null) : null;
  if (mode === 'edit' && !job) {
    return (
      <EditorFrame leading={cancel} title={t('jobs.jobGone')}>
        <button className="btn btn-primary" type="button" onClick={() => router.push(back)}>
          <Icon name="arrow-left" />
          {t('common.back')}
        </button>
      </EditorFrame>
    );
  }
  return (
    <JobForm
      ws={ws}
      membershipId={membershipId}
      memberName={member.data.displayName}
      date={date}
      mode={mode}
      job={job}
      back={back}
    />
  );
}

function sameLocation(a: JobLocation | null, b: JobLocation | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.placeId === b.placeId && a.name === b.name && a.latitude === b.latitude && a.longitude === b.longitude
  );
}

function JobForm({
  ws,
  membershipId,
  memberName,
  date,
  mode,
  job,
  back,
}: {
  ws: WorkspaceView;
  membershipId: string;
  memberName: string;
  date: IsoDate;
  mode: JobEditorMode;
  job: Job | null;
  back: string;
}) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const details = useWorkspaceDetails(ws.id);
  const rounding = details.data?.rounding ?? ws.my.rounding;
  const defaultDayHours = details.data?.defaultDayHours ?? ws.my.defaultDayHours;
  const today = todayIn(ws.timezone);
  const series = job?.recurrence ?? null;
  // A live series can change its schedule; a stopped one only shows what it was.
  const editableSeries = series && !series.stopped ? series : null;
  // Everything the page opened with: an untouched form leaves without asking, an untouched time keeps the job's
  // stored hours exactly (whole minutes would turn 7.01 into 7.02 on a note edit).
  const [opened] = useState(() => ({
    time: splitHours(job?.hours ?? 0, rounding),
    rule: editableSeries ? editableRule(editableSeries) : undefined,
  }));
  const [panel, setPanel] = useState<Panel>('job');
  const [time, setTime] = useState(opened.time);
  const [jobTitle, setJobTitle] = useState(job?.title ?? '');
  const [startTime, setStartTime] = useState(job?.startTime ?? '');
  const [note, setNote] = useState(job?.note ?? '');
  const [location, setLocation] = useState<JobLocation | null>(job?.location ?? null);
  const [workDate, setWorkDate] = useState<IsoDate>(date);
  const [recurrence, setRecurrence] = useState<JobRecurrenceRule | undefined>(opened.rule);
  const [recurrenceReady, setRecurrenceReady] = useState(true);
  // One key per page: a retried save of the same series is recognised by the API, never created twice.
  const [requestId] = useState(() => newRequestId());
  const [scopeAction, setScopeAction] = useState<'save' | 'remove'>('save');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const range = useEntries(ws.id, addDays(workDate, -1), workDate, membershipId);

  const ruleChanged = !!editableSeries && ruleKey(recurrence) !== ruleKey(opened.rule);
  const dirty =
    !saved &&
    (time.hours !== opened.time.hours ||
      time.minutes !== opened.time.minutes ||
      jobTitle !== (job?.title ?? '') ||
      note !== (job?.note ?? '') ||
      startTime !== (job?.startTime ?? '') ||
      !sameLocation(location, job?.location ?? null) ||
      workDate !== date ||
      ruleKey(recurrence) !== ruleKey(opened.rule));
  const guard = useUnsavedGuard(dirty);

  const untouched = job != null && time.hours === opened.time.hours && time.minutes === opened.time.minutes;
  const hours = untouched ? job.hours : joinHours(time.hours, time.minutes);
  const repeatable = mode === 'full' && workDate >= today;
  const sendsRule = (repeatable && !!recurrence) || ruleChanged;
  const canSave = hours > 0 && (!sendsRule || recurrenceReady);
  const duration = formatDuration(hours, t);
  const name = firstName(memberName);
  const dayHours = range.data?.find((e) => isoOf(e.workDate) === workDate)?.hours ?? 0;
  const yesterdayHours = range.data?.find((e) => isoOf(e.workDate) === addDays(workDate, -1))?.hours ?? null;
  const dateLabel = capitalise(formatDate(workDate, locale, 'long'));
  const title =
    mode === 'single'
      ? t('jobs.newSingleJobFor', { name })
      : mode === 'edit'
        ? t('jobs.editJobFor', { name })
        : t('jobs.newJobFor', { name });
  const subtitle =
    mode === 'single'
      ? t('jobs.singleSubtitle', { date: dateLabel })
      : dayHours > 0
        ? t('jobs.dayTotalSoFar', { date: dateLabel, duration: formatDuration(dayHours, t) })
        : dateLabel;
  // A changed schedule applies from the later of this job's date and today; earlier jobs keep their dates.
  const scheduleFrom = date > today ? date : today;

  const done = () => {
    setSaved(true);
    void invalidateFigures(queryClient, ws.id);
    guard.leaveNow(back);
  };

  const save = useMutation({
    mutationFn: (scope: JobChangeScope | undefined) => {
      const jobWrite: JobWrite = {
        hours,
        startTime: startTime || null,
        title: jobTitle.trim() || null,
        note: note.trim() || null,
        ...(location ? { location } : {}),
        ...(sendsRule && recurrence ? { recurrence, requestId } : {}),
      };
      return job
        ? api.jobs.updateJob({
            workspaceId: ws.id,
            jobId: job.id,
            jobWrite,
            ...(series && scope ? { scope } : {}),
          })
        : api.jobs.createJob({ workspaceId: ws.id, membershipId, date: dateOf(workDate), jobWrite });
    },
    onSuccess: () => {
      toast({
        title: sendsRule ? t('recurrence.saved') : t('jobs.saved', { duration, name }),
        icon: 'check',
      });
      done();
    },
    onError: async (e) => setError(problemMessage(t, await toProblem(e))),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: placesKey(ws.id) }),
  });

  const remove = useMutation({
    mutationFn: (scope: JobChangeScope | undefined) =>
      api.jobs.deleteJob({ workspaceId: ws.id, jobId: job!.id, ...(series && scope ? { scope } : {}) }),
    onSuccess: () => {
      toast({ title: t('jobs.removed'), icon: 'check' });
      done();
    },
    onError: async (e) => setError(problemMessage(t, await toProblem(e))),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setError(null);
    if (series) {
      setScopeAction('save');
      setPanel('scope');
    } else save.mutate(undefined);
  }

  function removeJob() {
    setError(null);
    if (series) {
      setScopeAction('remove');
      setPanel('scope');
    } else remove.mutate(undefined);
  }

  function changeDate(value: string) {
    if (!value) return;
    const next = value as IsoDate;
    setWorkDate(next);
    // A repeat starts today or later; an earlier date is a single job.
    if (next < today) {
      setRecurrence(undefined);
      setRecurrenceReady(true);
    }
  }

  const pick = (h: number) => setTime(splitHours(h, rounding));
  const saveLabel =
    hours > 0
      ? sendsRule && mode !== 'edit'
        ? t('recurrence.save')
        : t('jobs.saveJob', { duration })
      : t('jobs.chooseTimeFirst');
  const stepBack = (
    <button className="btn btn-ghost btn-sm je-out" type="button" onClick={() => setPanel('job')}>
      <Icon name="arrow-left" />
      {t('common.back')}
    </button>
  );

  if (panel === 'repeat') {
    return (
      <EditorFrame leading={stepBack} title={title} subtitle={subtitle}>
        {guard.dialog}
        <RecurrenceEditor
          workspaceId={ws.id}
          date={mode === 'edit' ? scheduleFrom : workDate}
          anchor={mode === 'edit' ? date : undefined}
          value={recurrence}
          onChange={setRecurrence}
          onReady={setRecurrenceReady}
          allowOnce={mode !== 'edit'}
        />
        <div className="je-step-acts">
          <button
            className="btn btn-primary"
            type="button"
            disabled={!recurrenceReady}
            onClick={() => setPanel('job')}
            data-testid="repeat-done"
          >
            <Icon name="check" />
            {t('common.done')}
          </button>
        </div>
      </EditorFrame>
    );
  }
  if (panel === 'scope' && job) {
    return (
      <EditorFrame leading={stepBack} title={title} subtitle={subtitle}>
        {guard.dialog}
        <ScopeStep
          workspaceId={ws.id}
          jobId={job.id}
          action={scopeAction}
          scheduleChange={scopeAction === 'save' && ruleChanged}
          scheduleFrom={scheduleFrom}
          onConfirm={(scope) => (scopeAction === 'save' ? save.mutate(scope) : remove.mutate(scope))}
          busy={save.isPending || remove.isPending}
          error={error}
        />
      </EditorFrame>
    );
  }

  return (
    <form className="job-form" onSubmit={submit} noValidate>
      <EditorFrame
        leading={
          <button
            className="btn btn-ghost btn-sm je-out"
            type="button"
            onClick={() => guard.requestLeave(back)}
            data-testid="job-cancel"
          >
            <Icon name="arrow-left" />
            {t('common.cancel')}
          </button>
        }
        title={title}
        subtitle={subtitle}
        footer={
          <>
            {job ? (
              <button
                className="btn btn-ghost danger"
                type="button"
                onClick={removeJob}
                disabled={remove.isPending}
                data-testid="remove-job"
              >
                <Icon name="trash" />
                {t('jobs.removeJob')}
              </button>
            ) : null}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!canSave || save.isPending}
              data-testid="save-job"
            >
              <Icon name="check" />
              {saveLabel}
            </button>
          </>
        }
      >
        {guard.dialog}
        <div className="field">
          <label htmlFor="job-title">{t('jobs.jobTitle')}</label>
          <input
            id="job-title"
            className="input"
            type="text"
            maxLength={TITLE_MAX}
            autoComplete="off"
            enterKeyHint="next"
            placeholder={t('jobs.jobTitlePlaceholder')}
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            // One line: Enter does not save a half-filled job.
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.preventDefault();
            }}
          />
        </div>
        <div className="job-form-cols">
          <div className="job-form-col">
            {mode === 'full' ? (
              <div className="field">
                <label htmlFor="job-date">{t('jobs.date')}</label>
                <input
                  id="job-date"
                  className="input"
                  type="date"
                  value={workDate}
                  min={recurrence ? today : undefined}
                  onChange={(e) => changeDate(e.target.value)}
                />
              </div>
            ) : null}
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
              {yesterdayHours != null && yesterdayHours > 0 ? (
                <button
                  type="button"
                  className="chip"
                  aria-pressed={hours === yesterdayHours}
                  onClick={() => pick(yesterdayHours)}
                  data-testid="same-as-yesterday"
                >
                  <Icon name="history" />
                  {t('week.sameAsYesterdayWithHours', { hours: formatDuration(yesterdayHours, t) })}
                </button>
              ) : null}
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
        {repeatable || editableSeries ? (
          <button
            type="button"
            className="je-row"
            onClick={() => setPanel('repeat')}
            data-testid="job-repeat"
          >
            <Icon name="refresh" />
            <span>
              <b>{t('recurrence.title')}</b>
              <small>
                {recurrence
                  ? describeRecurrence(
                      recurrence,
                      editableSeries && !ruleChanged
                        ? isoOf(editableSeries.firstDate)
                        : editableSeries
                          ? scheduleFrom
                          : workDate,
                      t,
                      locale,
                    )
                  : t('recurrence.once')}
              </small>
            </span>
            <Icon name="chev-right" />
          </button>
        ) : series ? (
          <RecurrenceSummary series={series} />
        ) : null}
        {error ? (
          <p className="err" role="alert">
            {error}
          </p>
        ) : null}
      </EditorFrame>
    </form>
  );
}
