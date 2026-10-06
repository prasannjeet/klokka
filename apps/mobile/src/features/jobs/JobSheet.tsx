import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  Entry,
  Job,
  JobLocation,
  JobWrite,
  MyWorkspace,
  Rounding,
  JobRecurrenceRule,
  JobChangeScope,
} from '@klokka/api-client';
import {
  QUICK_CHIPS,
  formatDate,
  formatHours,
  joinHours,
  minuteOptions,
  roundHours,
  splitHours,
  type IsoDate,
} from '@klokka/core';
import { useCreateJob, useDeleteJob, useUpdateJob } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { formatDuration } from '@/lib/duration';
import { problemMessage } from '@/lib/problems';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import {
  AppPressable,
  AppSheet,
  AppText,
  Button,
  Card,
  Chip,
  Icon,
  Row,
  Separator,
  TextField,
  Wheel,
  WheelGroup,
  haptic,
  useToast,
  type SheetHandle,
} from '@/ui';
import * as Crypto from 'expo-crypto';
import { todayIn } from '@/lib/dates';
import { RecurrenceEditor } from './RecurrenceEditor';
import { RecurrenceSummary } from './RecurrenceSummary';
import { endTime } from './JobCard';
import { LocationPicker } from './LocationPicker';

export interface JobSheetTarget {
  membershipId: string;
  memberName: string;
  date: IsoDate;
  // The job being edited; absent adds a new job to the day.
  job?: Job | null;
  // The day's total before this sheet, for the subtitle ("day total 3 h so far").
  dayHours?: number;
  // Yesterday's hours for the "same as yesterday" chip.
  yesterdayHours?: number | null;
  rounding: Rounding;
  defaultDayHours: number;
}

export interface JobSheetHandle {
  open: (target: JobSheetTarget) => void;
  dismiss: () => void;
}

const HOUR_VALUES = Array.from({ length: 25 }, (_, i) => i);
const START_HOURS = Array.from({ length: 24 }, (_, i) => i);
const START_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const DEFAULT_START = '08:00';

const styles = (t: Theme) =>
  StyleSheet.create({
    group: { paddingVertical: 0, paddingHorizontal: t.space[4] },
    groupRow: { minHeight: 48, paddingVertical: t.space[2] },
    series: { paddingVertical: t.space[3] },
    label: { paddingHorizontal: t.space[1] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    note: { minHeight: t.tapMin * 2, textAlignVertical: 'top' },
    actions: { gap: t.space[2] },
    back: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], minHeight: t.tapMin },
  });

type Panel = 'job' | 'location' | 'start' | 'repeat' | 'scope';

// A job on a member's day (CHQ-156, restyled in CHQ-162): where, when and how often in one grouped list,
// the hour and minute wheels (CHQ-155; minutes follow the workspace rounding), quick picks, a note, and a
// button that says what it saves. Location, start time and repeat open as panels of this same sheet, so no
// sheet sits on another; AppSheet scrolls the body when it is taller than the screen.
export const JobSheet = forwardRef<
  JobSheetHandle,
  { workspace: MyWorkspace; onSaved?: (entry: Entry) => void }
>(function JobSheet({ workspace, onSaved }, ref) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const toast = useToast();
  const sheet = useRef<SheetHandle>(null);
  const create = useCreateJob(workspace.workspaceId);
  const update = useUpdateJob(workspace.workspaceId);
  const remove = useDeleteJob(workspace.workspaceId);
  const [target, setTarget] = useState<JobSheetTarget | null>(null);
  const [panel, setPanel] = useState<Panel>('job');
  const [time, setTime] = useState({ hours: 0, minutes: 0 });
  // The time the sheet opened with: an untouched time keeps the job's stored hours exactly.
  const [initial, setInitial] = useState({ hours: 0, minutes: 0 });
  const [note, setNote] = useState('');
  const [location, setLocation] = useState<JobLocation | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [draftStart, setDraftStart] = useState({ hours: 8, minutes: 0 });
  const [recurrence, setRecurrence] = useState<JobRecurrenceRule | undefined>();
  const [recurrenceReady, setRecurrenceReady] = useState(true);
  const [requestId, setRequestId] = useState(() => Crypto.randomUUID());
  const [scopeAction, setScopeAction] = useState<'save' | 'remove'>('save');
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    open: (next) => {
      setTarget(next);
      setPanel('job');
      const opened = splitHours(next.job?.hours ?? 0, next.rounding);
      setTime(opened);
      setInitial(opened);
      setNote(next.job?.note ?? '');
      setLocation(next.job?.location ?? null);
      setStartTime(next.job?.startTime ?? null);
      setError(null);
      setRecurrence(undefined);
      setRecurrenceReady(true);
      setRequestId(Crypto.randomUUID());
      sheet.current?.present();
    },
    dismiss: () => sheet.current?.dismiss(),
  }));

  if (!target) return <AppSheet ref={sheet} closeLabel={t('common.close')} testID="job-sheet-empty" />;

  const editing = !!target.job;
  const minutes = minuteOptions(target.rounding);
  const setHours = (value: number) => setTime(splitHours(value, target.rounding));
  const untouched = target.job != null && time.hours === initial.hours && time.minutes === initial.minutes;
  const rounded =
    untouched && target.job
      ? target.job.hours
      : roundHours(joinHours(time.hours, time.minutes), target.rounding);
  const canSave = rounded > 0 && recurrenceReady;
  const durationLabel = formatDuration(rounded, t);
  const dateLabel = formatDate(target.date, locale, 'long');
  const subtitle =
    target.dayHours != null && target.dayHours > 0
      ? t('jobs.dayTotalSoFar', { date: dateLabel, duration: formatDuration(target.dayHours, t) })
      : dateLabel;
  const firstName = target.memberName.split(' ')[0] ?? target.memberName;

  const save = async (scope: JobChangeScope = 'ONLY_THIS') => {
    if (!canSave) return;
    setError(null);
    const job: JobWrite = {
      hours: rounded,
      startTime,
      note: note.trim() === '' ? null : note.trim(),
      ...(location ? { location } : {}),
      ...(!target.job && recurrence ? { recurrence, requestId } : {}),
    };
    try {
      const entry = target.job
        ? await update.mutateAsync({ jobId: target.job.id, job, ...(target.job.recurrence ? { scope } : {}) })
        : await create.mutateAsync({ membershipId: target.membershipId, date: target.date, job });
      void haptic('success');
      toast.show(
        recurrence
          ? t('recurrence.saved')
          : t('jobs.saved', { duration: durationLabel, name: target.memberName }),
      );
      onSaved?.(entry);
      sheet.current?.dismiss();
    } catch (e) {
      void haptic('error');
      setError(await problemMessage(e, t));
    }
  };

  const clear = async (scope: JobChangeScope = 'ONLY_THIS') => {
    if (!target.job) return;
    setError(null);
    try {
      await remove.mutateAsync(target.job.recurrence ? { jobId: target.job.id, scope } : target.job.id);
      toast.show(t('jobs.removed'));
      sheet.current?.dismiss();
    } catch (e) {
      setError(await problemMessage(e, t));
    }
  };

  const openStart = () => {
    const [h, m] = (startTime ?? DEFAULT_START).split(':').map(Number) as [number, number];
    setDraftStart({ hours: h, minutes: m - (m % 5) });
    setPanel('start');
  };
  const two = (n: number) => String(n).padStart(2, '0');

  const backRow = (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={() => setPanel('job')}
      style={s.back}
      testID="job-panel-back"
    >
      <Icon name="chevron-left" size={20} />
      <AppText weight={600}>{t('common.back')}</AppText>
    </AppPressable>
  );

  return (
    <AppSheet
      ref={sheet}
      title={
        panel === 'location'
          ? t('places.title')
          : editing
            ? t('jobs.editJobFor', { name: target.memberName })
            : t('jobs.newJobFor', { name: target.memberName })
      }
      subtitle={subtitle}
      closeLabel={t('common.close')}
      onDismiss={() => setTarget(null)}
      testID="job-sheet"
    >
      {panel === 'repeat' ? (
        <View style={{ gap: theme.space[3] }}>
          {backRow}
          <RecurrenceEditor
            workspaceId={workspace.workspaceId}
            date={target.date}
            value={recurrence}
            onChange={setRecurrence}
            onReady={setRecurrenceReady}
            onDone={() => setPanel('job')}
          />
        </View>
      ) : panel === 'scope' ? (
        <View style={{ gap: theme.space[3] }}>
          {backRow}
          <AppText weight={600}>
            {t(scopeAction === 'save' ? 'recurrence.scope' : 'recurrence.removeScope')}
          </AppText>
          <AppText variant="small" tone="muted">
            {t(scopeAction === 'save' ? 'recurrence.scopeHint' : 'recurrence.confirmStop')}
          </AppText>
          {(['ONLY_THIS', 'THIS_AND_FUTURE'] as const)
            .filter((scope) => scope === 'ONLY_THIS' || target.date >= todayIn(workspace.timezone))
            .map((scope) => (
              <Button
                key={scope}
                label={t(
                  scope === 'ONLY_THIS'
                    ? 'recurrence.only'
                    : scopeAction === 'remove'
                      ? 'recurrence.stop'
                      : 'recurrence.future',
                )}
                variant={scope === 'ONLY_THIS' ? 'primary' : 'outline'}
                onPress={() => void (scopeAction === 'save' ? save(scope) : clear(scope))}
                loading={update.isPending || remove.isPending}
                testID={`scope-${scope}`}
              />
            ))}
          {error ? (
            <AppText tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
        </View>
      ) : panel === 'location' ? (
        <View style={{ gap: theme.space[2] }}>
          {backRow}
          <LocationPicker
            workspaceId={workspace.workspaceId}
            value={location}
            onPick={(next) => {
              setLocation(next);
              setPanel('job');
            }}
          />
        </View>
      ) : panel === 'start' ? (
        <View style={{ gap: theme.space[4] }}>
          {backRow}
          <WheelGroup>
            <Wheel
              values={START_HOURS}
              value={draftStart.hours}
              onChange={(h) => setDraftStart({ hours: h, minutes: draftStart.minutes })}
              format={two}
              unit=""
              accessibilityLabel={t('jobs.startsAt')}
              testID="wheel-start-hours"
            />
            <Wheel
              values={START_MINUTES}
              value={draftStart.minutes}
              onChange={(m) => setDraftStart({ hours: draftStart.hours, minutes: m })}
              format={two}
              unit=""
              accessibilityLabel={t('jobs.startsAt')}
              testID="wheel-start-minutes"
            />
          </WheelGroup>
          <View style={s.actions}>
            <Button
              label={t('mobile.common.done')}
              onPress={() => {
                setStartTime(`${two(draftStart.hours)}:${two(draftStart.minutes)}`);
                setPanel('job');
              }}
              testID="start-done"
            />
            <Button
              label={t('jobs.notSet')}
              variant="ghost"
              onPress={() => {
                setStartTime(null);
                setPanel('job');
              }}
              testID="start-clear"
            />
          </View>
        </View>
      ) : (
        <View style={{ gap: theme.space[4] }}>
          <View style={{ gap: theme.space[2] }}>
            <Card style={s.group}>
              <Row
                title={t('jobs.location')}
                value={location?.name ?? t('jobs.noLocation')}
                leading={<Icon name="map-pin" size={18} color={theme.color.primary} />}
                onPress={() => setPanel('location')}
                chevron
                style={s.groupRow}
                accessibilityLabel={`${t('jobs.location')}, ${location?.name ?? t('jobs.noLocation')}`}
                testID="job-location"
              />
              <Separator />
              <Row
                title={t('jobs.startsAt')}
                value={startTime ?? t('jobs.notSet')}
                leading={<Icon name="clock" size={18} color={theme.color.accent} />}
                onPress={openStart}
                chevron
                style={s.groupRow}
                accessibilityLabel={`${t('jobs.startsAt')}, ${startTime ?? t('jobs.notSet')}`}
                testID="job-start"
              />
              {target.job?.recurrence ? (
                <>
                  <Separator />
                  <View style={s.series}>
                    <RecurrenceSummary series={target.job.recurrence} />
                  </View>
                </>
              ) : !editing && target.date >= todayIn(workspace.timezone) ? (
                <>
                  <Separator />
                  <Row
                    title={t('recurrence.title')}
                    value={t(
                      recurrence
                        ? recurrence.frequency === 'WEEKLY'
                          ? 'recurrence.weekly'
                          : 'recurrence.monthly'
                        : 'recurrence.once',
                    )}
                    leading={<Icon name="refresh" size={18} color={theme.color.pop1} />}
                    onPress={() => setPanel('repeat')}
                    chevron
                    style={s.groupRow}
                    testID="job-repeat"
                  />
                </>
              ) : null}
            </Card>
            <AppText variant="caption" tone="muted" style={s.label} testID="job-start-hint">
              {startTime
                ? t('jobs.runsReminder', {
                    from: startTime,
                    to: endTime(startTime, rounded),
                    name: firstName,
                  })
                : t('jobs.noStartNoReminder', { name: firstName })}
            </AppText>
          </View>
          <View style={{ gap: theme.space[2] }}>
            <AppText variant="small" weight={600} tone="muted" style={s.label}>
              {t('entry.hoursWheel')}
            </AppText>
            <WheelGroup
              footer={
                <AppText variant="caption" tone="muted" align="center" testID="saved-as">
                  {t('entry.savedAs', { hours: formatHours(rounded, locale) })}
                </AppText>
              }
            >
              <Wheel
                values={HOUR_VALUES}
                value={time.hours}
                onChange={(h) => setTime({ hours: h, minutes: h === 24 ? 0 : time.minutes })}
                format={String}
                unit={t('common.hourUnit')}
                accessibilityLabel={t('entry.hoursWheel')}
                testID="wheel-hours"
              />
              <Wheel
                values={time.hours === 24 ? [0] : minutes}
                value={time.minutes}
                onChange={(m) => setTime({ hours: time.hours, minutes: m })}
                format={(m) => String(m).padStart(2, '0')}
                unit={t('common.minuteUnit')}
                accessibilityLabel={t('entry.minutesWheel')}
                testID="wheel-minutes"
              />
            </WheelGroup>
            <View style={s.chips} accessibilityLabel={t('week.quickHours')}>
              {QUICK_CHIPS.map((value) => (
                <Chip
                  key={value}
                  label={formatDuration(value, t)}
                  selected={rounded === value}
                  onPress={() => setHours(value)}
                  testID={`chip-${value}`}
                />
              ))}
              <Chip
                label={t('week.fullDayWithHours', { hours: formatDuration(target.defaultDayHours, t) })}
                selected={rounded === target.defaultDayHours}
                onPress={() => setHours(target.defaultDayHours)}
                testID="chip-full-day"
              />
              {target.yesterdayHours != null && target.yesterdayHours > 0 ? (
                <Chip
                  label={t('week.sameAsYesterdayWithHours', {
                    hours: formatDuration(target.yesterdayHours, t),
                  })}
                  icon="history"
                  selected={rounded === target.yesterdayHours}
                  onPress={() => setHours(target.yesterdayHours as number)}
                  testID="same-as-yesterday"
                />
              ) : null}
            </View>
          </View>
          <TextField
            label={t('week.noteOptional')}
            placeholder={t('week.notePlaceholder')}
            value={note}
            onChangeText={setNote}
            maxLength={500}
            multiline
            numberOfLines={3}
            style={s.note}
            testID="entry-note"
          />
          {error ? (
            <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          ) : null}
          <View style={s.actions}>
            <Button
              label={
                rounded > 0
                  ? recurrence
                    ? t('recurrence.save')
                    : t('jobs.saveJob', { duration: durationLabel })
                  : t('jobs.chooseTimeFirst')
              }
              onPress={() => {
                if (target.job?.recurrence) {
                  setScopeAction('save');
                  setPanel('scope');
                } else void save();
              }}
              disabled={!canSave}
              loading={create.isPending || update.isPending}
              testID="save-job"
            />
            {editing ? (
              <Button
                label={t('jobs.removeJob')}
                variant="ghost"
                onPress={() => {
                  if (target.job?.recurrence) {
                    setScopeAction('remove');
                    setPanel('scope');
                  } else void clear();
                }}
                loading={remove.isPending}
                hapticKind="warning"
                testID="remove-job"
              />
            ) : null}
          </View>
        </View>
      )}
    </AppSheet>
  );
});
