import { StyleSheet, View } from 'react-native';
import type { JobRecurrence } from '@klokka/api-client';
import { describeEnd, describeRecurrence } from '@klokka/core';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText, Icon } from '@/ui';

const styles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: t.space[3], alignItems: 'flex-start' },
    text: { flex: 1, gap: 2 },
  });

// The series a job belongs to, in the sentence both clients share ("Every month on the third Wednesday, from
// 18 November 2026, no end date"); a stopped series says so underneath.
export function RecurrenceSummary({ series }: { series: JobRecurrence }) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  return (
    <View style={s.row}>
      <Icon name="refresh" size={18} color={theme.color.pop1} />
      <View style={s.text}>
        <AppText weight={500}>
          {describeRecurrence(series.recurrence, toIsoDate(series.firstDate), t, locale)}
        </AppText>
        {series.stopped ? (
          <AppText variant="small" tone="muted">
            {describeEnd(series, t, locale)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
