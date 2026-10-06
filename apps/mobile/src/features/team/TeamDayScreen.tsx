import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { addDays, formatDate, formatHours, isoWeek, sumHours, type IsoDate } from '@klokka/core';
import { useEntries, useWorkspace } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { formatDuration } from '@/lib/duration';
import { todayIn } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Card, EmptyState, Header, Icon, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { JobSheet, type JobSheetHandle } from '@/features/jobs/JobSheet';
import type { DayStep } from '@/features/day/dayStep';
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

// The whole team on one date (CHQ-171, opened from the Calendar): the day's total, who worked and how long
// (a tap opens that person's day), open flags, and every job with its map and person. The arrows step a day,
// sliding from the side they point to (CHQ-169). The total is the sum of the listed entries (presentation).
function TeamDayScreenInner({ date, workspace }: { date: IsoDate } & WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const entries = useEntries(workspace.workspaceId, date, date);
  const settings = useWorkspace(workspace.workspaceId);
  const sheet = useRef<JobSheetHandle>(null);
  const employer = workspace.role === 'EMPLOYER';
  const today = todayIn(workspace.timezone);
  const list = (entries.data ?? []).filter((e) => e.hours > 0 || e.jobs.length > 0);
  const total = sumHours(list.map((e) => e.hours));
  const flagged = (entries.data ?? []).filter((e) => e.flag?.status === 'OPEN');
  const go = (next: IsoDate, step: DayStep) =>
    router.replace({ pathname: '/team-day/[date]', params: { date: next, step } });

  return (
    <>
      <Screen onRefresh={() => entries.refetch()} testID="team-day-screen">
        <Header
          title={t('team.wholeTeam')}
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
              {formatDuration(total, t)}
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
          <EmptyState icon="briefcase" title={t('team.noJobsDay')} testID="team-day-empty" />
        ) : (
          <TeamJobs
            entries={list}
            date={date}
            workspaceId={workspace.workspaceId}
            timezone={workspace.timezone}
            onEdit={
              employer
                ? ({ job, entry }) =>
                    sheet.current?.open({
                      membershipId: entry.membershipId,
                      memberName: entry.memberName,
                      date,
                      job,
                      dayHours: entry.hours,
                      rounding: settings.data?.rounding ?? workspace.rounding,
                      defaultDayHours: settings.data?.defaultDayHours ?? workspace.defaultDayHours,
                    })
                : undefined
            }
          />
        )}
      </Screen>
      {employer ? <JobSheet ref={sheet} workspace={workspace} /> : null}
    </>
  );
}

export const TeamDayScreen = withWorkspace(TeamDayScreenInner);
