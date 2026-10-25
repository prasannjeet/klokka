import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Member } from '@klokka/api-client';
import {
  addDays,
  formatDate,
  formatHours,
  formatMonthName,
  isoWeek,
  monthOf,
  sumHours,
  type IsoDate,
} from '@klokka/core';
import { useEntries, useMembers, useMonthSummary } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { todayIn } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Button, Card, EmptyState, Header, Icon, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { jobEditorHref } from '@/features/jobs/jobEditorHref';
import { NewJobPill } from '@/features/jobs/NewJobPill';
import type { DayStep } from '@/features/day/dayStep';
import { PickPersonSheet, type PickPersonHandle } from './PickPersonSheet';
import { TeamJobs } from './TeamJobs';

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
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2], justifyContent: 'center' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[2],
      minHeight: t.tapMin,
      paddingLeft: t.space[1],
      paddingRight: t.space[3],
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    flagRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  });

// Who a job can be planned for: the employees the employer's other New job flows offer (the People list, the web
// Employees list), so never a deactivated one (CHQ-191).
export function plannable(members: readonly Member[] | undefined): Member[] {
  return (members ?? []).filter((m) => m.role === 'EMPLOYEE' && m.status !== 'DEACTIVATED');
}

// The whole team on one date (CHQ-171, opened from the Calendar): the day's total, who worked and how long
// (a tap opens that person's day), open flags, and every job with its map and person. The arrows step a day,
// sliding from the side they point to (CHQ-169). The total is the sum of the listed entries (presentation).
// The employer plans a single job on the date from here (CHQ-191): straight to the editor when one person can
// take it, through a pick of the person otherwise; a closed month keeps the action in view, disabled, and says why.
function TeamDayScreenInner({ date, workspace }: { date: IsoDate } & WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const entries = useEntries(workspace.workspaceId, date, date);
  const employer = workspace.role === 'EMPLOYER';
  const today = todayIn(workspace.timezone);
  const list = (entries.data ?? []).filter((e) => e.hours > 0 || e.jobs.length > 0);
  const total = sumHours(list.map((e) => e.hours));
  const flagged = (entries.data ?? []).filter((e) => e.flag?.status === 'OPEN');
  const go = (next: IsoDate, step: DayStep) =>
    router.replace({ pathname: '/team-day/[date]', params: { date: next, step } });
  const members = useMembers(workspace.workspaceId);
  const summary = useMonthSummary(workspace.workspaceId, monthOf(date), employer);
  const pick = useRef<PickPersonHandle>(null);
  const eligible = plannable(members.data);
  // Hidden until the team is known, and when nobody can take a job; a closed month disables it.
  const canPlan = employer && members.isSuccess && eligible.length > 0;
  const locked = summary.data?.locked ?? false;
  const monthName = formatMonthName(monthOf(date), locale);
  const openEditor = (membershipId: string) =>
    router.push(jobEditorHref({ membershipId, date, mode: 'single' }));
  const newJob = () => {
    const only = eligible.length === 1 ? eligible[0] : undefined;
    if (only) openEditor(only.id);
    else pick.current?.present();
  };

  return (
    <>
      <Screen onRefresh={() => entries.refetch()} testID="team-day-screen">
        <Header
          title={t('team.wholeTeam')}
          subtitle={t('entry.daySubtitle', { week: isoWeek(date).week, workspace: workspace.name })}
          back
          large={false}
          trailing={
            canPlan ? (
              <NewJobPill
                onPress={newJob}
                disabled={locked}
                accessibilityHint={locked ? t('jobs.monthClosed', { month: monthName }) : undefined}
                testID="team-day-new-job"
              />
            ) : null
          }
        />
        <View style={s.nav}>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('jobs.previousDay')}
            onPress={() => go(addDays(date, -1), 'back')}
            style={s.navButton}
            testID="team-day-prev"
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
            <AppText
              variant="displayL"
              align="center"
              accessibilityLabel={formatHours(total, locale)}
              testID="team-day-hours"
            >
              {formatHours(total, locale)}
            </AppText>
          </View>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel={t('jobs.nextDay')}
            onPress={() => go(addDays(date, 1), 'forward')}
            style={s.navButton}
            testID="team-day-next"
          >
            <Icon name="chevron-right" size={22} />
          </AppPressable>
        </View>
        {canPlan && locked ? (
          <Card style={{ backgroundColor: theme.color.warningSoft }} testID="team-day-locked">
            <AppText variant="small" color={theme.color.warning}>
              {t('jobs.monthClosed', { month: monthName })}
            </AppText>
          </Card>
        ) : null}
        {list.length > 0 ? (
          <View style={s.chips}>
            {list.map((e) => (
              <AppPressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={t('team.dayTotalFor', {
                  name: e.memberName,
                  hours: formatHours(e.hours, locale),
                })}
                onPress={() =>
                  router.push({
                    pathname: '/member/[membershipId]',
                    params: { membershipId: e.membershipId, view: 'day', date },
                  })
                }
                style={s.chip}
                testID={`team-day-person-${e.membershipId}`}
              >
                <Avatar name={e.memberName} size={32} />
                <AppText variant="small" weight={600} tabular>
                  {t('team.dayTotalFor', {
                    name: e.memberName.split(' ')[0] ?? e.memberName,
                    hours: formatHours(e.hours, locale),
                  })}
                </AppText>
              </AppPressable>
            ))}
          </View>
        ) : null}
        {employer && flagged.length > 0 ? (
          <Card style={{ backgroundColor: theme.color.dangerSoft, gap: theme.space[2] }}>
            {flagged.map((e) => (
              <AppPressable
                key={e.id}
                accessibilityRole="button"
                accessibilityLabel={`${t('flags.flagFrom', { name: e.memberName })}, ${t('common.resolve')}`}
                onPress={() =>
                  router.push({ pathname: '/flag/[flagId]', params: { flagId: e.flag?.id as string } })
                }
                style={s.flagRow}
                testID={`team-day-flag-${e.id}`}
              >
                <Icon name="flag" size={18} color={theme.color.danger} />
                <AppText variant="small" weight={600} style={{ flex: 1 }}>
                  {t('flags.flagFrom', { name: e.memberName.split(' ')[0] ?? e.memberName })}
                </AppText>
                <AppText variant="small" weight={600} tone="accent">
                  {t('common.resolve')}
                </AppText>
              </AppPressable>
            ))}
          </Card>
        ) : null}
        {entries.isLoading ? null : list.length === 0 ? (
          <>
            <EmptyState
              icon="briefcase"
              title={t('team.noJobsDay')}
              body={employer && members.isSuccess && !canPlan ? t('jobs.noEligibleMembers') : undefined}
              testID="team-day-empty"
            />
            {canPlan && !locked ? (
              <Button label={t('jobs.addJob')} icon="plus" onPress={newJob} testID="team-day-add-job" />
            ) : null}
          </>
        ) : (
          <TeamJobs
            entries={list}
            date={date}
            workspaceId={workspace.workspaceId}
            timezone={workspace.timezone}
            onEdit={
              employer
                ? ({ job, entry }) =>
                    router.push(
                      jobEditorHref({ membershipId: entry.membershipId, date, mode: 'edit', jobId: job.id }),
                    )
                : undefined
            }
          />
        )}
      </Screen>
      {canPlan ? <PickPersonSheet ref={pick} members={eligible} onPick={openEditor} /> : null}
    </>
  );
}

export const TeamDayScreen = withWorkspace(TeamDayScreenInner);
