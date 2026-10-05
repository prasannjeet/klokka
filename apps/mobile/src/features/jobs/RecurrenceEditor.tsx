import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { JobRecurrenceRuleToJSON, Weekday, type JobRecurrenceRule } from '@klokka/api-client';
import { formatDate, type IsoDate } from '@klokka/core';
import { useApi } from '@/api/ApiProvider';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { fromIsoDate, toIsoDate } from '@/lib/dates';
import { problemMessage } from '@/lib/problems';
import { useThemedStyles, type Theme } from '@/theme';
import { AppText, Button, Chip, Field, TextField, Wheel } from '@/ui';

const DAYS = Object.values(Weekday);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const styles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space[3] },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    preview: {
      gap: t.space[2],
      backgroundColor: t.color.surface2,
      borderRadius: t.radius.card,
      padding: t.space[3],
      borderWidth: 1,
      borderColor: t.color.border,
    },
    wheels: { flexDirection: 'row', gap: t.space[1] },
    band: {
      position: 'absolute',
      top: t.tapMin * 2,
      height: t.tapMin,
      left: 0,
      right: 0,
      backgroundColor: t.color.surface2,
      borderRadius: t.radius.md,
    },
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
  const s = useThemedStyles(styles);
  const [endMode, setEndMode] = useState<'date' | 'count'>(value?.periodCount ? 'count' : 'date');
  const [datePanel, setDatePanel] = useState(false);
  const [draftDate, setDraftDate] = useState(() => value?.endDate ?? fromIsoDate(date));
  const [error, setError] = useState<string | null>(null);
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
    if (preview.error) void problemMessage(preview.error, t).then(setError);
    else setError(null);
  }, [preview.error, t]);
  const weekly = value?.frequency === 'WEEKLY';
  const choose = (frequency: JobRecurrenceRule['frequency'] | undefined) => {
    if (!frequency) {
      onChange(undefined);
      return;
    }
    const { weekdays: _days, lastDayOfMonth: _last, ...rest } = value ?? { interval: 1 };
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
        <AppText weight={600}>{t('recurrence.endDate')}</AppText>
        <View style={s.wheels}>
          <View style={s.band} pointerEvents="none" />
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
        </View>
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
  return (
    <View style={s.body}>
      <Field label={t('recurrence.title')}>
        <View style={s.chips}>
          {([undefined, 'WEEKLY', 'MONTHLY'] as const).map((f) => (
            <Chip
              key={f ?? 'once'}
              label={t(
                f === undefined
                  ? 'recurrence.once'
                  : f === 'WEEKLY'
                    ? 'recurrence.weekly'
                    : 'recurrence.monthly',
              )}
              selected={value?.frequency === f}
              onPress={() => choose(f)}
              testID={`repeat-${f ?? 'once'}`}
            />
          ))}
        </View>
      </Field>
      {value ? (
        <>
          <TextField
            label={t('recurrence.every')}
            keyboardType="number-pad"
            value={value.interval ? String(value.interval) : ''}
            onChangeText={(text) => onChange({ ...value, interval: Number(text) })}
            hint={`${t(weekly ? 'recurrence.weeks' : 'recurrence.months', { count: value.interval })}. ${t('recurrence.intervalHint')}`}
            maxLength={2}
            testID="repeat-interval"
          />
          {weekly ? (
            <Field label={t('recurrence.weekdays')}>
              <View style={s.chips}>
                {DAYS.map((d, i) => (
                  <Chip
                    key={d}
                    label={new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
                      new Date(2026, 9, 5 + i),
                    )}
                    selected={value.weekdays?.has(d)}
                    onPress={() =>
                      onChange({
                        ...value,
                        weekdays: value.weekdays?.has(d)
                          ? new Set([...value.weekdays].filter((x) => x !== d))
                          : new Set([...(value.weekdays ?? []), d]),
                      })
                    }
                    testID={`repeat-${d}`}
                  />
                ))}
              </View>
            </Field>
          ) : (
            <Field label={t('recurrence.monthlyDay')} hint={t('recurrence.shortMonths')}>
              <View style={s.chips}>
                <Chip
                  label={t('recurrence.sameDate')}
                  selected={!value.lastDayOfMonth}
                  onPress={() => onChange({ ...value, lastDayOfMonth: false })}
                />
                <Chip
                  label={t('recurrence.lastDay')}
                  selected={!!value.lastDayOfMonth}
                  onPress={() => onChange({ ...value, lastDayOfMonth: true })}
                />
              </View>
            </Field>
          )}
          <Field label={t('recurrence.ends')}>
            <View style={s.chips}>
              {(['date', 'count'] as const).map((mode) => (
                <Chip
                  key={mode}
                  label={t(
                    mode === 'date'
                      ? 'recurrence.endDate'
                      : weekly
                        ? 'recurrence.weeksCount'
                        : 'recurrence.monthsCount',
                  )}
                  selected={endMode === mode}
                  onPress={() => {
                    setEndMode(mode);
                    const { endDate: _end, periodCount: _count, ...rest } = value;
                    onChange(rest);
                  }}
                  testID={`repeat-end-mode-${mode}`}
                />
              ))}
            </View>
          </Field>
          {endMode === 'date' ? (
            <Button
              label={
                value.endDate ? formatDate(iso(value.endDate), locale, 'long') : t('recurrence.chooseDate')
              }
              variant="secondary"
              onPress={() => {
                setDraftDate(value.endDate ?? fromIsoDate(date));
                setDatePanel(true);
              }}
              testID="repeat-end-date"
            />
          ) : (
            <TextField
              label={t(weekly ? 'recurrence.weeksCount' : 'recurrence.monthsCount')}
              keyboardType="number-pad"
              value={value.periodCount == null ? '' : String(value.periodCount)}
              onChangeText={(text) => {
                const { periodCount: _count, ...rest } = value;
                onChange(text ? { ...rest, periodCount: Number(text) } : rest);
              }}
              maxLength={3}
              hint={t('recurrence.periodHint')}
              testID="repeat-count"
            />
          )}
          <View style={s.preview} accessibilityLiveRegion="polite" testID="repeat-preview">
            {!valid ? (
              <AppText tone="muted">{t('recurrence.requiredEnd')}</AppText>
            ) : preview.isError ? (
              <AppText tone="danger">{error ?? t('errors.VALIDATION')}</AppText>
            ) : preview.data ? (
              <>
                <AppText weight={600}>{t('recurrence.preview')}</AppText>
                <AppText variant="small">
                  {preview.data.dates.map(({ date: d }) => formatDate(iso(d), locale, 'dayMonth')).join(', ')}
                </AppText>
                <AppText variant="small" weight={600}>
                  {t('recurrence.previewTotal', {
                    count: preview.data.occurrenceCount,
                    date: formatDate(iso(preview.data.lastDate), locale, 'long'),
                  })}
                </AppText>
              </>
            ) : (
              <AppText tone="muted">{t('common.loading')}</AppText>
            )}
          </View>
        </>
      ) : null}
      <Button label={t('mobile.common.done')} onPress={onDone} disabled={!ready} testID="repeat-done" />
    </View>
  );
}
