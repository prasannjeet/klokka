import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemberInsights, useMemberMonth } from '@/data/workspace';
import { useT } from '@/i18n/LocaleProvider';
import { currentMonthIn, todayIn } from '@/lib/dates';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Avatar, Button, EmptyState, Icon, Screen } from '@/ui';
import { withWorkspace, type WorkspaceProps } from '@/features/shell/withWorkspace';
import { PushPrompt } from '@/features/push/PushPrompt';
import { MemberMonthView } from './MemberMonthView';

const styles = (t: Theme) =>
  StyleSheet.create({
    top: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[2],
      paddingLeft: t.space[1],
      paddingRight: t.space[3],
      height: t.tapMin,
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    bell: { width: t.tapMin, height: t.tapMin, alignItems: 'center', justifyContent: 'center' },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: t.color.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
  });

// "My month" (CHQ-121): the employee's tab. The workspace chip switches employers, the bell opens
// the notification centre. Everything below is the shared month view.
function MonthScreenInner({ workspace }: WorkspaceProps) {
  const t = useT();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const params = useLocalSearchParams<{ month?: string }>();
  const current = currentMonthIn(workspace.timezone);
  const [month, setMonth] = useState(typeof params.month === 'string' ? params.month : current);
  useEffect(() => {
    if (typeof params.month === 'string') setMonth(params.month);
  }, [params.month]);
  const data = useMemberMonth(workspace.workspaceId, workspace.membershipId, month);
  // The employer may turn analysis off for employees (CHQ-156); then the API refuses insights, so none are asked.
  const analysis = workspace.employeesSeeInsights;
  const insights = useMemberInsights(workspace.workspaceId, workspace.membershipId, month, analysis);
  const unread = workspace.unreadNotifications;
  return (
    <Screen refreshing={data.isRefetching} onRefresh={() => void data.refetch()} testID="month-screen">
      <View style={s.top}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('nav.switchWorkspace')}
          onPress={() => router.push('/choose-workspace')}
          style={s.chip}
          testID="workspace-chip"
        >
          <Avatar name={workspace.name} emoji={workspace.emoji} colour={workspace.colour} size={30} square />
          <AppText weight={700} numberOfLines={1} style={{ maxWidth: 180 }}>
            {workspace.name}
          </AppText>
          <Icon name="chevron-down" size={16} color={theme.color.textMuted} />
        </AppPressable>
        <View style={{ flex: 1 }} />
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={
            unread > 0 ? t('nav.notificationsUnread', { count: unread }) : t('nav.notifications')
          }
          onPress={() => router.push('/(tabs)/notifications')}
          style={s.bell}
          testID="bell"
        >
          <Icon name="bell" size={24} />
          {unread > 0 ? (
            <View style={s.badge}>
              <AppText variant="caption" weight={700} color={theme.color.onPrimary}>
                {unread > 9 ? '9+' : String(unread)}
              </AppText>
            </View>
          ) : null}
        </AppPressable>
      </View>
      <PushPrompt employer={false} />
      {data.isError ? (
        <EmptyState
          icon="alert"
          title={t('errors.NETWORK')}
          actionLabel={t('common.retry')}
          onAction={() => void data.refetch()}
        />
      ) : null}
      {data.data ? (
        <MemberMonthView
          data={data.data}
          month={month}
          weekStart={workspace.weekStart}
          currency={workspace.currency}
          today={todayIn(workspace.timezone)}
          timezone={workspace.timezone}
          onChangeMonth={setMonth}
          current={month === current}
          membershipId={workspace.membershipId}
          streakDays={insights.data?.streakDays}
          analysis={analysis}
          actions={
            <Button
              label={t('month.shareMyMonth')}
              variant="outline"
              icon="share"
              onPress={() => router.push({ pathname: '/share', params: { month } })}
              hapticKind="select"
              testID="share-month"
            />
          }
        />
      ) : null}
    </Screen>
  );
}

export const MonthScreen = withWorkspace(MonthScreenInner);
