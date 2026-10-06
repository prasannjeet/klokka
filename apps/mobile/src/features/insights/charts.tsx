import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { line as d3Line, curveMonotoneX } from 'd3-shape';
import { formatHours, formatWeekLabel } from '@klokka/core';
import { useLocale } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from '@/ui';

// Charts without a chart library (docs/research/mobile.md section 5): bars are flex Views sized in
// percent, the week-by-week trend is one react-native-svg Path from d3-shape. Series colours follow
// the fixed chart order and are never used for text.

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    barRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: 28 },
    barLabel: { width: 64 },
    track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: t.color.surface2, overflow: 'hidden' },
    fill: { height: '100%', borderTopRightRadius: 6, borderBottomRightRadius: 6 },
    barValue: { width: 48, textAlign: 'right' },
  });

export function Bars({ data, accessibilityLabel }: { data: BarDatum[]; accessibilityLabel: string }) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <View style={{ gap: theme.space[2] }} accessibilityLabel={accessibilityLabel} testID="bars">
      {data.map((d, i) => {
        const colour = theme.color[theme.chartOrder[i % theme.chartOrder.length] as 'chart1'];
        const pct = max > 0 ? Math.max(2, Math.round((d.value / max) * 100)) : 0;
        return (
          <View key={d.key} style={s.barRow} accessible accessibilityLabel={`${d.label}, ${d.valueLabel}`}>
            <AppText variant="small" weight={500} numberOfLines={1} style={s.barLabel}>
              {d.label}
            </AppText>
            <View style={s.track}>
              <View style={[s.fill, { width: `${pct}%`, backgroundColor: colour }]} />
            </View>
            <AppText variant="small" tabular style={s.barValue}>
              {d.valueLabel}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

export interface TrendPoint {
  isoWeek: number;
  hours: number;
}

// The week-by-week line. Its width comes from onLayout: the one number flex cannot answer for a path.
export function TrendLine({
  points,
  accessibilityLabel,
  height = 140,
}: {
  points: TrendPoint[];
  accessibilityLabel: string;
  height?: number;
}) {
  const theme = useTheme();
  const locale = useLocale();
  const [width, setWidth] = useState(0);
  const padding = { left: 34, right: 12, top: 12, bottom: 24 };
  const { path, coords, ticks } = useMemo(() => {
    if (width === 0 || points.length === 0)
      return {
        path: '',
        coords: [] as { x: number; y: number }[],
        ticks: [] as { y: number; label: string }[],
      };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const max = Math.max(...points.map((p) => p.hours), 1);
    const min = 0;
    const x = (i: number) =>
      padding.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = (v: number) => padding.top + innerH - ((v - min) / (max - min)) * innerH;
    const coords = points.map((p, i) => ({ x: x(i), y: y(p.hours) }));
    const gen = d3Line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(curveMonotoneX);
    const label = (v: number) => formatHours(Math.round(v), locale, { unit: false });
    // The middle tick rounds to whole hours; at a low max (1 h, or an empty trend clamped to 1) it reads the same as
    // an end, so it is left out rather than shown twice under one key (CHQ-168).
    const tickValues = [0, max / 2, max].filter(
      (v, i, all) => i !== 1 || (label(v) !== label(all[0]!) && label(v) !== label(all[2]!)),
    );
    return {
      path: gen(coords) ?? '',
      coords,
      ticks: tickValues.map((v) => ({ y: y(v), label: label(v) })),
    };
  }, [height, locale, padding.bottom, padding.left, padding.right, padding.top, points, width]);
  return (
    <View
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ height }}
      testID="trend-line"
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {ticks.map((tick) => (
            <SvgText
              key={tick.label}
              x={padding.left - 8}
              y={tick.y + 4}
              fontSize={11}
              fill={theme.color.textMuted}
              textAnchor="end"
            >
              {tick.label}
            </SvgText>
          ))}
          {ticks.map((tick) => (
            <Path
              key={`g-${tick.label}`}
              d={`M${padding.left} ${tick.y} H${width - padding.right}`}
              stroke={theme.color.border}
              strokeWidth={1}
            />
          ))}
          {path ? (
            <Path d={path} stroke={theme.color.chart1} strokeWidth={2} fill="none" strokeLinecap="round" />
          ) : null}
          {coords.map((c, i) => (
            <Circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={4}
              fill={theme.color.chart1}
              stroke={theme.color.surface}
              strokeWidth={2}
            />
          ))}
          {points.map((p, i) => (
            <SvgText
              key={`l-${p.isoWeek}`}
              x={coords[i]?.x ?? 0}
              y={height - 6}
              fontSize={11}
              fill={theme.color.textMuted}
              textAnchor="middle"
            >
              {formatWeekLabel(p.isoWeek)}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
