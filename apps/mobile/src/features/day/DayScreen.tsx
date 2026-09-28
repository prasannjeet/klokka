import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  formatDate,
  formatHours,
  formatMoney,
  formatRate,
  formatTime,
  isoWeek,
  type IsoDate,
} from '@klokka/core';
import { useWorkspaceOrThrow } from '@/data/me';
import { useEntries, useEntryHistory, useWorkspace } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText, Avatar, Button, Card, EmptyState, Header, Numeral, Pill, Screen } from '@/ui';
import { withWorkspace } from '@/features/shell/withWorkspace';
import { AddHoursSheet, type AddHoursSheetHandle } from '@/features/entry/AddHoursSheet';
import { FlagSheet, type FlagSheetHandle } from '@/features/flags/FlagSheet';
import { HistoryList } from './HistoryList';

const styles = (t: Theme) =>
  StyleSheet.create({
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    noteHead: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], marginBottom: t.space[2] },
  });

// Day detail (CHQ-119): one day, one number, and the full history of who changed it and when.
// Flagging is the employee's only action; the employer edits through the same sheet as everywhere.
function DayScreenInner({ membershipId, date }: { membershipId: string; date: IsoDate }) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const workspace = useWorkspaceOrThrow();
  const employer = workspace.role === 'EMPLOYER';
  const entries = useEntries(workspace.workspaceId, date, date, membershipId);
  const entry = entries.data?.[0] ?? null;
  const history = useEntryHistory(workspace.workspaceId, entry?.id);
  const settings = useWorkspace(workspace.workspaceId);
  const addSheet = useRef<AddHoursSheetHandle>(null);
  const flagSheet = useRef<FlagSheetHandle>(null);
  const rate =
    settings.data?.showPay && entry?.earnings != null && entry.hours > 0
      ? entry.earnings / entry.hours
      : null;

  return (
    <>
      <Screen refreshing={entries.isRefetching} onRefresh={() => void entries.refetch()} testID="day-screen">
        <Header
          title={formatDate(date, locale, 'weekdayDayMonth')}
          subtitle={t('entry.daySubtitle', { week: isoWeek(date).week, workspace: workspace.name })}
          back
          large={false}
        />
        {entries.isLoading ? null : !entry ? (
          <EmptyState icon="clock" title={t('mobile.day.noEntry')} />
        ) : (
          <>
            <Numeral
              value={formatHours(entry.hours, locale, { unit: false })}
              unit={t('common.hourUnit')}
              variant="displayXl"
              accessibilityLabel={formatHours(entry.hours, locale)}
              testID="day-hours"
            />
            <View style={s.pills}>
              {workspace.showPay && entry.earnings != null && rate != null ? (
                <Pill
                  label={t('entry.earningsAtRate', {
                    money: formatMoney(entry.earnings, workspace.currency, locale),
                    rate: `${formatRate(rate, workspace.currency, locale)}/h`,
                  })}
                />
              ) : null}
              {entry.changeCount > 1 ? (
                <Pill
                  label={
                    entry.changeCount === 2
                      ? t('entry.editedOnce')
                      : t('entry.editedTimes', { count: entry.changeCount - 1 })
                  }
                />
              ) : null}
              {entry.flag?.status === 'OPEN' ? (
                <Pill label={t('status.open')} tone="warning" icon="flag" />
              ) : null}
              {entry.locked ? <Pill label={t('status.monthClosed')} icon="lock" /> : null}
            </View>
            <AppText variant="small" tone="muted">
              {t('entry.loggedItAt', {
                name: entry.updatedBy.name,
                time: formatTime(entry.updatedAt.toISOString(), locale, workspace.timezone),
              })}
            </AppText>
            {entry.note ? (
              <Card tint>
                <View style={s.noteHead}>
                  <Avatar name={entry.updatedBy.name} size={24} colour="PURPLE" />
                  <AppText variant="small" tone="muted">
                    {t('entry.note', { name: entry.updatedBy.name })}
                  </AppText>
                </View>
                <AppText variant="lead">{`"${entry.note}"`}</AppText>
              </Card>
            ) : null}
            <View>
              <AppText variant="eyebrow" tone="accent">
                {t('entry.history')}
              </AppText>
              {history.data ? <HistoryList changes={history.data} timezone={workspace.timezone} /> : null}
            </View>
            {employer ? (
              <Button
                label={t('mobile.day.editHours')}
                variant="secondary"
                icon="edit"
                disabled={entry.locked}
                onPress={() =>
                  addSheet.current?.open({
                    membershipId,
                    memberName: entry.memberName,
                    date,
                    existing: entry,
                    rounding: settings.data?.rounding ?? 'NONE',
                    defaultDayHours: settings.data?.defaultDayHours ?? 8,
                  })
                }
                testID="day-edit"
              />
            ) : (
              <View style={{ gap: theme.space[2] }}>
                <Button
                  label={t('flags.flagThisEntry')}
                  variant="outline"
                  icon="flag"
                  disabled={entry.flag?.status === 'OPEN' || entry.locked}
                  onPress={() => flagSheet.current?.open(entry)}
                  hapticKind="select"
                  testID="day-flag"
                />
                <AppText variant="caption" tone="muted" align="center">
                  {entry.flag?.status === 'OPEN'
                    ? t('flags.alreadyOpen')
                    : t('flags.flagThisEntryHint', { name: workspace.employerName ?? '' })}
                </AppText>
              </View>
            )}
          </>
        )}
      </Screen>
      {employer ? (
        <AddHoursSheet ref={addSheet} workspace={workspace} />
      ) : (
        <FlagSheet
          ref={flagSheet}
          workspaceId={workspace.workspaceId}
          employerName={workspace.employerName ?? ''}
        />
      )}
    </>
  );
}

export const DayScreen = withWorkspace(DayScreenInner);
