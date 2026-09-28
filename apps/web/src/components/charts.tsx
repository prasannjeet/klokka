'use client';

// Insight charts on Recharts 3 (docs/research/web.md section 4): series colours are the theme's
// --chart-1..4 in fixed order, values and labels in text tokens, bars at most 24 px with a rounded data end,
// one axis. Every chart also carries its numbers as text (accessible name), and animation follows the
// reduced-motion preference.
import { useId } from 'react';
import { useReducedMotion } from 'motion/react';
import { Area, AreaChart, Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis } from 'recharts';
import { formatHours } from '@klokka/core';
import { useLocale } from '@/lib/i18n';

export interface SeriesPoint {
  label: string;
  value: number;
  // Emphasis for one bar (the busiest), muted for a partial period, hollow for one still to come.
  tone?: 'top' | 'part' | 'empty';
}

export function Spark({
  points,
  label,
  height = 88,
}: {
  points: readonly SeriesPoint[];
  label: string;
  height?: number;
}) {
  const locale = useLocale();
  const reduced = useReducedMotion();
  const gradient = useId().replace(/:/g, '');
  const data = points.map((p) => ({
    ...p,
    tick: `${p.label} ${formatHours(p.value, locale, { unit: false })}`,
  }));
  return (
    <div className="chart spark" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 14, left: 14, bottom: 0 }}
          accessibilityLayer={false}
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="tick"
            tickLine={false}
            axisLine={false}
            interval={0}
            height={20}
            tickMargin={6}
            padding={{ left: 28, right: 28 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill={`url(#${gradient})`}
            dot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
            activeDot={false}
            isAnimationActive={!reduced}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const TONE_FILL: Record<NonNullable<SeriesPoint['tone']> | 'base', string> = {
  base: 'var(--chart-1)',
  top: 'var(--primary)',
  part: 'color-mix(in srgb, var(--chart-1) 45%, var(--surface-2))',
  empty: 'transparent',
};

export function Columns({
  points,
  label,
  height = 132,
  showValues = true,
}: {
  points: readonly SeriesPoint[];
  label: string;
  height?: number;
  showValues?: boolean;
}) {
  const locale = useLocale();
  const reduced = useReducedMotion();
  return (
    <div className="chart" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={[...points]}
          margin={{ top: showValues ? 18 : 4, right: 4, left: 4, bottom: 0 }}
          accessibilityLayer={false}
        >
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} height={20} tickMargin={4} />
          <Bar
            dataKey="value"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={!reduced}
            minPointSize={2}
          >
            {points.map((p) => (
              <Cell
                key={p.label}
                fill={TONE_FILL[p.tone ?? 'base']}
                stroke={p.tone === 'empty' ? 'var(--border)' : 'none'}
              />
            ))}
            {showValues ? (
              <LabelList
                dataKey="value"
                position="top"
                className="bar-label"
                formatter={(v: unknown) =>
                  typeof v === 'number' && v > 0 ? formatHours(v, locale, { unit: false }) : ''
                }
              />
            ) : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
