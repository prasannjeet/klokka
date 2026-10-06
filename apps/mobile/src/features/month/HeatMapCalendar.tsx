import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MemberMonthDay } from '@klokka/api-client';
import {
  formatHours,
  formatWeekday,
  weekdayOrder,
  weeksOf,
  type IsoDate,
  type IsoMonth,
  type WeekStart,
} from '@klokka/core';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, withAlpha, type Theme } from '@/theme';
import { AppPressable, AppText } from '@/ui';

const styles = (t: Theme) =>
  StyleSheet.create({
    grid: { gap: 4 },
    row: { flexDirection: 'row', gap: 4 },
    head: { flex: 1, alignItems: 'center' },
    cell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: t.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    // Faint grid lines around every day of the month (CHQ-145), so an empty day still reads as a cell.
    line: { borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(t.color.text, 0.16) },
    out: { opacity: 0 },
    today: { borderWidth: 2, borderColor: t.color.text },
    // Days after today (CHQ-156): free ones dashed and faint, planned ones dashed in the accent.
    future: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.color.border },
    planned: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.color.accent },
    dayNumber: { position: 'absolute', top: 2, left: 4 },
    dot: { position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3 },
    markers: { position: 'absolute', bottom: 3, flexDirection: 'row', gap: 2 },
    marker: { width: 5, height: 5, borderRadius: 3 },
  });

// Six fill steps, chosen by hours relative to the month's busiest day.
export function intensityOf(hours: number, max: number): number {
  if (hours <= 0 || max <= 0) return 0;
  return Math.max(1, Math.min(5, Math.ceil((hours / max) * 5)));
}

export function mixHex(a: string, b: string, ratio: number): string {
  const p = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a) as [number, number, number];
  const [r2, g2, b2] = p(b) as [number, number, number];
  const mix = (x: number, y: number) =>
    Math.round(x + (y - x) * ratio)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
}

// Days with hours are tinted green by how full they are and a flagged day red (CHQ-145, the same as the
// web): the success and danger tokens at low strength over the cell, so the numbers keep the text colour
// and their contrast in both modes. The top step is the web's top (40%): stronger, the dark mode's text
// falls under 4.5:1 on the month's busiest day.
export const HEAT_STRENGTH = [0.16, 0.22, 0.28, 0.34, 0.4] as const;
export const FLAG_STRENGTH = 0.3;

export function heatFills(theme: Theme): string[] {
  return [
    theme.color.surface2,
    ...HEAT_STRENGTH.map((r) => mixHex(theme.color.surface2, theme.color.success, r)),
  ];
}

export function flagFill(theme: Theme): string {
  return mixHex(theme.color.surface2, theme.color.danger, FLAG_STRENGTH);
}

// A member's day, or the team's (CHQ-171): the date, its hours and, for a member, an open flag.
export type HeatDay = Pick<MemberMonthDay, 'date'> & {
  hours?: number | null | undefined;
  flag?: MemberMonthDay['flag'];
};

export interface HeatMapCalendarProps {
  month: IsoMonth;
  weekStart: WeekStart;
  days: readonly HeatDay[];
  today: IsoDate;
  // Every day of the month, empty and future ones too (CHQ-156).
  onPressDay?: (date: IsoDate) => void;
  // Small dots along the bottom of a cell, one colour each (the team calendar's people).
  markers?: (date: IsoDate) => readonly string[];
  accessibilityLabel: string;
}

// The month as a heat-map (CHQ-123): the numeral in each cell, the fill is intensity, an amber dot is
// an open flag, the ring is today. Flex Views sized in percent, one accessible element per day.
export function HeatMapCalendar({
  month,
  weekStart,
  days,
  today,
  onPressDay,
  markers,
  accessibilityLabel,
}: HeatMapCalendarProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const weeks = useMemo(() => weeksOf(month, weekStart), [month, weekStart]);
  const byDate = useMemo(() => new Map(days.map((d) => [toIsoDate(d.date), d])), [days]);
  const max = useMemo(() => days.reduce((m, d) => Math.max(m, d.hours ?? 0), 0), [days]);
  const fills = useMemo(() => heatFills(theme), [theme]);
  const flagged = useMemo(() => flagFill(theme), [theme]);
  const order = weekdayOrder(weekStart);
  return (
    <View style={s.grid} accessibilityLabel={accessibilityLabel} testID="heat-map">
      <View style={s.row}>
        {order.map((w, i) => (
          <View key={w} style={s.head}>
            <AppText variant="eyebrow" tone="muted">
              {formatWeekday(weekStart === 'MONDAY' ? i : (i + 6) % 7, locale, 'short').slice(0, 2)}
            </AppText>
          </View>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week.isoWeek} style={s.row}>
          {week.days.map((cell) => {
            if (!cell.inMonth) return <View key={cell.date} style={[s.cell, s.out]} />;
            const day = byDate.get(cell.date);
            const hours = day?.hours ?? 0;
            const level = intensityOf(hours, max);
            const isFlagged = day?.flag?.status === 'OPEN';
            const fill = isFlagged ? flagged : (fills[level] as string);
            const onFill = theme.color.text;
            const isToday = cell.date === today;
            const isFuture = cell.date > today;
            const isPlanned = isFuture && hours > 0;
            const label = `${cell.date}, ${hours > 0 ? formatHours(hours, locale) : t('entry.nothingYet')}${isPlanned ? `, ${t('jobs.planned')}` : ''}${day?.flag?.status === 'OPEN' ? `, ${t('month.flag')}` : ''}`;
            return (
              <AppPressable
                key={cell.date}
                accessibilityRole={onPressDay ? 'button' : 'text'}
                accessibilityLabel={label}
                onPress={onPressDay ? () => onPressDay(cell.date) : undefined}
                disabled={!onPressDay}
                hapticKind="tick"
                pressScale={0.94}
                style={[
                  s.cell,
                  s.line,
                  isPlanned
                    ? { backgroundColor: withAlpha(theme.color.accent, 0.1) }
                    : { backgroundColor: hours > 0 || isFlagged ? fill : 'transparent' },
                  isToday ? s.today : isPlanned ? s.planned : isFuture ? s.future : null,
                ]}
                testID={`cell-${cell.date}`}
              >
                <AppText
                  variant="caption"
                  color={hours > 0 ? onFill : theme.color.textMuted}
                  style={s.dayNumber}
                >
                  {Number(cell.date.slice(8, 10))}
                </AppText>
                {hours > 0 ? (
                  <AppText variant="small" weight={700} color={onFill} tabular>
                    {formatHours(hours, locale, { unit: false })}
                  </AppText>
                ) : null}
                {isFlagged ? <View style={[s.dot, { backgroundColor: theme.color.danger }]} /> : null}
                {markers?.(cell.date).length ? (
                  <View style={s.markers}>
                    {markers(cell.date)
                      .slice(0, 4)
                      .map((colour, i) => (
                        <View key={i} style={[s.marker, { backgroundColor: colour }]} />
                      ))}
                  </View>
                ) : null}
              </AppPressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
