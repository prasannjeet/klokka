import { StyleSheet, View } from 'react-native';
import { Weekday, type JobRecurrence } from '@klokka/api-client';
import { formatDate, formatWeekday } from '@klokka/core';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText, Icon } from '@/ui';

const DAYS = Object.values(Weekday);

const styles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: t.space[3], alignItems: 'flex-start' },
    text: { flex: 1, gap: 2 },
  });

// The series a job belongs to: how often it repeats and when it ends (or that it was stopped).
export function RecurrenceSummary({ series }: { series: JobRecurrence }) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const rule = series.recurrence;
  const weekly = rule.frequency === 'WEEKLY';
  const days = DAYS.flatMap((d, i) =>
    rule.weekdays?.has(d) ? [formatWeekday(i, locale, 'short')] : [],
  ).join(', ');
  const period = t(weekly ? 'recurrence.weeks' : 'recurrence.months', { count: rule.interval });
  const label = weekly
    ? t('recurrence.weeklySummary', { period, days })
    : rule.lastDayOfMonth
      ? t('recurrence.monthlyLastSummary', { period })
      : t('recurrence.monthlySummary', { period, day: series.firstDate.getDate() });
  return (
    <View style={s.row}>
      <Icon name="refresh" size={18} color={theme.color.pop1} />
      <View style={s.text}>
        <AppText weight={500}>{label}</AppText>
        <AppText variant="small" tone="muted">
          {series.stopped
            ? t('recurrence.stopped')
            : t('recurrence.until', { date: formatDate(toIsoDate(series.endDate), locale, 'long') })}
        </AppText>
      </View>
    </View>
  );
}
