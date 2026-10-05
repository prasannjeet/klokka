import { View } from 'react-native';
import { Weekday, type JobRecurrence } from '@klokka/api-client';
import { formatDate } from '@klokka/core';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { toIsoDate } from '@/lib/dates';
import { useTheme } from '@/theme';
import { AppText, Icon } from '@/ui';

export function RecurrenceSummary({ series }: { series: JobRecurrence }) {
  const t = useT(),
    locale = useLocale(),
    theme = useTheme();
  const rule = series.recurrence,
    weekly = rule.frequency === 'WEEKLY';
  const names = Object.values(Weekday);
  const days = names
    .filter((d) => rule.weekdays?.has(d))
    .map((d) =>
      new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2026, 9, 5 + names.indexOf(d))),
    )
    .join(', ');
  const period = t(weekly ? 'recurrence.weeks' : 'recurrence.months', { count: rule.interval });
  const label = weekly
    ? t('recurrence.weeklySummary', { period, days })
    : rule.lastDayOfMonth
      ? t('recurrence.monthlyLastSummary', { period })
      : t('recurrence.monthlySummary', { period, day: series.firstDate.getDate() });
  return (
    <View style={{ flexDirection: 'row', gap: theme.space[2], alignItems: 'flex-start' }}>
      <Icon name="refresh" size={16} color={theme.color.primary} />
      <View style={{ flex: 1, gap: theme.space[1] }}>
        <AppText variant="small" weight={600}>
          {label}
        </AppText>
        <AppText variant="caption" tone="muted">
          {series.stopped
            ? t('recurrence.stopped')
            : t('recurrence.until', { date: formatDate(toIsoDate(series.endDate), locale, 'long') })}
        </AppText>
      </View>
    </View>
  );
}
