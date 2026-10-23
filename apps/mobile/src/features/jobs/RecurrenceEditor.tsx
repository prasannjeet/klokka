import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { JobRecurrenceRuleToJSON, type JobRecurrence, type JobRecurrenceRule } from '@klokka/api-client';
import {
  LAST_DAY_OF_MONTH,
  RECURRENCE_HORIZON_MONTHS,
  WEEKDAYS,
  defaultMonthly,
  describeRecurrence,
  formatDate,
  formatWeekday,
  weekdayOf,
  type IsoDate,
} from '@klokka/core';
import { useApi } from '@/api/ApiProvider';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { fromIsoDate, toIsoDate } from '@/lib/dates';
import { problemMessage } from '@/lib/problems';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import {
  AppPressable,
  AppText,
  Button,
  Card,
  Row,
  Segmented,
  Separator,
  Stepper,
  type SegmentedOption,
} from '@/ui';
import { DateWheels } from './DateWheels';
import { MonthlyRule } from './MonthlyRule';

const MAX_INTERVAL = 12;
const MAX_PERIODS = 120;
// A series ended by a count starts at four weeks or months; the stepper changes it.
const FIRST_COUNT = 4;
const DAY = 36;

type EndMode = 'never' | 'date' | 'count';
type Frequency = JobRecurrenceRule['frequency'] | 'ONCE';

const styles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space[4] },
    section: { gap: t.space[2] },
    label: { paddingHorizontal: t.space[1] },
    group: { paddingVertical: 0, paddingHorizontal: t.space[4] },
    groupRow: { minHeight: 52, paddingVertical: t.space[2] },
    inset: { paddingVertical: t.space[3], gap: t.space[2] },
    stepValue: { minWidth: 72, textAlign: 'center' },
    days: { flexDirection: 'row', justifyContent: 'space-between' },
    day: {
      width: DAY,
      height: DAY,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.color.border,
    },
    dayOn: { backgroundColor: t.color.secondary, borderColor: t.color.secondary },
    preview: { gap: t.space[1] },
  });

export function endModeOf(rule: JobRecurrenceRule | undefined): EndMode {
  if (rule?.periodCount != null) return 'count';
  return rule?.endDate ? 'date' : 'never';
}

// A stable text for a rule, so "did the schedule change" ignores the order weekdays were tapped in.
export function ruleKey(rule: JobRecurrenceRule | undefined): string {
  if (!rule) return '';
  const json: Record<string, unknown> = { ...JobRecurrenceRuleToJSON(rule) };
  if (rule.weekdays) json.weekdays = WEEKDAYS.filter((d) => rule.weekdays?.has(d));
  return JSON.stringify(json, Object.keys(json).sort());
}

// An existing series' rule, ready to edit (CHQ-187): the monthly mode spelled out (older series only say
// lastDayOfMonth), and a count of weeks/months turned into the date it ends on, since a new schedule starts later
// than the series did and the end should stay where it was.
export function editableRule(series: JobRecurrence): JobRecurrenceRule {
  const { lastDayOfMonth, periodCount, ...rule } = series.recurrence;
  const ended = periodCount != null ? { endDate: series.endDate } : {};
  if (rule.frequency !== 'MONTHLY') return { ...rule, ...ended };
  const monthlyBy = rule.monthlyBy ?? 'DAY_OF_MONTH';
  if (monthlyBy === 'WEEKDAY_OF_MONTH') return { ...rule, monthlyBy, ...ended };
  const dayOfMonth = rule.dayOfMonth ?? (lastDayOfMonth ? LAST_DAY_OF_MONTH : series.firstDate.getDate());
  return { ...rule, monthlyBy, dayOfMonth, ...ended };
}

function isValid(rule: JobRecurrenceRule | undefined, endMode: EndMode, date: IsoDate): boolean {
  if (!rule) return false;
  if (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > MAX_INTERVAL) return false;
  if (rule.frequency === 'WEEKLY' && !rule.weekdays?.size) return false;
  if (
    rule.frequency === 'MONTHLY' &&
    rule.monthlyBy === 'WEEKDAY_OF_MONTH' &&
    (!rule.weekOfMonth || !rule.weekday)
  ) {
    return false;
  }
  if (endMode === 'never') return rule.endDate === undefined && rule.periodCount === undefined;
  if (endMode === 'date') return !!rule.endDate && toIsoDate(rule.endDate) >= date;
  const count = rule.periodCount;
  return count != null && Number.isInteger(count) && count >= 1 && count <= MAX_PERIODS;
}

// How often a job repeats (CHQ-156, monthly modes and "No end date" in CHQ-186): weekly on chosen weekdays, or
// monthly on a day or the nth weekday, every 1 to 12 weeks/months, ending never, on a date or after a count. The
// API's preview says which dates that gives; Done waits for it.
export function RecurrenceEditor({
  workspaceId,
  date,
  anchor,
  value,
  onChange,
  onReady,
  onDone,
  allowOnce = true,
}: {
  workspaceId: string;
  // The first date of the schedule: the job's date, or where a changed schedule starts.
  date: IsoDate;
  // A changed schedule's rhythm: the selected job's date, which the interval counts from (the API does the same).
  anchor?: IsoDate | undefined;
  value: JobRecurrenceRule | undefined;
  onChange: (rule: JobRecurrenceRule | undefined) => void;
  onReady: (ready: boolean) => void;
  onDone: () => void;
  // False when editing a series: it can change, not stop repeating.
  allowOnce?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const api = useApi();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const [endMode, setEndMode] = useState<EndMode>(() => endModeOf(value));
  const [datePanel, setDatePanel] = useState(false);
  const [draftDate, setDraftDate] = useState(() => value?.endDate ?? fromIsoDate(date));
  // The message is kept with the error it came from, so a slow lookup never shows an earlier failure's text.
  const [failure, setFailure] = useState<{ source: unknown; message: string } | null>(null);
  const valid = isValid(value, endMode, date);
  const preview = useQuery({
    queryKey: ['job-recurrence-preview', workspaceId, anchor ?? null, date, value ? ruleKey(value) : null],
    enabled: valid,
    retry: false,
    queryFn: () =>
      api.jobs.previewJobRecurrence({
        workspaceId,
        jobRecurrencePreviewRequest: anchor
          ? { firstDate: fromIsoDate(anchor), fromDate: fromIsoDate(date), recurrence: value! }
          : { firstDate: fromIsoDate(date), recurrence: value! },
      }),
  });
  const ready = value === undefined || (valid && preview.isSuccess && !preview.isFetching);
  useEffect(() => onReady(ready), [ready, onReady]);
  useEffect(() => {
    const source = preview.error;
    if (source) void problemMessage(source, t).then((message) => setFailure({ source, message }));
  }, [preview.error, t]);
  const error = failure && failure.source === preview.error ? failure.message : null;
  const weekly = value?.frequency === 'WEEKLY';

  const choose = (frequency: Frequency) => {
    if (frequency === 'ONCE') {
      onChange(undefined);
      return;
    }
    if (frequency === value?.frequency) return;
    // A count of weeks is not a count of months: switching frequency asks for the end again. No end date and an
    // end date carry over.
    const mode: EndMode = !value ? 'never' : endMode === 'count' ? 'date' : endMode;
    setEndMode(mode);
    const base = {
      interval: value?.interval ?? 1,
      ...(mode === 'date' && value?.endDate ? { endDate: value.endDate } : {}),
    };
    onChange(
      frequency === 'WEEKLY'
        ? { ...base, frequency, weekdays: new Set([weekdayOf(date)]) }
        : { ...base, frequency, monthlyBy: 'DAY_OF_MONTH', dayOfMonth: defaultMonthly(date).dayOfMonth },
    );
  };

  if (datePanel && value) {
    return (
      <View style={s.body}>
        <AppText variant="small" weight={600} tone="muted" style={s.label}>
          {t('recurrence.endDate')}
        </AppText>
        <DateWheels value={draftDate} min={fromIsoDate(date)} onChange={setDraftDate} testID="repeat" />
        <Button
          label={t('recurrence.useDate')}
          disabled={toIsoDate(draftDate) < date}
          onPress={() => {
            onChange({ ...value, endDate: draftDate });
            setDatePanel(false);
          }}
          testID="repeat-use-date"
        />
        <Button label={t('common.cancel')} variant="ghost" onPress={() => setDatePanel(false)} />
      </View>
    );
  }

  const interval = value?.interval ?? 1;
  const count = value?.periodCount;
  const period = (n: number) => t(weekly ? 'recurrence.weeks' : 'recurrence.months', { count: n });
  const frequencies: SegmentedOption<Frequency>[] = [
    ...(allowOnce ? [{ value: 'ONCE' as const, label: t('recurrence.once'), testID: 'repeat-once' }] : []),
    { value: 'WEEKLY', label: t('recurrence.weekly'), testID: 'repeat-WEEKLY' },
    { value: 'MONTHLY', label: t('recurrence.monthly'), testID: 'repeat-MONTHLY' },
  ];
  const ends: SegmentedOption<EndMode>[] = [
    { value: 'never', label: t('recurrence.never'), testID: 'repeat-end-mode-never' },
    { value: 'date', label: t('recurrence.onDate'), testID: 'repeat-end-mode-date' },
    { value: 'count', label: t('recurrence.afterCount'), testID: 'repeat-end-mode-count' },
  ];
  return (
    <View style={s.body}>
      <Segmented
        accessibilityLabel={t('recurrence.title')}
        value={value?.frequency ?? 'ONCE'}
        onChange={choose}
        options={frequencies}
      />
      {value ? (
        <>
          <Card style={s.group}>
            <Row
              title={t('recurrence.every')}
              style={s.groupRow}
              trailing={
                <Stepper
                  decrementLabel={t('recurrence.decrease')}
                  incrementLabel={t('recurrence.increase')}
                  canDecrement={interval > 1}
                  canIncrement={interval < MAX_INTERVAL}
                  onDecrement={() => onChange({ ...value, interval: interval - 1 })}
                  onIncrement={() => onChange({ ...value, interval: interval + 1 })}
                >
                  <AppText weight={600} tabular style={s.stepValue} testID="repeat-interval">
                    {period(interval)}
                  </AppText>
                </Stepper>
              }
            />
            {weekly ? (
              <>
                <Separator />
                <View style={s.inset}>
                  <AppText variant="small" tone="muted">
                    {t('recurrence.weekdays')}
                  </AppText>
                  <View style={s.days}>
                    {WEEKDAYS.map((d, i) => {
                      const on = !!value.weekdays?.has(d);
                      const chosen = [...(value.weekdays ?? [])];
                      return (
                        <AppPressable
                          key={d}
                          accessibilityRole="checkbox"
                          accessibilityLabel={formatWeekday(i, locale, 'long')}
                          accessibilityState={{ checked: on }}
                          hapticKind="tick"
                          hitSlop={4}
                          style={[s.day, on ? s.dayOn : null]}
                          onPress={() => {
                            // The last weekday stays: a weekly repeat needs at least one.
                            if (on && chosen.length === 1) return;
                            onChange({
                              ...value,
                              weekdays: new Set(on ? chosen.filter((x) => x !== d) : [...chosen, d]),
                            });
                          }}
                          testID={`repeat-${d}`}
                        >
                          <AppText
                            variant="small"
                            weight={600}
                            color={on ? theme.color.onSecondary : theme.color.text}
                          >
                            {formatWeekday(i, locale, 'narrow')}
                          </AppText>
                        </AppPressable>
                      );
                    })}
                  </View>
                </View>
              </>
            ) : null}
          </Card>
          {weekly ? null : <MonthlyRule value={value} date={date} onChange={onChange} />}
          <View style={s.section}>
            <AppText variant="small" weight={600} tone="muted" style={s.label}>
              {t('recurrence.ends')}
            </AppText>
            <Card style={s.group}>
              <View style={s.inset}>
                <Segmented
                  accessibilityLabel={t('recurrence.ends')}
                  value={endMode}
                  onChange={(mode) => {
                    if (mode === endMode) return;
                    setEndMode(mode);
                    const { endDate: _end, periodCount: _count, ...rest } = value;
                    onChange(mode === 'count' ? { ...rest, periodCount: FIRST_COUNT } : rest);
                  }}
                  options={ends}
                />
              </View>
              {endMode === 'date' ? (
                <>
                  <Separator />
                  <Row
                    title={t('recurrence.endDate')}
                    value={
                      value.endDate
                        ? formatDate(toIsoDate(value.endDate), locale, 'long')
                        : t('recurrence.chooseDate')
                    }
                    onPress={() => {
                      setDraftDate(value.endDate ?? fromIsoDate(date));
                      setDatePanel(true);
                    }}
                    chevron
                    style={s.groupRow}
                    testID="repeat-end-date"
                  />
                </>
              ) : endMode === 'count' ? (
                <>
                  <Separator />
                  <Row
                    title={t(weekly ? 'recurrence.weeksCount' : 'recurrence.monthsCount')}
                    style={s.groupRow}
                    trailing={
                      <Stepper
                        decrementLabel={t('recurrence.decrease')}
                        incrementLabel={t('recurrence.increase')}
                        canDecrement={(count ?? 1) > 1}
                        canIncrement={(count ?? 0) < MAX_PERIODS}
                        onDecrement={() => onChange({ ...value, periodCount: (count ?? 2) - 1 })}
                        onIncrement={() => onChange({ ...value, periodCount: (count ?? 0) + 1 })}
                      >
                        <AppText weight={600} tabular style={s.stepValue} testID="repeat-count">
                          {count ?? '-'}
                        </AppText>
                      </Stepper>
                    }
                  />
                </>
              ) : null}
            </Card>
            {endMode === 'date' ? null : (
              <AppText variant="caption" tone="muted" style={s.label}>
                {endMode === 'never'
                  ? t('recurrence.neverHint', { months: RECURRENCE_HORIZON_MONTHS })
                  : t('recurrence.periodHint')}
              </AppText>
            )}
          </View>
          <Card style={s.preview} accessibilityLiveRegion="polite" testID="repeat-preview">
            {!valid ? (
              <AppText variant="small" tone="muted">
                {endMode === 'date' && !value.endDate ? t('recurrence.chooseDate') : t('errors.VALIDATION')}
              </AppText>
            ) : preview.isError ? (
              <AppText variant="small" tone="danger">
                {error ?? t('errors.VALIDATION')}
              </AppText>
            ) : preview.data ? (
              <>
                <AppText variant="small" weight={600} testID="repeat-sentence">
                  {describeRecurrence(value, date, t, locale)}
                </AppText>
                <AppText variant="small" tone="muted">
                  {t('recurrence.preview')}
                </AppText>
                <AppText variant="small" tone="muted" tabular>
                  {preview.data.dates
                    .map(({ date: d }) => formatDate(toIsoDate(d), locale, 'dayMonth'))
                    .join(', ')}
                </AppText>
                {endMode === 'never' ? null : (
                  <AppText variant="small" tone="muted">
                    {t('recurrence.previewTotal', {
                      count: preview.data.occurrenceCount,
                      date: formatDate(toIsoDate(preview.data.lastDate), locale, 'long'),
                    })}
                  </AppText>
                )}
              </>
            ) : (
              <AppText variant="small" tone="muted">
                {t('common.loading')}
              </AppText>
            )}
          </Card>
        </>
      ) : null}
      <Button label={t('mobile.common.done')} onPress={onDone} disabled={!ready} testID="repeat-done" />
    </View>
  );
}
