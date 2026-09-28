import { StyleSheet, View } from 'react-native';
import type { EntryChange } from '@klokka/api-client';
import { formatDate, formatHours, formatTime } from '@klokka/core';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { toIsoDate } from '@/lib/dates';
import { useThemedStyles, type Theme } from '@/theme';
import { AppText } from '@/ui';

const styles = (t: Theme) =>
  StyleSheet.create({
    row: { paddingVertical: t.space[3], gap: 2 },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.color.border },
  });

// Who changed what and when (CHQ-119), the same list both roles see.
export function historyLine(change: EntryChange, locale: 'sv' | 'en', t: ReturnType<typeof useT>): string {
  const name = change.changedBy.name;
  const h = (v: number | null | undefined) => formatHours(v ?? 0, locale);
  switch (change.kind) {
    case 'CREATED':
      return t('entry.historyLogged', { name, hours: h(change.hoursAfter) });
    case 'UPDATED':
      return t('entry.historyChanged', { name, before: h(change.hoursBefore), after: h(change.hoursAfter) });
    case 'DELETED':
      return t('entry.historyRemoved', { name, hours: h(change.hoursBefore) });
    case 'FLAGGED':
      return t('entry.historyFlagged', { name });
    case 'FLAG_FIXED':
      return t('entry.historyFlagFixed', { name, hours: h(change.hoursAfter) });
    case 'FLAG_DISMISSED':
      return t('entry.historyFlagDismissed', { name, hours: h(change.hoursAfter ?? change.hoursBefore) });
    default:
      return name;
  }
}

export function HistoryList({ changes, timezone }: { changes: EntryChange[]; timezone: string }) {
  const t = useT();
  const locale = useLocale();
  const s = useThemedStyles(styles);
  return (
    <View testID="history-list">
      {changes.map((change, i) => (
        <View key={change.id}>
          <View style={s.row}>
            <AppText weight={500}>{historyLine(change, locale, t)}</AppText>
            <AppText variant="small" tone="muted">
              {formatDate(toIsoDate(change.changedAt), locale, 'weekdayDayMonth')},{' '}
              {formatTime(change.changedAt.toISOString(), locale, timezone)}
            </AppText>
          </View>
          {i < changes.length - 1 ? <View style={s.sep} /> : null}
        </View>
      ))}
    </View>
  );
}
