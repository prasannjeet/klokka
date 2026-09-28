'use client';

// The notification centre's data (CHQ-131): pages by cursor, per workspace, all or unread; reading one or
// all updates the list and the badge at once and puts it back if the API refuses.
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { Notification, NotificationKind, NotificationPage } from '@klokka/api-client';
import type { IconName } from '@/components/icons';
import { api } from './api';
import { meKey } from './me';
import { keys } from './queries';

const PAGE = 20;

export function useNotifications(workspaceId: string, unreadOnly: boolean, limit = PAGE) {
  return useInfiniteQuery({
    queryKey: [...keys.notifications(workspaceId, unreadOnly), limit],
    queryFn: ({ pageParam }) =>
      api.notifications.listNotifications({
        workspaceId,
        unreadOnly,
        limit,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? null,
    refetchInterval: 60_000,
  });
}

type Pages = InfiniteData<NotificationPage, string | null>;

function markInCache(
  pages: Pages | undefined,
  match: (n: Notification) => boolean,
  now: Date,
): Pages | undefined {
  if (!pages) return pages;
  return {
    ...pages,
    pages: pages.pages.map((p) => ({
      ...p,
      unreadCount: Math.max(0, p.unreadCount - p.items.filter((n) => !n.readAt && match(n)).length),
      items: p.items.map((n) => (!n.readAt && match(n) ? { ...n, readAt: now } : n)),
    })),
  };
}

function useReadMutation<V>(
  workspaceId: string,
  call: (v: V) => Promise<void>,
  match: (v: V) => (n: Notification) => boolean,
) {
  const queryClient = useQueryClient();
  const scope = ['notifications', workspaceId];
  return useMutation({
    mutationFn: call,
    onMutate: async (v: V) => {
      await queryClient.cancelQueries({ queryKey: scope });
      const snapshot = queryClient.getQueriesData<Pages>({ queryKey: scope });
      const now = new Date();
      for (const [key, data] of snapshot) queryClient.setQueryData(key, markInCache(data, match(v), now));
      return { snapshot };
    },
    onError: (_e, _v, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: scope });
      void queryClient.invalidateQueries({ queryKey: meKey });
    },
  });
}

export function useMarkRead(workspaceId: string) {
  return useReadMutation<string>(
    workspaceId,
    (notificationId) => api.notifications.markNotificationRead({ notificationId }),
    (id) => (n) => n.id === id,
  );
}

export function useMarkAllRead(workspaceId: string) {
  return useReadMutation<void>(
    workspaceId,
    () => api.notifications.markAllNotificationsRead({ workspaceId }),
    () => () => true,
  );
}

export const KIND_ICON: Record<NotificationKind, IconName> = {
  HOURS_CHANGED: 'clock',
  INVITE_ACCEPTED: 'users',
  ENTRY_FLAGGED: 'flag',
  FLAG_RESOLVED: 'flag',
  MONTH_CLOSED: 'lock',
  MONTH_REOPENED: 'unlock',
};

// Where a notification leads inside the workspace.
export function notificationHref(n: Notification, slug: string, employer: boolean): string {
  const base = `/w/${slug}`;
  const month = n.link.month ? `month=${n.link.month}` : '';
  if (employer) {
    if (n.kind === 'INVITE_ACCEPTED') return `${base}/employees`;
    const params = [n.link.membershipId ? `member=${n.link.membershipId}` : '', month]
      .filter(Boolean)
      .join('&');
    return `${base}/month${params ? `?${params}` : ''}`;
  }
  return month ? `${base}?${month}` : base;
}
