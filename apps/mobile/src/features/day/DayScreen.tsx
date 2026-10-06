import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Entry, FlagReason } from '@klokka/api-client';
import {
  addDays,
  formatDate,
  formatHours,
  formatMoney,
  formatMonthName,
  formatRate,
  formatTime,
  isoWeek,
  monthOf,
  type IsoDate,
  type MessageKey,
} from '@klokka/core';
import {
  useEntries,
  useEntryHistory,
  useFlag,
  useMember,
  useMemberMonth,
  useWorkspace,
} from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { formatDuration } from '@/lib/duration';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Button, Card, EmptyState, Header, Icon, Pill, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { JobSheet, type JobSheetHandle } from '@/features/jobs/JobSheet';
import { JobCard } from '@/features/jobs/JobCard';
import { FlagSheet, type FlagSheetHandle } from '@/features/flags/FlagSheet';
import { todayIn, toIsoDate } from '@/lib/dates';
import { type DayStep } from './dayStep';
import { HistoryList } from './HistoryList';

const styles = (t: Theme) =>
  StyleSheet.create({
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.space[2] },
    navButton: {
      width: t.tapMin,
      height: t.tapMin,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
    },
    navText: { flex: 1, alignItems: 'center', gap: t.space[1] },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2], justifyContent: 'center' },
    jobs: { gap: t.space[3] },
  });

// One day (CHQ-119, CHQ-156): the total, then one card per job with its place, time and note, and the full
// history of who changed the day. Any day opens, past or future; the employer adds and edits jobs through the
// job sheet unless the month is closed, the employee may flag the day.
function DayScreenInner({
  membershipId,
  date,
  workspace,
}: { membershipId: string; date: IsoDate } & WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const employer = workspace.role === 'EMPLOYER';
  const entries = useEntries(workspace.workspaceId, date, date, membershipId);
  const entry = entries.data?.[0] ?? null;
  const history = useEntryHistory(workspace.workspaceId, entry?.id);
  const settings = useWorkspace(workspace.workspaceId);
  // An empty day has no entry to say whether its month is closed, so the month says it.
  const month = useMemberMonth(workspace.workspaceId, membershipId, monthOf(date));
  const member = useMember(workspace.workspaceId, membershipId, undefined, employer);
  const addSheet = useRef<JobSheetHandle>(null);
  const flagSheet = useRef<FlagSheetHandle>(null);
  const locked = entry?.locked ?? month.data?.locked ?? false;
  const name = entry?.memberName ?? member.data?.displayName ?? month.data?.name ?? '';
  const firstName = name.split(' ')[0] ?? name;
  const jobs = entry?.jobs ?? [];
  const places = new Set(jobs.map((j) => j.location?.name).filter(Boolean)).size;
  const today = todayIn(workspace.timezone);
  const rate =
    settings.data?.showPay && entry?.earnings != null && entry.hours > 0
      ? entry.earnings / entry.hours
      : null;
  const go = (next: IsoDate, step: DayStep) =>
    router.replace({ pathname: '/day/[membershipId]/[date]', params: { membershipId, date: next, step } });
  const openSheet = (job: Entry['jobs'][number] | null) =>
    addSheet.current?.open({
      membershipId,
      memberName: name,
      date,
      job,
      dayHours: entry?.hours ?? 0,
      rounding: settings.data?.rounding ?? workspace.rounding,
      defaultDayHours: settings.data?.defaultDayHours ?? workspace.defaultDayHours,
    });

  return (
    <>
      <Screen refreshing={entries.isRefetching} onRefresh={() => void entries.refetch()} testID="day-screen">
        <Header
          title={employer ? name || t('jobs.title') : t('jobs.myDay')}
          subtitle={t('entry.daySubtitle', { week: isoWeek(date).week, workspace: workspace.name })}
          back
          large={false}
        />
        <View style={s.nav}>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('jobs.previousDay')}
            onPress={() => go(addDays(date, -1), 'back')}
            style={s.navButton}
            testID="day-prev"
          >
            <Icon name="chevron-left" size={22} />
          </AppPressable>
          <View style={s.navText}>
            {date === today ? (
              <AppText variant="eyebrow" tone="accent">
                {t('jobs.today')}
              </AppText>
            ) : date > today ? (
              <AppText variant="eyebrow" tone="accent">
                {t('jobs.planned')}
              </AppText>
            ) : null}
            <AppText variant="h2" align="center">
              {formatDate(date, locale, 'weekdayDayMonth')}
            </AppText>
            {entry ? (
              <AppText
                variant="displayL"
                align="center"
                accessibilityLabel={formatHours(entry.hours, locale)}
                testID="day-hours"
              >
                {formatDuration(entry.hours, t)}
              </AppText>
            ) : null}
          </View>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('jobs.nextDay')}
            onPress={() => go(addDays(date, 1), 'forward')}
            style={s.navButton}
            testID="day-next"
          >
            <Icon name="chevron-right" size={22} />
          </AppPressable>
        </View>
        {locked ? (
          <Card style={{ backgroundColor: theme.color.warningSoft }} testID="day-locked">
            <AppText variant="small" color={theme.color.warning}>
              {t('jobs.monthClosed', { month: formatMonthName(monthOf(date), locale) })}
            </AppText>
          </Card>
        ) : null}
        {entries.isLoading ? null : !entry ? (
          <>
            <EmptyState
              icon="briefcase"
              title={employer ? t('jobs.noJobs') : t('jobs.noJobsEmployee')}
              body={employer && !locked ? t('jobs.noJobsHint', { name: firstName }) : undefined}
              testID="day-empty"
            />
            {employer && !locked ? (
              <Button
                label={t('jobs.addJobFor', { name: firstName })}
                icon="plus"
                onPress={() => openSheet(null)}
                testID="day-add-job"
              />
            ) : null}
          </>
        ) : (
          <>
            <View style={s.pills}>
              <Pill label={t('jobs.jobCount', { count: jobs.length })} />
              {places > 0 ? <Pill label={t('jobs.placeCount', { count: places })} /> : null}
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
            </View>
            <AppText variant="small" tone="muted" align="center">
              {t('entry.loggedItAt', {
                name: entry.updatedBy.name,
                time: formatTime(entry.updatedAt.toISOString(), locale, workspace.timezone),
              })}
            </AppText>
            {employer && entry.flag?.status === 'OPEN' ? (
              <OpenFlagCard workspace={workspace} entry={entry} flagId={entry.flag.id} />
            ) : null}
            <View style={s.jobs}>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  workspaceId={workspace.workspaceId}
                  onEdit={employer && !locked ? () => openSheet(job) : undefined}
                />
              ))}
            </View>
            {employer && !locked ? (
              <Button
                label={t('jobs.addAnother')}
                variant="outline"
                icon="plus"
                onPress={() => openSheet(null)}
                testID="day-add-another"
              />
            ) : null}
            <View>
              <AppText variant="eyebrow" tone="accent">
                {t('entry.history')}
              </AppText>
              {history.data ? <HistoryList changes={history.data} timezone={workspace.timezone} /> : null}
            </View>
            {employer ? null : (
              <View style={{ gap: theme.space[2] }}>
                <Button
                  label={t('jobs.flagThisDay')}
                  variant="outline"
                  icon="flag"
                  disabled={entry.flag?.status === 'OPEN' || entry.locked}
                  onPress={() => flagSheet.current?.open(entry)}
                  hapticKind="select"
                  testID="day-flag"
                />
                <AppText variant="caption" tone="muted" align="center">
                  {entry.flag?.status === 'OPEN' ? t('flags.alreadyOpen') : t('jobs.flagThisDayHint')}
                </AppText>
              </View>
            )}
          </>
        )}
      </Screen>
      {employer ? (
        <JobSheet ref={addSheet} workspace={workspace} />
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
