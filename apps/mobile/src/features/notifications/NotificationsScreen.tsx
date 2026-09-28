import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Notification, NotificationKind } from '@klokka/api-client';
import { formatDate, formatTime } from '@klokka/core';
import { useActiveWorkspace } from '@/data/me';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/data/workspace';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { todayIn, toIsoDate } from '@/lib/dates';
import { useAppStore } from '@/store/appStore';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Button, Chip, EmptyState, Header, Icon, Screen, type IconName } from '@/ui';
import { targetForLink } from '@/features/push/notificationLinks';

const styles = (t: Theme) =>
  StyleSheet.create({
    filters: { flexDirection: 'row', gap: t.space[2] },
    row: { flexDirection: 'row', gap: t.space[3], paddingVertical: t.space[3], alignItems: 'flex-start' },
    tile: {
      width: 40,
      height: 40,
      borderRadius: t.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.surface2,
    },
    tileUnread: { backgroundColor: t.color.primary },
    body: { flex: 1, minWidth: 0, gap: 2 },
    meta: { alignItems: 'flex-end', gap: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.color.primary },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.color.border },
  });

export function iconForKind(kind: NotificationKind): IconName {
  switch (kind) {
    case 'HOURS_CHANGED':
      return 'clock';
    case 'INVITE_ACCEPTED':
      return 'check';
    case 'ENTRY_FLAGGED':
      return 'flag';
    case 'FLAG_RESOLVED':
      return 'check';
    case 'MONTH_CLOSED':
      return 'lock';
    case 'MONTH_REOPENED':
      return 'unlock';
    default:
      return 'bell';
  }
}

// The notification centre (CHQ-131): Today and Earlier, unread rows carry the primary tile and dot,
// a tap marks the row read and opens the day, month or flag it talks about.
export function NotificationsScreen({ pushed }: { pushed?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const { workspace } = useActiveWorkspace();
  const setActive = useAppStore((st) => st.setActiveWorkspace);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const query = useNotifications(null, unreadOnly);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0;
  const today = todayIn(workspace?.timezone ?? 'UTC');
  const [todayItems, earlier] = useMemo(() => {
    const a: Notification[] = [];
    const b: Notification[] = [];
    for (const n of items) (toIsoDate(n.createdAt) === today ? a : b).push(n);
    return [a, b];
  }, [items, today]);

  const open = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const role =
      n.workspaceId && workspace && n.workspaceId === workspace.workspaceId
        ? workspace.role
        : (workspace?.role ?? 'EMPLOYEE');
    const target = targetForLink(n.link, role, workspace?.membershipId ?? null);
    if (!target) return;
    if (target.workspaceId && target.workspaceId !== workspace?.workspaceId) setActive(target.workspaceId);
    router.push(target.href as never);
  };

  const renderRow = (n: Notification, last: boolean) => {
    const unread = !n.readAt;
    const iso = toIsoDate(n.createdAt);
    return (
      <View key={n.id}>
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={`${n.title} ${n.body}`}
          onPress={() => open(n)}
          pressScale={0.99}
          style={s.row}
          testID={`notification-${n.id}`}
        >
          <View style={[s.tile, unread ? s.tileUnread : null]}>
            <Icon
              name={iconForKind(n.kind)}
              size={20}
              color={unread ? theme.color.onPrimary : theme.color.textMuted}
            />
          </View>
          <View style={s.body}>
            <AppText weight={unread ? 700 : 500}>{n.title}</AppText>
            <AppText variant="small" tone="muted" numberOfLines={3}>
              {n.body}
            </AppText>
            {n.detail ? (
              <AppText variant="caption" tone="muted" numberOfLines={2}>
                {n.detail}
              </AppText>
            ) : null}
            {n.kind === 'ENTRY_FLAGGED' && n.link.flagId && workspace?.role === 'EMPLOYER' ? (
              <AppText variant="small" weight={600} tone="accent">
                {t('common.resolve')}
              </AppText>
            ) : null}
          </View>
          <View style={s.meta}>
            <AppText variant="caption" tone="muted" tabular>
              {iso === today
                ? formatTime(n.createdAt.toISOString(), locale, workspace?.timezone ?? 'UTC')
                : formatDate(iso, locale, 'weekdayDay')}
            </AppText>
            {unread ? <View style={s.dot} /> : null}
          </View>
        </AppPressable>
        {!last ? <View style={s.sep} /> : null}
      </View>
    );
  };

  return (
    <Screen
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
      onScroll={undefined}
      testID="notifications-screen"
      onMomentumScrollEnd={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
    >
      <Header
        title={t('notifications.title')}
        back={pushed}
        trailing={
          unreadCount > 0 ? (
            <Button
              label={t('notifications.markAllRead')}
              variant="ghost"
              compact
              hapticKind="confirm"
              onPress={() => markAll.mutate(null)}
              testID="mark-all-read"
            />
          ) : null
        }
      />
      <View style={s.filters}>
        <Chip
          label={t('common.all')}
          selected={!unreadOnly}
          onPress={() => setUnreadOnly(false)}
          testID="filter-all"
        />
        <Chip
          label={unreadCount > 0 ? `${t('common.unread')} ${unreadCount}` : t('common.unread')}
          selected={unreadOnly}
          onPress={() => setUnreadOnly(true)}
          index={1}
          testID="filter-unread"
        />
      </View>
      {query.isError ? (
        <EmptyState
          icon="alert"
          title={t('errors.NETWORK')}
          actionLabel={t('common.retry')}
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.data && items.length === 0 ? (
        <EmptyState
          icon="bell"
          title={unreadOnly ? t('notifications.emptyUnread') : t('notifications.empty')}
        />
      ) : null}
      {todayItems.length > 0 ? (
        <View>
          <AppText variant="eyebrow" tone="accent">
            {t('common.today')}
          </AppText>
          {todayItems.map((n, i) => renderRow(n, i === todayItems.length - 1))}
        </View>
      ) : null}
      {earlier.length > 0 ? (
        <View>
          <AppText variant="eyebrow" tone="accent">
            {t('common.earlier')}
          </AppText>
          {earlier.map((n, i) => renderRow(n, i === earlier.length - 1))}
        </View>
      ) : null}
      {query.isFetchingNextPage ? <ActivityIndicator color={theme.color.primary} /> : null}
      {query.hasNextPage && !query.isFetchingNextPage ? (
        <Button label={t('common.next')} variant="ghost" compact onPress={() => void query.fetchNextPage()} />
      ) : null}
      {items.length > 0 && workspace?.role === 'EMPLOYER' ? (
        <AppText variant="caption" tone="muted" align="center">
          {t('notifications.employerKindsHint')}
        </AppText>
      ) : null}
    </Screen>
  );
}
