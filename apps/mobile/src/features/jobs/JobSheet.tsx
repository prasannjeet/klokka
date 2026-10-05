import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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
  Chip,
  Icon,
  TextField,
  Wheel,
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
    // The time card is a well in the raised sheet; the band marks the row the wheels choose.
    card: {
      backgroundColor: t.color.surface2,
      borderRadius: t.radius.card,
      borderWidth: 1,
      borderColor: t.color.border,
      padding: t.space[3],
      gap: t.space[2],
    },
    wheels: { flexDirection: 'row', gap: t.space[2] },
    band: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: t.tapMin * 2,
      height: t.tapMin,
      borderRadius: t.radius.md,
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.secondary,
    },
    tiles: { flexDirection: 'row', gap: t.space[2] },
    tile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[2],
      padding: t.space[2],
      minHeight: t.tapMin + t.space[3],
      borderRadius: t.radius.lg,
      backgroundColor: t.color.surface2,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    tileIcon: {
      width: 36,
      height: 36,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    note: { minHeight: t.tapMin * 2, textAlignVertical: 'top' },
    chips: { gap: t.space[2], paddingHorizontal: t.space[5] },
    chipRow: { marginHorizontal: -t.space[5] },
    actions: { gap: t.space[2] },
    back: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], minHeight: t.tapMin },
  });

type Panel = 'job' | 'location' | 'start' | 'repeat' | 'scope';

// A job on a member's day (CHQ-156, design screen 4): where and when it starts side by side, the hour and
// minute wheels (CHQ-155; minutes follow the workspace rounding), quick picks, a note, and a button that says
// what it saves. Location and start time open as panels of this same sheet, so no sheet sits on another.
export const JobSheet = forwardRef<
  JobSheetHandle,
  { workspace: MyWorkspace; onSaved?: (entry: Entry) => void }
>(function JobSheet({ workspace, onSaved }, ref) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const { height } = useWindowDimensions();
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
        <ScrollView
          style={{ maxHeight: height - theme.space[9] * 4 }}
          contentContainerStyle={{ gap: theme.space[3] }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {backRow}
          <RecurrenceEditor
            workspaceId={workspace.workspaceId}
            date={target.date}
            value={recurrence}
            onChange={setRecurrence}
            onReady={setRecurrenceReady}
            onDone={() => setPanel('job')}
          />
        </ScrollView>
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
                label={t(scope === 'ONLY_THIS' ? 'recurrence.only' : 'recurrence.future')}
                variant={scope === 'ONLY_THIS' ? 'primary' : 'secondary'}
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
          <View style={s.card}>
            <View style={s.wheels}>
              <View style={s.band} pointerEvents="none" />
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
            </View>
          </View>
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
      ) : (
        <ScrollView
          style={{ maxHeight: height - theme.space[9] * 4 }}
          contentContainerStyle={{ gap: theme.space[4] }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          <View style={s.tiles}>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={`${t('jobs.location')}, ${location?.name ?? t('jobs.noLocation')}`}
              onPress={() => setPanel('location')}
              style={[s.tile, { flex: 1.4 }]}
              testID="job-location"
            >
              <View style={[s.tileIcon, { backgroundColor: theme.color.surface }]}>
                <Icon name="map-pin" size={18} color={theme.color.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="caption" tone="muted" weight={600}>
                  {t('jobs.location')}
                </AppText>
                <AppText variant="small" weight={600} numberOfLines={1}>
                  {location?.name ?? t('jobs.noLocation')}
                </AppText>
              </View>
            </AppPressable>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={`${t('jobs.startsAt')}, ${startTime ?? t('jobs.notSet')}`}
              onPress={openStart}
              style={[s.tile, { flex: 1 }]}
              testID="job-start"
            >
              <View style={[s.tileIcon, { backgroundColor: theme.color.surface }]}>
                <Icon name="clock" size={18} color={theme.color.accent} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="caption" tone="muted" weight={600}>
                  {t('jobs.startsAt')}
                </AppText>
                <AppText variant="small" weight={600} numberOfLines={1}>
                  {startTime ?? t('jobs.notSet')}
                </AppText>
              </View>
            </AppPressable>
          </View>
          <AppText variant="caption" tone="muted" testID="job-start-hint">
            {startTime
              ? t('jobs.runsReminder', { from: startTime, to: endTime(startTime, rounded), name: firstName })
              : t('jobs.noStartNoReminder', { name: firstName })}
          </AppText>
          <View style={s.card}>
            <View style={s.wheels}>
              <View style={s.band} pointerEvents="none" />
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
            </View>
            <AppText variant="small" tone="muted" style={{ textAlign: 'center' }} testID="saved-as">
              {t('entry.savedAs', { hours: formatHours(rounded, locale) })}
            </AppText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.chipRow}
            contentContainerStyle={s.chips}
            accessibilityLabel={t('week.quickHours')}
          >
            {QUICK_CHIPS.map((value, i) => (
              <Chip
                key={value}
                label={formatDuration(value, t)}
                selected={rounded === value}
                onPress={() => setHours(value)}
                index={i}
                testID={`chip-${value}`}
              />
            ))}
            <Chip
              label={t('week.fullDayWithHours', { hours: formatDuration(target.defaultDayHours, t) })}
              selected={rounded === target.defaultDayHours}
              onPress={() => setHours(target.defaultDayHours)}
              index={QUICK_CHIPS.length}
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
                index={QUICK_CHIPS.length + 1}
                testID="same-as-yesterday"
              />
            ) : null}
          </ScrollView>
          {target.job?.recurrence ? (
            <RecurrenceSummary series={target.job.recurrence} />
          ) : !editing && target.date >= todayIn(workspace.timezone) ? (
            <Button
              label={t(
                recurrence
                  ? recurrence.frequency === 'WEEKLY'
                    ? 'recurrence.weekly'
                    : 'recurrence.monthly'
                  : 'recurrence.title',
              )}
              variant="secondary"
              icon="refresh"
              onPress={() => setPanel('repeat')}
              testID="job-repeat"
            />
          ) : null}
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
        </ScrollView>
      )}
    </AppSheet>
  );
});
