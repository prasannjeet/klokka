import { Fragment, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Entry, Member } from '@klokka/api-client';
import { addDays, formatDate, formatHours, formatWeekday, isoWeek, weekOf, type IsoDate } from '@klokka/core';
import {
  sameDate,
  useEntries,
  useFlags,
  useMembers,
  useWorkspace,
  useWorkspaceInsights,
} from '@/data/workspace';
import { useMe } from '@/data/me';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { todayIn, toIsoDate } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Card, EmptyState, Icon, Pill, Screen, Separator } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { JobSheet, type JobSheetHandle } from '@/features/jobs/JobSheet';
import { dayActionFor } from '@/features/jobs/dayAction';
import { PushPrompt } from '@/features/push/PushPrompt';

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
    strip: { flexDirection: 'row', gap: 6 },
    cell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: t.space[2],
      borderRadius: t.radius.chip,
      backgroundColor: t.color.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.color.border,
      gap: 2,
    },
    cellToday: { backgroundColor: t.color.secondary, borderColor: t.color.secondary },
    section: { gap: t.space[2] },
    sectionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: t.space[1],
    },
    list: { padding: 0, overflow: 'hidden' },
    person: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      paddingVertical: t.space[3],
      paddingLeft: t.space[4],
      paddingRight: t.space[3],
    },
    personText: { flex: 1, minWidth: 0 },
    plus: {
      width: 36,
      height: 36,
      borderRadius: t.radius.chip,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.surface2,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    flagRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
  });

function entryFor(entries: Entry[] | undefined, membershipId: string, date: IsoDate): Entry | undefined {
  return entries?.find((e) => e.membershipId === membershipId && sameDate(e.workDate, date));
}

// Home, Today (employer): the employees in one grouped list with today's hours and a quick add on the
// right; the strip on top is the team's week; open flags sit below the people.
function HomeScreenInner({ workspace }: WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const today = todayIn(workspace.timezone);
  const week = weekOf(today, workspace.weekStart);
  const first = week[0] as IsoDate;
  const members = useMembers(workspace.workspaceId);
  const settings = useWorkspace(workspace.workspaceId);
  const entries = useEntries(workspace.workspaceId, addDays(today, -1), today);
  const insights = useWorkspaceInsights(workspace.workspaceId);
  const flags = useFlags(workspace.workspaceId, 'OPEN');
  // The employer's own name: the workspace's employerName is only filled in for employees (the contract).
  const ownName = useMe().data?.user.name.trim() ?? '';
  const sheet = useRef<JobSheetHandle>(null);
  const people: Member[] = (members.data ?? []).filter(
    (m) => m.role === 'EMPLOYEE' && m.status !== 'DEACTIVATED',
  );
  const currentWeek = insights.data?.currentWeek;
  const unread = workspace.unreadNotifications;
  const stripHours = (date: IsoDate) => currentWeek?.days.find((d) => toIsoDate(d.date) === date)?.hours ?? 0;

  const openFor = (member: Member) => {
    const action = dayActionFor(entryFor(entries.data, member.id, today));
    if (action.kind === 'day') {
      router.push({
        pathname: '/day/[membershipId]/[date]',
        params: { membershipId: member.id, date: today },
      });
      return;
    }
    const yesterday = entryFor(entries.data, member.id, addDays(today, -1));
    sheet.current?.open({
      membershipId: member.id,
      memberName: member.displayName,
      date: today,
      job: action.job,
      dayHours: action.dayHours,
      yesterdayHours: yesterday?.hours ?? null,
      rounding: settings.data?.rounding ?? 'NONE',
      defaultDayHours: settings.data?.defaultDayHours ?? 8,
    });
  };

  return (
    <>
      <Screen
        refreshing={entries.isRefetching}
        onRefresh={() => void Promise.all([entries.refetch(), insights.refetch(), flags.refetch()])}
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
        <View style={s.strip} accessible accessibilityLabel={t('week.teamWeekLabel')}>
          {week.map((date, i) => {
            const isToday = date === today;
            const hours = stripHours(date);
            return (
              <View key={date} style={[s.cell, isToday ? s.cellToday : null]}>
                <AppText variant="eyebrow" color={isToday ? theme.color.onSecondary : theme.color.textMuted}>
                  {formatWeekday(workspace.weekStart === 'MONDAY' ? i : (i + 6) % 7, locale, 'short').slice(
                    0,
                    3,
                  )}
                </AppText>
                <AppText
                  variant="small"
                  weight={700}
                  color={isToday ? theme.color.onSecondary : theme.color.text}
                  tabular
                >
                  {hours > 0 ? formatHours(hours, locale, { unit: false }) : formatDate(date, locale, 'day')}
                </AppText>
              </View>
            );
          })}
        </View>
        {currentWeek ? (
          <AppText variant="small" tone="muted">
            <AppText variant="small" weight={700}>
              {t('week.hoursSoFar', {
                week: isoWeek(first).week,
                hours: formatHours(currentWeek.hours, locale),
              })}
            </AppText>{' '}
            {t('week.loggedToday', {
              logged: currentWeek.membersLoggedToday,
              total: currentWeek.membersActive,
            })}
          </AppText>
        ) : null}
        <PushPrompt employer />
        <View style={s.section}>
          <View style={s.sectionHead}>
            <AppText variant="small" weight={600} tone="muted" accessibilityRole="header">
              {t('nav.people')}
            </AppText>
            <AppPressable
              onPress={() => router.push('/employees')}
              accessibilityRole="button"
              accessibilityLabel={t('common.manage')}
              hitSlop={12}
              testID="manage-people"
            >
              <AppText variant="small" weight={600} tone="accent">
                {t('common.manage')}
              </AppText>
            </AppPressable>
          </View>
          {members.data && people.length === 0 ? (
            <EmptyState
              icon="users"
              title={t('employees.addEmployeeShortHint')}
              actionLabel={t('employees.addEmployee')}
              onAction={() => router.push('/employees')}
            />
          ) : null}
          {people.length > 0 ? (
            <Card style={s.list}>
              {people.map((member, i) => {
                const todayEntry = entryFor(entries.data, member.id, today);
                const yesterday = entryFor(entries.data, member.id, addDays(today, -1));
                const subtitle = todayEntry?.note
                  ? todayEntry.note
                  : yesterday
                    ? t('mobile.home.yesterdayHours', { hours: formatHours(yesterday.hours, locale) })
                    : '';
                return (
                  <Fragment key={member.id}>
                    {i > 0 ? <Separator /> : null}
                    <AppPressable
                      onPress={() =>
                        router.push({
                          pathname: '/member/[membershipId]',
                          params: { membershipId: member.id },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={member.displayName}
                      pressScale={0.995}
                      style={s.person}
                      testID={`person-${member.id}`}
                    >
                      <Avatar
                        name={member.displayName}
                        emoji={member.avatarEmoji}
                        colour={member.status === 'INVITED' ? 'YELLOW' : 'PURPLE'}
                        size={36}
                      />
                      <View style={s.personText}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
                          <AppText weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
                            {member.displayName.split(' ')[0]}
                          </AppText>
                          {member.status === 'INVITED' ? (
                            <Pill label={t('status.invited')} tone="warning" />
                          ) : null}
                        </View>
                        {subtitle ? (
                          <AppText variant="small" tone="muted" numberOfLines={1}>
                            {subtitle}
                          </AppText>
                        ) : null}
                      </View>
                      {todayEntry ? (
                        <AppText weight={600} tabular>
                          {formatHours(todayEntry.hours, locale)}
                        </AppText>
                      ) : (
                        <AppText variant="small" tone="muted">
                          {t('entry.nothingYet')}
                        </AppText>
                      )}
                      <AppPressable
                        accessibilityRole="button"
                        accessibilityLabel={t('week.addHoursFor', { name: member.displayName })}
                        onPress={() => openFor(member)}
                        hapticKind="select"
                        pressScale={0.9}
                        hitSlop={4}
                        style={s.plus}
                        testID={`add-${member.id}`}
                      >
                        <Icon name="plus" size={18} color={theme.color.text} />
                      </AppPressable>
                    </AppPressable>
                  </Fragment>
                );
              })}
            </Card>
          ) : null}
        </View>
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
      </Screen>
      <JobSheet ref={sheet} workspace={workspace} />
    </>
  );
}

export const HomeScreen = withWorkspace(HomeScreenInner);
