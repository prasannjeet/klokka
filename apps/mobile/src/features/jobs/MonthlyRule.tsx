import { StyleSheet, View } from 'react-native';
import type { JobRecurrenceRule, MonthlyBy } from '@klokka/api-client';
import {
  LAST_DAY_OF_MONTH,
  WEEKDAYS,
  WEEKS_OF_MONTH,
  defaultMonthly,
  formatWeekday,
  type IsoDate,
} from '@klokka/core';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Card, Separator, Wheel, WheelGroup } from '@/ui';

// Days 1 to 30 in rows of seven, then "Last day" (31, clamped in shorter months) filling the last row.
const GRID: number[][] = [0, 1, 2, 3, 4].map((row) =>
  Array.from({ length: row < 4 ? 7 : 3 }, (_, i) => row * 7 + i + 1),
);
const SHORT_MONTH_DAY = 29;
const RADIO = 20;

const styles = (t: Theme) =>
  StyleSheet.create({
    cards: { gap: t.space[2] },
    card: { padding: 0, overflow: 'hidden' },
    head: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], padding: t.space[4] },
    headText: { flex: 1, minWidth: 0, gap: 2 },
    radio: {
      width: RADIO,
      height: RADIO,
      borderRadius: t.radius.pill,
      borderWidth: 2,
      borderColor: t.color.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOn: { borderColor: t.color.secondary },
    radioDot: {
      width: RADIO / 2,
      height: RADIO / 2,
      borderRadius: t.radius.pill,
      backgroundColor: t.color.secondary,
    },
    body: { padding: t.space[4], gap: t.space[2] },
    row: { flexDirection: 'row', gap: t.space[1] },
    cell: {
      flex: 1,
      minHeight: t.tapMin,
      borderRadius: t.radius.chip,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.color.border,
    },
    lastCell: { flex: 5 },
    cellOn: { backgroundColor: t.color.secondary, borderColor: t.color.secondary },
  });

// The monthly rule (CHQ-186): two cards, a day of the month or the nth weekday of the month, each saying what it
// means; the chosen one opens its picker. Both start from the first date (24 Oct: day 24, the fourth Saturday).
export function MonthlyRule({
  value,
  date,
  onChange,
}: {
  value: JobRecurrenceRule;
  date: IsoDate;
  onChange: (rule: JobRecurrenceRule) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const defaults = defaultMonthly(date);
  const mode: MonthlyBy = value.monthlyBy ?? 'DAY_OF_MONTH';
  const day = value.dayOfMonth ?? (value.lastDayOfMonth ? LAST_DAY_OF_MONTH : defaults.dayOfMonth);
  const nth = value.weekOfMonth ?? defaults.weekOfMonth;
  const weekday = value.weekday ?? defaults.weekday;
  const choose = (next: MonthlyBy) => {
    if (next === mode) return;
    const { dayOfMonth: _day, weekOfMonth: _nth, weekday: _weekday, lastDayOfMonth: _last, ...rest } = value;
    onChange(
      next === 'DAY_OF_MONTH'
        ? { ...rest, monthlyBy: next, dayOfMonth: defaults.dayOfMonth }
        : { ...rest, monthlyBy: next, weekOfMonth: defaults.weekOfMonth, weekday: defaults.weekday },
    );
  };
  const options: { mode: MonthlyBy; title: string; summary: string }[] = [
    {
      mode: 'DAY_OF_MONTH',
      title: t('recurrence.byDay'),
      summary: day >= LAST_DAY_OF_MONTH ? t('recurrence.lastDayShort') : t('recurrence.onDay', { day }),
    },
    {
      mode: 'WEEKDAY_OF_MONTH',
      title: t('recurrence.byWeekday'),
      summary: t('recurrence.onWeekday', {
        ordinal: t(`recurrence.ordinal.${nth}`),
        weekday: t(`recurrence.weekdayInMonth.${weekday}`),
      }),
    },
  ];
  return (
    <View style={s.cards} accessibilityRole="radiogroup" accessibilityLabel={t('recurrence.monthly')}>
      {options.map((option) => {
        const on = option.mode === mode;
        return (
          <Card key={option.mode} style={s.card}>
            <AppPressable
              accessibilityRole="radio"
              accessibilityLabel={`${option.title}, ${option.summary}`}
              accessibilityState={{ checked: on }}
              onPress={() => choose(option.mode)}
              hapticKind="tick"
              pressScale={0.99}
              style={s.head}
              testID={`repeat-by-${option.mode}`}
            >
              <View style={[s.radio, on ? s.radioOn : null]}>{on ? <View style={s.radioDot} /> : null}</View>
              <View style={s.headText}>
                <AppText weight={600}>{option.title}</AppText>
                <AppText variant="small" tone="muted">
                  {option.summary}
                </AppText>
              </View>
            </AppPressable>
            {on ? (
              <>
                <Separator />
                {option.mode === 'DAY_OF_MONTH' ? (
                  <View style={s.body}>
                    {GRID.map((row, r) => (
                      <View key={r} style={s.row}>
                        {row.map((d) => {
                          const last = d === LAST_DAY_OF_MONTH;
                          const selected = d === Math.min(day, LAST_DAY_OF_MONTH);
                          const label = last ? t('recurrence.lastDayShort') : String(d);
                          return (
                            <AppPressable
                              key={d}
                              accessibilityRole="radio"
                              accessibilityLabel={last ? label : t('recurrence.onDay', { day: d })}
                              accessibilityState={{ checked: selected }}
                              hapticKind="tick"
                              pressScale={0.95}
                              onPress={() => onChange({ ...value, dayOfMonth: d })}
                              style={[s.cell, last ? s.lastCell : null, selected ? s.cellOn : null]}
                              testID={`repeat-dom-${d}`}
                            >
                              <AppText
                                variant="small"
                                weight={600}
                                tabular
                                color={selected ? theme.color.onSecondary : theme.color.text}
                              >
                                {label}
                              </AppText>
                            </AppPressable>
                          );
                        })}
                      </View>
                    ))}
                    {day >= SHORT_MONTH_DAY ? (
                      <AppText variant="caption" tone="muted">
                        {t('recurrence.shortMonths')}
                      </AppText>
                    ) : null}
                  </View>
                ) : (
                  <View style={s.body}>
                    <WheelGroup>
                      <Wheel
                        values={WEEKS_OF_MONTH.map((_, i) => i)}
                        value={WEEKS_OF_MONTH.indexOf(nth)}
                        onChange={(i) => onChange({ ...value, weekOfMonth: WEEKS_OF_MONTH[i] ?? nth })}
                        format={(i) => t(`recurrence.ordinal.${WEEKS_OF_MONTH[i] ?? nth}`)}
                        unit=""
                        accessibilityLabel={t('recurrence.byWeekday')}
                        testID="repeat-nth"
                      />
                      <Wheel
                        values={WEEKDAYS.map((_, i) => i)}
                        value={WEEKDAYS.indexOf(weekday)}
                        onChange={(i) => onChange({ ...value, weekday: WEEKDAYS[i] ?? weekday })}
                        format={(i) => formatWeekday(i, locale, 'long')}
                        unit=""
                        accessibilityLabel={t('recurrence.weekdays')}
                        testID="repeat-weekday"
                      />
                    </WheelGroup>
                  </View>
                )}
              </>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}
