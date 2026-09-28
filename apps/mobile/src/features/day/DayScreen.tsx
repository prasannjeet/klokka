import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Entry, FlagReason } from '@klokka/api-client';
import {
  formatDate,
  formatHours,
  formatMoney,
  formatRate,
  formatTime,
  isoWeek,
  type IsoDate,
  type MessageKey,
} from '@klokka/core';
import { useEntries, useEntryHistory, useFlag, useWorkspace } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText, Avatar, Button, Card, EmptyState, Header, Numeral, Pill, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { AddHoursSheet, type AddHoursSheetHandle } from '@/features/entry/AddHoursSheet';
import { FlagSheet, type FlagSheetHandle } from '@/features/flags/FlagSheet';
import { toIsoDate } from '@/lib/dates';
import { HistoryList } from './HistoryList';

const styles = (t: Theme) =>
  StyleSheet.create({
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
    noteHead: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], marginBottom: t.space[2] },
  });

// Day detail (CHQ-119): one day, one number, and the full history of who changed it and when.
// Flagging is the employee's only action; the employer edits through the same sheet as everywhere.
function DayScreenInner({
  membershipId,
  date,
  workspace,
}: { membershipId: string; date: IsoDate } & WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
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
                <Pill label={t('status.open')} tone="danger" icon="flag" />
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
            {employer && entry.flag?.status === 'OPEN' ? (
              <OpenFlagCard workspace={workspace} entry={entry} flagId={entry.flag.id} />
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

const REASON: Record<FlagReason, MessageKey> = {
  MORE: 'flags.reasonMoreShort',
  LESS: 'flags.reasonLessShort',
  NOT_IN: 'flags.reasonNotInShort',
};

// The employee's open flag on the employer's day (CHQ-145, the web's day panel): why, what they say,
// their message and when, and the way to resolve it.
function OpenFlagCard({
  workspace,
  entry,
  flagId,
}: {
  workspace: WorkspaceProps['workspace'];
  entry: Entry;
  flagId: string;
}) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const router = useRouter();
  const flag = useFlag(workspace.workspaceId, flagId);
  if (!flag.data) return null;
  const f = flag.data;
  const first = f.memberName.split(' ')[0] ?? f.memberName;
  return (
    <Card style={{ backgroundColor: theme.color.dangerSoft, gap: theme.space[2] }} testID="day-open-flag">
      <AppText weight={700} tone="danger">
        {t('flags.flagFrom', { name: first })}
      </AppText>
      <AppText variant="small">
        {t(REASON[f.reason])}
        {f.suggestedHours != null
          ? `. ${t('flags.says', { name: first })} ${formatHours(f.suggestedHours, locale)}`
          : ''}
      </AppText>
      {f.message ? <AppText variant="lead">{`"${f.message}"`}</AppText> : null}
      <AppText variant="caption" tone="muted">
        {t('flags.raised', {
          when: `${formatDate(toIsoDate(f.raisedAt), locale, 'weekdayDay')}, ${formatTime(f.raisedAt.toISOString(), locale, workspace.timezone)}`,
        })}
      </AppText>
      <Button
        label={t('flags.resolveFlag')}
        icon="flag"
        disabled={entry.locked}
        onPress={() => router.push({ pathname: '/flag/[flagId]', params: { flagId } })}
        testID="day-resolve-flag"
      />
    </Card>
  );
}

export const DayScreen = withWorkspace(DayScreenInner);
