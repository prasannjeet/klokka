import { Fragment, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Member } from '@klokka/api-client';
import { addDays, formatHours, sumHours, weekOf, type IsoDate } from '@klokka/core';
import { useEntries, useFlags, useMembers, useWorkspace } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { todayIn } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Card, EmptyState, Header, Icon, Pill, Screen, Separator } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { JobSheet, type JobSheetHandle } from '@/features/jobs/JobSheet';
import { dayActionFor } from '@/features/jobs/dayAction';
import { entryFor } from '@/features/week/WeekCard';

const styles = (t: Theme) =>
  StyleSheet.create({
    round: {
      width: t.tapMin,
      height: t.tapMin,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      backgroundColor: t.color.primary,
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
    personText: { flex: 1, minWidth: 0, gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[2], flexWrap: 'wrap' },
    strip: { flexDirection: 'row', gap: 3, marginTop: 2 },
    stripDay: { flex: 1, height: 5, borderRadius: 3 },
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
  });

// People (CHQ-171, the employer's second tab): everyone with today's and this week's hours, a strip of the
// week's days, their open flags and a quick add for today; a tap opens the person on their week.
function PeopleScreenInner({ workspace }: WorkspaceProps) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const today = todayIn(workspace.timezone);
  const week = weekOf(today, workspace.weekStart);
  const first = week[0] as IsoDate;
  const last = week[6] as IsoDate;
  const yesterday = addDays(today, -1);
  const members = useMembers(workspace.workspaceId);
  const settings = useWorkspace(workspace.workspaceId);
  const entries = useEntries(workspace.workspaceId, yesterday < first ? yesterday : first, last);
  const flags = useFlags(workspace.workspaceId, 'OPEN');
  const sheet = useRef<JobSheetHandle>(null);
  const people: Member[] = (members.data ?? []).filter(
    (m) => m.role === 'EMPLOYEE' && m.status !== 'DEACTIVATED',
  );

  const quickAdd = (member: Member) => {
    const action = dayActionFor(entryFor(entries.data, member.id, today));
    if (action.kind === 'day') {
      router.push({
        pathname: '/day/[membershipId]/[date]',
        params: { membershipId: member.id, date: today },
      });
      return;
    }
    sheet.current?.open({
      membershipId: member.id,
      memberName: member.displayName,
      date: today,
      job: action.job,
      dayHours: action.dayHours,
      yesterdayHours: entryFor(entries.data, member.id, yesterday)?.hours ?? null,
      rounding: settings.data?.rounding ?? 'NONE',
      defaultDayHours: settings.data?.defaultDayHours ?? 8,
    });
  };

  return (
    <>
      <Screen
        onRefresh={() => Promise.all([entries.refetch(), members.refetch(), flags.refetch()])}
        testID="people-screen"
      >
        <Header
          title={t('nav.people')}
          subtitle={t('team.peopleSubtitle', {
            workspace: workspace.name,
            people: t('common.people', { count: people.length }),
          })}
          trailing={
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={t('team.invite')}
              onPress={() => router.push('/employees')}
              style={s.round}
              testID="manage-people"
            >
              <Icon name="plus" size={22} color={theme.color.onPrimary} />
            </AppPressable>
          }
        />
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
              const weekHours = sumHours(week.map((d) => entryFor(entries.data, member.id, d)?.hours ?? 0));
              const openFlags = (flags.data ?? []).filter((f) => f.membershipId === member.id).length;
              const weekLabel = formatHours(weekHours, locale);
              return (
                <Fragment key={member.id}>
                  {i > 0 ? <Separator /> : null}
                  <AppPressable
                    onPress={() =>
                      router.push({ pathname: '/member/[membershipId]', params: { membershipId: member.id } })
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
                      size={40}
                    />
                    <View style={s.personText}>
                      <View style={s.nameRow}>
                        <AppText weight={600} numberOfLines={1} style={{ flexShrink: 1 }}>
                          {member.displayName.split(' ')[0]}
                        </AppText>
                        {member.status === 'INVITED' ? (
                          <Pill label={t('status.invited')} tone="warning" />
                        ) : null}
                        {openFlags > 0 ? (
                          <Pill label={t('flags.openFlags', { count: openFlags })} tone="danger" />
                        ) : null}
                      </View>
                      <AppText variant="small" tone="muted" numberOfLines={1}>
                        {todayEntry
                          ? t('team.todayAndWeek', {
                              today: formatHours(todayEntry.hours, locale),
                              week: weekLabel,
                            })
                          : t('team.nothingToday', { week: weekLabel })}
                      </AppText>
                      <View style={s.strip} accessible={false}>
                        {week.map((d) => {
                          const hours = entryFor(entries.data, member.id, d)?.hours ?? 0;
                          return (
                            <View
                              key={d}
                              style={[
                                s.stripDay,
                                {
                                  backgroundColor:
                                    hours <= 0
                                      ? theme.color.surface2
                                      : d === today
                                        ? theme.color.primary
                                        : d > today
                                          ? theme.color.accent
                                          : theme.color.chart1,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>
                    </View>
                    <AppPressable
                      accessibilityRole="button"
                      accessibilityLabel={t('week.addHoursFor', { name: member.displayName })}
                      onPress={() => quickAdd(member)}
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
      </Screen>
      <JobSheet ref={sheet} workspace={workspace} />
    </>
  );
}

export const PeopleScreen = withWorkspace(PeopleScreenInner);
