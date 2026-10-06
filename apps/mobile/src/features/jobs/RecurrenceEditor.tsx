import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { JobRecurrenceRuleToJSON, Weekday, type JobRecurrenceRule } from '@klokka/api-client';
import { formatDate, formatWeekday, type IsoDate } from '@klokka/core';
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
  Wheel,
  WheelGroup,
} from '@/ui';

const DAYS = Object.values(Weekday);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const MAX_INTERVAL = 12;
const MAX_PERIODS = 120;
// A series ended by a count starts at four weeks or months; the stepper changes it.
const FIRST_COUNT = 4;
const DAY = 36;

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
const iso = toIsoDate;

export function RecurrenceEditor({
  workspaceId,
  date,
  value,
  onChange,
  onReady,
  onDone,
}: {
  workspaceId: string;
  date: IsoDate;
  value: JobRecurrenceRule | undefined;
  onChange: (rule: JobRecurrenceRule | undefined) => void;
  onReady: (ready: boolean) => void;
  onDone: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const api = useApi();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const [endMode, setEndMode] = useState<'date' | 'count'>(value?.periodCount ? 'count' : 'date');
  const [datePanel, setDatePanel] = useState(false);
  const [draftDate, setDraftDate] = useState(() => value?.endDate ?? fromIsoDate(date));
  // The message is kept with the error it came from, so a slow lookup never shows an earlier failure's text.
  const [failure, setFailure] = useState<{ source: unknown; message: string } | null>(null);
  const valid =
    !!value &&
    Number.isInteger(value.interval) &&
    value.interval >= 1 &&
    value.interval <= 12 &&
    (value.frequency !== 'WEEKLY' || !!value.weekdays?.size) &&
    (!!value.endDate ||
      (value.periodCount != null &&
        Number.isInteger(value.periodCount) &&
        value.periodCount >= 1 &&
        value.periodCount <= 120));
  const preview = useQuery({
    queryKey: ['job-recurrence-preview', workspaceId, date, value ? JobRecurrenceRuleToJSON(value) : null],
    enabled: valid,
    retry: false,
    queryFn: () =>
      api.jobs.previewJobRecurrence({
        workspaceId,
        jobRecurrencePreviewRequest: { firstDate: fromIsoDate(date), recurrence: value! },
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
  const choose = (frequency: JobRecurrenceRule['frequency'] | 'ONCE') => {
    if (frequency === 'ONCE') {
      onChange(undefined);
      return;
    }
    if (frequency === value?.frequency) return;
    // A count of weeks is not a count of months: switching frequency asks for the end again.
    const { weekdays: _days, lastDayOfMonth: _last, periodCount: _count, ...rest } = value ?? { interval: 1 };
    if (endMode === 'count') setEndMode('date');
    onChange({
      ...rest,
      frequency,
      ...(frequency === 'WEEKLY' ? { weekdays: new Set([DAYS[(fromIsoDate(date).getDay() + 6) % 7]!]) } : {}),
    });
  };
  if (datePanel && value) {
    const year = draftDate.getFullYear(),
      month = draftDate.getMonth() + 1,
      day = draftDate.getDate();
    const years = Array.from({ length: 11 }, (_, i) => fromIsoDate(date).getFullYear() + i);
    const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
    const change = (y: number, m: number, d: number) =>
      setDraftDate(new Date(y, m - 1, Math.min(d, new Date(y, m, 0).getDate())));
    return (
      <View style={s.body}>
        <AppText variant="small" weight={600} tone="muted" style={s.label}>
          {t('recurrence.endDate')}
        </AppText>
        <WheelGroup>
          <Wheel
            values={days}
            value={day}
            onChange={(d) => change(year, month, d)}
            format={String}
            unit=""
            accessibilityLabel={t('recurrence.day')}
            testID="repeat-day"
          />
          <Wheel
            values={MONTHS}
            value={month}
            onChange={(m) => change(year, m, day)}
            format={(m) =>
              new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, m - 1, 1))
            }
            unit=""
            accessibilityLabel={t('recurrence.month')}
            testID="repeat-month"
          />
          <Wheel
            values={years}
            value={year}
            onChange={(y) => change(y, month, day)}
            format={String}
            unit=""
            accessibilityLabel={t('recurrence.year')}
            testID="repeat-year"
          />
        </WheelGroup>
        <Button
          label={t('recurrence.useDate')}
          disabled={iso(draftDate) < date}
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
  return (
    <View style={s.body}>
      <Segmented
        accessibilityLabel={t('recurrence.title')}
        value={value?.frequency ?? 'ONCE'}
        onChange={choose}
        options={[
          { value: 'ONCE', label: t('recurrence.once'), testID: 'repeat-once' },
          { value: 'WEEKLY', label: t('recurrence.weekly'), testID: 'repeat-WEEKLY' },
          { value: 'MONTHLY', label: t('recurrence.monthly'), testID: 'repeat-MONTHLY' },
        ]}
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
            <Separator />
            {weekly ? (
              <View style={s.inset}>
                <AppText variant="small" tone="muted">
                  {t('recurrence.weekdays')}
                </AppText>
                <View style={s.days}>
                  {DAYS.map((d, i) => {
                    const on = !!value.weekdays?.has(d);
                    return (
                      <AppPressable
                        key={d}
                        accessibilityRole="checkbox"
                        accessibilityLabel={formatWeekday(i, locale, 'long')}
                        accessibilityState={{ checked: on }}
                        hapticKind="tick"
                        hitSlop={4}
                        style={[s.day, on ? s.dayOn : null]}
                        onPress={() =>
                          onChange({
                            ...value,
                            weekdays: on
                              ? new Set([...(value.weekdays ?? [])].filter((x) => x !== d))
                              : new Set([...(value.weekdays ?? []), d]),
                          })
                        }
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
            ) : (
              <View style={s.inset}>
                <AppText variant="small" tone="muted">
                  {t('recurrence.monthlyDay')}
                </AppText>
                <Segmented
                  accessibilityLabel={t('recurrence.monthlyDay')}
                  value={value.lastDayOfMonth ? 'last' : 'same'}
                  onChange={(v) => onChange({ ...value, lastDayOfMonth: v === 'last' })}
                  options={[
                    { value: 'same', label: t('recurrence.sameDate') },
                    { value: 'last', label: t('recurrence.lastDay') },
                  ]}
                />
                <AppText variant="caption" tone="muted">
                  {t('recurrence.shortMonths')}
                </AppText>
              </View>
            )}
          </Card>
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
                  options={[
                    { value: 'date', label: t('recurrence.endDate'), testID: 'repeat-end-mode-date' },
                    {
                      value: 'count',
                      label: t(weekly ? 'recurrence.weeksCount' : 'recurrence.monthsCount'),
                      testID: 'repeat-end-mode-count',
                    },
                  ]}
                />
              </View>
              <Separator />
              {endMode === 'date' ? (
                <Row
                  title={t('recurrence.endDate')}
                  value={
                    value.endDate
                      ? formatDate(iso(value.endDate), locale, 'long')
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
              ) : (
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
              )}
            </Card>
            {endMode === 'count' ? (
              <AppText variant="caption" tone="muted" style={s.label}>
                {t('recurrence.periodHint')}
              </AppText>
            ) : null}
          </View>
          <Card style={s.preview} accessibilityLiveRegion="polite" testID="repeat-preview">
            {!valid ? (
              <AppText variant="small" tone="muted">
                {t('recurrence.requiredEnd')}
              </AppText>
            ) : preview.isError ? (
              <AppText variant="small" tone="danger">
                {error ?? t('errors.VALIDATION')}
              </AppText>
            ) : preview.data ? (
              <>
                <AppText variant="small" weight={600}>
                  {t('recurrence.preview')}
                </AppText>
                <AppText variant="small" tone="muted" tabular>
                  {preview.data.dates.map(({ date: d }) => formatDate(iso(d), locale, 'dayMonth')).join(', ')}
                </AppText>
                <AppText variant="small" tone="muted">
                  {t('recurrence.previewTotal', {
                    count: preview.data.occurrenceCount,
                    date: formatDate(iso(preview.data.lastDate), locale, 'long'),
                  })}
                </AppText>
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
