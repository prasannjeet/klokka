import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDate, formatHours, formatMonthName, formatWeekday, weekOf, type IsoDate } from '@klokka/core';
import { useEntries, useFlags, useWorkspaceInsights } from '@/data/workspace';
import { useMe } from '@/data/me';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { formatDuration } from '@/lib/duration';
import { currentMonthIn, todayIn, toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Card, EmptyState, Icon, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { PushPrompt } from '@/features/push/PushPrompt';
import { Bars } from '@/features/insights/charts';
import { TeamJobs } from '@/features/team/TeamJobs';

const styles = (t: Theme) =>
  StyleSheet.create({
    top: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
    bell: {
      width: 40,
      height: 40,
      borderRadius: t.radius.chip,
      borderWidth: 1,
      borderColor: t.color.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: t.color.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    big: { gap: t.space[1] },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 76 },
    barCol: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end', height: '100%' },
    bar: { width: '100%', borderRadius: 6, minHeight: 3 },
    planned: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.color.accent },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    tiles: { flexDirection: 'row', gap: t.space[3] },
    tile: { flex: 1, gap: 2 },
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      paddingHorizontal: t.space[1],
    },
    flagRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  });

// Home, Today (employer, CHQ-171): the team's hours today against the running week, who works today and the
// month so far, open flags, the month per person (the rest of Insights one tap away), then every job today with
// its map, who does it and where it stands. The people moved to their own tab. Figures are the insights read
// model (D9); the job list is today's entries.
function HomeScreenInner({ workspace }: WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const today = todayIn(workspace.timezone);
  const week = weekOf(today, workspace.weekStart);
  const entries = useEntries(workspace.workspaceId, today, today);
  const insights = useWorkspaceInsights(workspace.workspaceId);
  const flags = useFlags(workspace.workspaceId, 'OPEN');
  // The employer's own name: the workspace's employerName is only filled in for employees (the contract).
  const ownName = useMe().data?.user.name.trim() ?? '';
  const data = insights.data;
  const currentWeek = data?.currentWeek;
  const unread = workspace.unreadNotifications;
  const dayHours = (date: IsoDate) => currentWeek?.days.find((d) => toIsoDate(d.date) === date)?.hours ?? 0;
  const maxDay = Math.max(1, ...week.map(dayHours));
  const jobs = (entries.data ?? []).flatMap((e) => e.jobs);
  const places = new Set(jobs.map((j) => j.location?.placeId ?? j.location?.name).filter(Boolean)).size;
  const monthName = formatMonthName(currentMonthIn(workspace.timezone), locale, false);

  return (
    <Screen
      onRefresh={() => Promise.all([entries.refetch(), insights.refetch(), flags.refetch()])}
      testID="home-screen"
    >
      <View style={s.top}>
        <Avatar name={workspace.name} emoji={workspace.emoji} colour={workspace.colour} size={36} square />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="body" weight={600} numberOfLines={1}>
            {workspace.name}
          </AppText>
          <AppText variant="small" tone="muted" numberOfLines={1}>
            {ownName ? t('mobile.home.employerLine', { name: ownName }) : t('role.employer')}
          </AppText>
        </View>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={
            unread > 0 ? t('nav.notificationsUnread', { count: unread }) : t('nav.notifications')
          }
          onPress={() => router.push('/notifications-list')}
          hitSlop={(theme.tapMin - 40) / 2}
          style={s.bell}
          testID="bell"
        >
          <Icon name="bell" size={20} />
          {unread > 0 ? (
            <View style={s.badge}>
              <AppText variant="caption" weight={700} color={theme.color.onPrimary}>
                {unread > 9 ? '9+' : String(unread)}
              </AppText>
            </View>
          ) : null}
        </AppPressable>
      </View>
      <View style={s.titleRow}>
        <AppText variant="h1" accessibilityRole="header">
          {t('common.today')}
        </AppText>
        <AppText variant="small" tone="muted">
          {formatDate(today, locale, 'weekdayDayMonth')}
        </AppText>
      </View>
      <Card style={{ gap: theme.space[3] }}>
        <View style={s.big}>
          <AppText
            variant="displayL"
            accessibilityLabel={formatHours(dayHours(today), locale)}
            testID="home-today-hours"
          >
            {formatDuration(dayHours(today), t)}
          </AppText>
          <AppText variant="small" tone="muted">
            {[t('jobs.jobCount', { count: jobs.length }), t('jobs.placeCount', { count: places })].join(', ')}
          </AppText>
        </View>
        <View style={s.bars} accessible accessibilityLabel={t('week.teamWeekLabel')}>
          {week.map((date, i) => {
            const hours = dayHours(date);
            const future = date > today;
            return (
              <View key={date} style={s.barCol}>
                <View
                  style={[
                    s.bar,
                    { height: `${Math.max(4, (hours / maxDay) * 100) * 0.7}%` },
                    hours <= 0
                      ? { backgroundColor: theme.color.surface2 }
                      : future
                        ? [s.planned, { backgroundColor: 'transparent' }]
                        : { backgroundColor: date === today ? theme.color.primary : theme.color.chart1 },
                  ]}
                />
                <AppText variant="caption" tone={date === today ? 'primary' : 'muted'}>
                  {formatWeekday(workspace.weekStart === 'MONDAY' ? i : (i + 6) % 7, locale, 'short').slice(
                    0,
                    2,
                  )}
                </AppText>
              </View>
            );
          })}
        </View>
        {currentWeek ? (
          <View style={s.weekRow}>
            <AppText variant="small" tone="muted">
              {t('team.weekSoFar')}
            </AppText>
            <AppText variant="small" weight={700} tabular>
              {formatHours(currentWeek.hours, locale)}
            </AppText>
          </View>
        ) : null}
      </Card>
      {data ? (
        <View style={s.tiles}>
          <Card style={s.tile}>
            <AppText variant="eyebrow" tone="muted">
              {t('team.workingToday')}
            </AppText>
            <AppText variant="h2" tabular testID="home-working-today">
              {t('team.workingTodayValue', {
                logged: data.currentWeek.membersLoggedToday,
                total: data.currentWeek.membersActive,
              })}
            </AppText>
          </Card>
          <Card style={s.tile}>
            <AppText variant="eyebrow" tone="muted">
              {t('team.monthSoFar', { month: monthName })}
            </AppText>
            <AppText variant="h2" tabular>
              {formatHours(data.totalHours, locale)}
            </AppText>
          </Card>
        </View>
      ) : null}
      <PushPrompt employer />
      {flags.data && flags.data.length > 0 ? (
        <Card tint>
          <AppText variant="small" weight={700}>
            {t('flags.openFlags', { count: flags.data.length })}
          </AppText>
          {flags.data.slice(0, 3).map((flag) => (
            <AppPressable
              key={flag.id}
              onPress={() => router.push({ pathname: '/flag/[flagId]', params: { flagId: flag.id } })}
              accessibilityRole="button"
              accessibilityLabel={t('flags.flagSummary', {
                name: flag.memberName,
                date: formatDate(toIsoDate(flag.workDate), locale, 'weekdayDayMonth'),
                message: flag.message,
              })}
              style={[s.flagRow, { paddingTop: theme.space[2] }]}
              testID={`flag-${flag.id}`}
            >
              <Icon name="flag" size={18} color={theme.color.warning} />
              <AppText variant="small" tone="muted" numberOfLines={2} style={{ flex: 1 }}>
                {t('flags.flagSummary', {
                  name: flag.memberName.split(' ')[0] ?? flag.memberName,
                  date: formatDate(toIsoDate(flag.workDate), locale, 'weekdayDayMonth'),
                  message: flag.message,
                })}
              </AppText>
              <AppText variant="small" weight={600} tone="accent">
                {t('common.resolve')}
              </AppText>
            </AppPressable>
          ))}
        </Card>
      ) : null}
      {data && data.perMember.length > 0 ? (
        <Card>
          <View style={[s.sectionHead, { paddingHorizontal: 0, marginBottom: theme.space[3] }]}>
            <AppText variant="eyebrow" tone="muted">
              {t('team.byPerson', { month: monthName })}
            </AppText>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={t('team.allInsights')}
              onPress={() => router.push('/insights')}
              hitSlop={12}
              testID="all-insights"
            >
              <AppText variant="small" weight={600} tone="accent">
                {t('team.allInsights')}
              </AppText>
            </AppPressable>
          </View>
          <Bars
            data={data.perMember.map((m) => ({
              key: m.membershipId,
              label: m.name.split(' ')[0] ?? m.name,
              value: m.hours,
              valueLabel: formatHours(m.hours, locale, { unit: false }),
            }))}
            accessibilityLabel={t('team.byPerson', { month: monthName })}
          />
        </Card>
      ) : null}
      <View style={s.sectionHead}>
        <AppText variant="h3" accessibilityRole="header">
          {t('team.todaysJobs')}
        </AppText>
      </View>
      {entries.isLoading ? null : jobs.length === 0 ? (
        <EmptyState icon="briefcase" title={t('team.noJobsToday')} testID="home-no-jobs" />
      ) : (
        <TeamJobs
          entries={entries.data}
          date={today}
          workspaceId={workspace.workspaceId}
          timezone={workspace.timezone}
        />
      )}
    </Screen>
  );
}

export const HomeScreen = withWorkspace(HomeScreenInner);
