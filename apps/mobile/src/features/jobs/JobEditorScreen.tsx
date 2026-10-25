import { useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Crypto from 'expo-crypto';
import type { Job, JobChangeScope, JobLocation, JobRecurrenceRule, JobWrite } from '@klokka/api-client';
import {
  QUICK_CHIPS,
  addDays,
  describeRecurrence,
  formatDate,
  formatHours,
  joinHours,
  minuteOptions,
  roundHours,
  splitHours,
  type IsoDate,
} from '@klokka/core';
import {
  sameDate,
  useCreateJob,
  useDeleteJob,
  useEntries,
  useMember,
  useUpdateJob,
  useWorkspace,
} from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { fromIsoDate, toIsoDate, todayIn } from '@/lib/dates';
import { formatDuration } from '@/lib/duration';
import { problemMessage } from '@/lib/problems';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import {
  AppPressable,
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  Header,
  Icon,
  Row,
  Separator,
  TextField,
  Wheel,
  WheelGroup,
  haptic,
  useToast,
} from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { DateWheels } from './DateWheels';
import { endTime } from './JobCard';
import type { JobEditorMode } from './jobEditorHref';
import { LocationPicker } from './LocationPicker';
import { MapImage } from './MapImage';
import { RecurrenceEditor, editableRule, ruleKey } from './RecurrenceEditor';
import { RecurrenceSummary } from './RecurrenceSummary';
import { ScopeStep } from './ScopeStep';

const HOUR_VALUES = Array.from({ length: 25 }, (_, i) => i);
const START_HOURS = Array.from({ length: 24 }, (_, i) => i);
const START_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const DEFAULT_START = '08:00';
// The contract's maxLength for a job's title (CHQ-191).
const JOB_TITLE_MAX = 120;

const styles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.bg },
    content: { paddingHorizontal: t.space[4], gap: t.space[4] },
    footer: {
      paddingHorizontal: t.space[4],
      paddingTop: t.space[3],
      backgroundColor: t.color.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.color.border,
    },
    textButton: { minHeight: t.tapMin, justifyContent: 'center', paddingHorizontal: t.space[1] },
    group: { paddingVertical: 0, paddingHorizontal: t.space[4] },
    groupRow: { minHeight: 48, paddingVertical: t.space[2] },
    series: { paddingVertical: t.space[3] },
    label: { paddingHorizontal: t.space[1] },
    titleField: { marginBottom: t.space[2] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    note: { minHeight: t.tapMin * 2, textAlignVertical: 'top' },
    actions: { gap: t.space[2] },
    back: { flexDirection: 'row', alignItems: 'center', gap: t.space[1], minHeight: t.tapMin },
    loading: { alignItems: 'center', gap: t.space[3], paddingVertical: t.space[8] },
    mapPreview: {
      borderRadius: t.radius.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.color.border,
    },
  });

type Panel = 'job' | 'start' | 'date' | 'repeat' | 'scope';

export interface JobEditorProps {
  membershipId: string;
  date: IsoDate;
  mode: JobEditorMode;
  jobId?: string | undefined;
}

// The page around the editor: header on top, the body scrolling (the focused field kept above the keyboard), and
// the main action pinned to the bottom for the thumb.
function EditorFrame({
  header,
  footer,
  children,
  testID,
}: {
  header: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  testID: string;
}) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();
  return (
    <View style={s.root} testID={testID}>
      <KeyboardAwareScrollView
        contentContainerStyle={[
          s.content,
          {
            paddingTop: insets.top + theme.space[4],
            paddingBottom: (footer ? 0 : insets.bottom) + theme.space[6],
          },
        ]}
        bottomOffset={theme.tapMin * 2}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {header}
        {children}
      </KeyboardAwareScrollView>
      {footer ? (
        <View style={[s.footer, { paddingBottom: insets.bottom + theme.space[3] }]}>{footer}</View>
      ) : null}
    </View>
  );
}

function TextButton({
  label,
  onPress,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={s.textButton}
      testID={testID}
    >
      <AppText weight={600} color={disabled ? theme.color.textMuted : theme.color.primary}>
        {label}
      </AppText>
    </AppPressable>
  );
}

// The job editor (CHQ-185, replaces the job sheet of CHQ-156/162): a page, so a stray tap cannot lose what was
// typed. `single` adds one job to the day it came from, `full` (New job) also picks the date and a repeat, `edit`
// changes a job and, for a recurring one, its schedule or a range of its series (CHQ-187). Leaving with changes asks
// first, on every way out (Cancel, the back button, the back gesture).
function JobEditorInner({ membershipId, date, mode, jobId, workspace }: JobEditorProps & WorkspaceProps) {
  const t = useT();
  const router = useRouter();
  const member = useMember(workspace.workspaceId, membershipId);
  const entries = useEntries(workspace.workspaceId, addDays(date, -1), date, membershipId);
  const cancel = <TextButton label={t('common.cancel')} onPress={() => router.back()} testID="job-cancel" />;
  if (member.isPending || entries.isPending) {
    return (
      <EditorFrame header={<Header title="" large={false} leading={cancel} />} testID="job-editor-loading">
        <JobEditorLoading label={mode === 'edit' ? t('jobs.loadingJob') : t('common.loading')} />
      </EditorFrame>
    );
  }
  if (entries.isError) {
    return (
      <EditorFrame header={<Header title="" large={false} leading={cancel} />} testID="job-editor-error">
        <EmptyState
          icon="alert"
          title={t('errors.NETWORK')}
          actionLabel={t('common.retry')}
          onAction={() => void entries.refetch()}
        />
      </EditorFrame>
    );
  }
  const day = entries.data.find((e) => sameDate(e.workDate, date)) ?? null;
  const job = mode === 'edit' ? (day?.jobs.find((j) => j.id === jobId) ?? null) : null;
  if (mode === 'edit' && !job) {
    return (
      <EditorFrame header={<Header title="" large={false} leading={cancel} />} testID="job-editor-gone">
        <EmptyState
          icon="briefcase"
          title={t('jobs.jobGone')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </EditorFrame>
    );
  }
  return (
    <JobForm
      workspace={workspace}
      membershipId={membershipId}
      memberName={member.data?.displayName ?? ''}
      date={date}
      mode={mode}
      job={job}
    />
  );
}

function JobEditorLoading({ label }: { label: string }) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  return (
    <View style={s.loading} accessibilityLiveRegion="polite">
      <ActivityIndicator color={theme.color.primary} />
      <AppText tone="muted">{label}</AppText>
    </View>
  );
}

function sameLocation(a: JobLocation | null, b: JobLocation | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.placeId === b.placeId && a.name === b.name && a.latitude === b.latitude && a.longitude === b.longitude
  );
}

function JobForm({
  workspace,
  membershipId,
  memberName,
  date,
  mode,
  job,
}: {
  workspace: WorkspaceProps['workspace'];
  membershipId: string;
  memberName: string;
  date: IsoDate;
  mode: JobEditorMode;
  job: Job | null;
}) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const toast = useToast();
  const router = useRouter();
  const navigation = useNavigation();
  const settings = useWorkspace(workspace.workspaceId);
  const create = useCreateJob(workspace.workspaceId);
  const update = useUpdateJob(workspace.workspaceId);
  const remove = useDeleteJob(workspace.workspaceId);
  const rounding = settings.data?.rounding ?? workspace.rounding;
  const defaultDayHours = settings.data?.defaultDayHours ?? workspace.defaultDayHours;
  const today = todayIn(workspace.timezone);
  const series = job?.recurrence ?? null;
  // A live series can change its schedule; a stopped one only shows what it was.
  const editableSeries = series && !series.stopped ? series : null;
  // Everything the page opened with: an untouched form leaves without asking, an untouched time keeps the job's
  // stored hours exactly.
  const [opened] = useState(() => ({
    time: splitHours(job?.hours ?? 0, rounding),
    rule: editableSeries ? editableRule(editableSeries) : undefined,
  }));
  const [panel, setPanel] = useState<Panel>('job');
  const [time, setTime] = useState(opened.time);
  const [title, setTitle] = useState(job?.title ?? '');
  const [note, setNote] = useState(job?.note ?? '');
  const [location, setLocation] = useState<JobLocation | null>(job?.location ?? null);
  const [picking, setPicking] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(job?.startTime ?? null);
  const [draftStart, setDraftStart] = useState({ hours: 8, minutes: 0 });
  const [workDate, setWorkDate] = useState<IsoDate>(date);
  const [draftDate, setDraftDate] = useState(() => fromIsoDate(date));
  const [recurrence, setRecurrence] = useState<JobRecurrenceRule | undefined>(opened.rule);
  const [recurrenceReady, setRecurrenceReady] = useState(true);
  // One key per page: a retried save of the same series is recognised by the API, never created twice.
  const [requestId] = useState(() => Crypto.randomUUID());
  const [scopeAction, setScopeAction] = useState<'save' | 'remove'>('save');
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(false);
  const range = useEntries(workspace.workspaceId, addDays(workDate, -1), workDate, membershipId);

  const ruleChanged = !!editableSeries && ruleKey(recurrence) !== ruleKey(opened.rule);
  const dirty =
    time.hours !== opened.time.hours ||
    time.minutes !== opened.time.minutes ||
    title !== (job?.title ?? '') ||
    note !== (job?.note ?? '') ||
    startTime !== (job?.startTime ?? null) ||
    !sameLocation(location, job?.location ?? null) ||
    workDate !== date ||
    ruleKey(recurrence) !== ruleKey(opened.rule);

  usePreventRemove(dirty || panel !== 'job', ({ data }) => {
    if (saved.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (panel !== 'job') {
      setPanel('job');
      return;
    }
    Alert.alert(t('jobs.discardTitle'), t('jobs.discardBody'), [
      { text: t('jobs.keepEditing'), style: 'cancel' },
      { text: t('jobs.discard'), style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const minutes = minuteOptions(rounding);
  const setHours = (value: number) => setTime(splitHours(value, rounding));
  const untouched = job != null && time.hours === opened.time.hours && time.minutes === opened.time.minutes;
  const rounded = untouched && job ? job.hours : roundHours(joinHours(time.hours, time.minutes), rounding);
  const repeatable = mode === 'full' && workDate >= today;
  const sendsRule = (mode === 'full' && repeatable && !!recurrence) || ruleChanged;
  const canSave = rounded > 0 && (!sendsRule || recurrenceReady);
  const durationLabel = formatDuration(rounded, t);
  const dayEntry = range.data?.find((e) => sameDate(e.workDate, workDate)) ?? null;
  const yesterdayHours = range.data?.find((e) => sameDate(e.workDate, addDays(workDate, -1)))?.hours ?? null;
  const dayHours = dayEntry?.hours ?? 0;
  const dateLabel = formatDate(workDate, locale, 'long');
  const heading =
    mode === 'single'
      ? t('jobs.newSingleJobFor', { name: memberName })
      : mode === 'edit'
        ? t('jobs.editJobFor', { name: memberName })
        : t('jobs.newJobFor', { name: memberName });
  const subtitle =
    mode === 'single'
      ? t('jobs.singleSubtitle', { date: dateLabel })
      : dayHours > 0
        ? t('jobs.dayTotalSoFar', { date: dateLabel, duration: formatDuration(dayHours, t) })
        : dateLabel;
  const firstName = memberName.split(' ')[0] ?? memberName;
  // A changed schedule applies from the later of this job's date and today; earlier jobs keep their dates.
  const scheduleFrom = date > today ? date : today;

  const leave = () => {
    saved.current = true;
    router.back();
  };

  const save = async (scope: JobChangeScope = 'ONLY_THIS') => {
    if (!canSave) return;
    setError(null);
    const body: JobWrite = {
      hours: rounded,
      startTime,
      title: title.trim() === '' ? null : title.trim(),
      note: note.trim() === '' ? null : note.trim(),
      ...(location ? { location } : {}),
      ...(sendsRule && recurrence ? { recurrence, requestId } : {}),
    };
    try {
      if (job) {
        await update.mutateAsync({ jobId: job.id, job: body, ...(series ? { scope } : {}) });
      } else {
        await create.mutateAsync({ membershipId, date: workDate, job: body });
      }
      void haptic('success');
      toast.show(
        sendsRule ? t('recurrence.saved') : t('jobs.saved', { duration: durationLabel, name: memberName }),
      );
      leave();
    } catch (e) {
      void haptic('error');
      setError(await problemMessage(e, t));
    }
  };

  const clear = async (scope: JobChangeScope = 'ONLY_THIS') => {
    if (!job) return;
    setError(null);
    try {
      await remove.mutateAsync(series ? { jobId: job.id, scope } : job.id);
      toast.show(t('jobs.removed'));
      leave();
    } catch (e) {
      setError(await problemMessage(e, t));
    }
  };

  const onSave = () => {
    if (!canSave) return;
    if (series) {
      setScopeAction('save');
      setPanel('scope');
    } else void save();
  };

  const openStart = () => {
    const [h, m] = (startTime ?? DEFAULT_START).split(':').map(Number) as [number, number];
    setDraftStart({ hours: h, minutes: m - (m % 5) });
    setPanel('start');
  };
  const two = (n: number) => String(n).padStart(2, '0');
  const saveLabel =
    rounded > 0
      ? sendsRule && mode !== 'edit'
        ? t('recurrence.save')
        : t('jobs.saveJob', { duration: durationLabel })
      : t('jobs.chooseTimeFirst');

  const header = (
    <Header
      title={heading}
      subtitle={subtitle}
      large={false}
      leading={
        panel === 'job' ? (
          <TextButton label={t('common.cancel')} onPress={() => router.back()} testID="job-cancel" />
        ) : null
      }
      trailing={
        panel === 'job' ? (
          <TextButton
            label={t('common.save')}
            onPress={onSave}
            disabled={!canSave}
            testID="job-header-save"
          />
        ) : null
      }
    />
  );
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

  if (panel === 'repeat') {
    return (
      <EditorFrame header={header} testID="job-editor">
        {backRow}
        <RecurrenceEditor
          workspaceId={workspace.workspaceId}
          date={mode === 'edit' ? scheduleFrom : workDate}
          anchor={mode === 'edit' ? date : undefined}
          value={recurrence}
          onChange={setRecurrence}
          onReady={setRecurrenceReady}
          onDone={() => setPanel('job')}
          allowOnce={mode !== 'edit'}
        />
      </EditorFrame>
    );
  }
  if (panel === 'scope' && job) {
    return (
      <EditorFrame header={header} testID="job-editor">
        {backRow}
        <ScopeStep
          workspaceId={workspace.workspaceId}
          jobId={job.id}
          action={scopeAction}
          scheduleChange={scopeAction === 'save' && ruleChanged}
          scheduleFrom={scheduleFrom}
          onConfirm={(scope) => void (scopeAction === 'save' ? save(scope) : clear(scope))}
          busy={update.isPending || remove.isPending}
          error={error}
        />
      </EditorFrame>
    );
  }
  if (panel === 'start') {
    return (
      <EditorFrame header={header} testID="job-editor">
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
      </EditorFrame>
    );
  }
  if (panel === 'date') {
    return (
      <EditorFrame header={header} testID="job-editor">
        {backRow}
        <AppText variant="small" weight={600} tone="muted" style={s.label}>
          {t('jobs.date')}
        </AppText>
        <DateWheels value={draftDate} onChange={setDraftDate} testID="job-date" />
        <Button
          label={t('mobile.common.done')}
          onPress={() => {
            const next = toIsoDate(draftDate);
            setWorkDate(next);
            // A repeat starts today or later; an earlier date is a single job.
            if (next < today) {
              setRecurrence(undefined);
              setRecurrenceReady(true);
            }
            setPanel('job');
          }}
          testID="date-done"
        />
      </EditorFrame>
    );
  }

  return (
    <EditorFrame
      header={header}
      testID="job-editor"
      footer={
        <Button
          label={saveLabel}
          onPress={onSave}
          disabled={!canSave}
          loading={create.isPending || update.isPending}
          testID="save-job"
        />
      }
    >
      <View style={{ gap: theme.space[2] }}>
        <TextField
          label={t('jobs.jobTitle')}
          placeholder={t('jobs.jobTitlePlaceholder')}
          value={title}
          onChangeText={setTitle}
          maxLength={JOB_TITLE_MAX}
          autoCapitalize="sentences"
          returnKeyType="next"
          containerStyle={s.titleField}
          testID="job-title"
        />
        <Card style={s.group}>
          {mode === 'full' ? (
            <>
              <Row
                title={t('jobs.date')}
                value={dateLabel}
                leading={<Icon name="calendar" size={18} color={theme.color.secondary} />}
                onPress={() => {
                  setDraftDate(fromIsoDate(workDate));
                  setPanel('date');
                }}
                chevron
                style={s.groupRow}
                accessibilityLabel={`${t('jobs.date')}, ${dateLabel}`}
                testID="job-date"
              />
              <Separator />
            </>
          ) : null}
          <Row
            title={t('jobs.location')}
            value={location?.name ?? t('jobs.noLocation')}
            leading={<Icon name="map-pin" size={18} color={theme.color.primary} />}
            onPress={() => setPicking(true)}
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
          {repeatable || editableSeries ? (
            <>
              <Separator />
              <Row
                title={t('recurrence.title')}
                subtitle={
                  recurrence
                    ? describeRecurrence(
                        recurrence,
                        editableSeries && !ruleChanged
                          ? toIsoDate(editableSeries.firstDate)
                          : editableSeries
                            ? scheduleFrom
                            : workDate,
                        t,
                        locale,
                      )
                    : t('recurrence.once')
                }
                leading={<Icon name="refresh" size={18} color={theme.color.pop1} />}
                onPress={() => setPanel('repeat')}
                chevron
                style={s.groupRow}
                testID="job-repeat"
              />
            </>
          ) : series ? (
            <>
              <Separator />
              <View style={s.series}>
                <RecurrenceSummary series={series} />
              </View>
            </>
          ) : null}
        </Card>
        {location ? (
          <MapImage
            workspaceId={workspace.workspaceId}
            location={location}
            height={96}
            style={s.mapPreview}
          />
        ) : null}
        <AppText variant="caption" tone="muted" style={s.label} testID="job-start-hint">
          {startTime
            ? t('jobs.runsReminder', { from: startTime, to: endTime(startTime, rounded), name: firstName })
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
            label={t('week.fullDayWithHours', { hours: formatDuration(defaultDayHours, t) })}
            selected={rounded === defaultDayHours}
            onPress={() => setHours(defaultDayHours)}
            testID="chip-full-day"
          />
          {yesterdayHours != null && yesterdayHours > 0 ? (
            <Chip
              label={t('week.sameAsYesterdayWithHours', { hours: formatDuration(yesterdayHours, t) })}
              icon="history"
              selected={rounded === yesterdayHours}
              onPress={() => setHours(yesterdayHours)}
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
      {job ? (
        <Button
          label={t('jobs.removeJob')}
          variant="ghost"
          onPress={() => {
            if (series) {
              setScopeAction('remove');
              setPanel('scope');
            } else void clear();
          }}
          loading={remove.isPending}
          hapticKind="warning"
          testID="remove-job"
        />
      ) : null}
      <LocationPicker
        visible={picking}
        workspaceId={workspace.workspaceId}
        value={location}
        onPick={(next) => {
          setLocation(next);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </EditorFrame>
  );
}

export const JobEditorScreen = withWorkspace(JobEditorInner);
