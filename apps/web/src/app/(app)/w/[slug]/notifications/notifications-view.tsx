'use client';

// The notification centre (CHQ-131, mockups "Notifications"): this workspace's items for the signed-in
// user, all or unread, mark one by opening it or all at once. Push carries the same items on the phone.
import { useState } from 'react';
import { ChoiceGroup } from '@/components/choice-group';
import { FlagActions } from '@/components/flag-resolve';
import { Icon } from '@/components/icons';
import { NotificationItem } from '@/components/notification-item';
import { ViewHeader } from '@/components/view-header';
import { useT } from '@/lib/i18n';
import { useMarkAllRead, useNotifications } from '@/lib/notifications';
import { useFlags } from '@/lib/queries';
import { useWorkspace } from '@/lib/workspace';

export function NotificationsView() {
  const t = useT();
  const ws = useWorkspace();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const list = useNotifications(ws.id, filter === 'unread');
  const markAll = useMarkAllRead(ws.id);
  // A flag notification carries the resolve actions while the flag is still open (CHQ-135).
  const openFlags = useFlags(ws.id, 'OPEN');
  const flagById = new Map((ws.isEmployer ? (openFlags.data ?? []) : []).map((f) => [f.id, f]));
  const [now] = useState(() => new Date());
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = list.data?.pages[0]?.unreadCount ?? ws.my.unreadNotifications;

  return (
    <section className="view" aria-labelledby="h-notif">
      <ViewHeader
        id="h-notif"
        title={t('notifications.title')}
        sub={
          ws.isEmployer
            ? t('notifications.subtitleEmployer', { workspace: ws.my.name })
            : t('notifications.subtitleEmployee')
        }
        actions={
          <>
            <ChoiceGroup
              className="seg"
              label={t('notifications.filter')}
              value={filter}
              onChange={setFilter}
              choices={[
                { value: 'all', label: t('common.all') },
                { value: 'unread', label: t('common.unread') },
              ]}
            />
            <button
              className="btn btn-ghost"
              type="button"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <Icon name="check" />
              {t('notifications.markAllRead')}
            </button>
          </>
        }
      />
      {list.isSuccess && items.length === 0 ? (
        <div className="card empty-state">
          <Icon name="bell" />
          <p>{filter === 'unread' ? t('notifications.emptyUnread') : t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="hgrid list" aria-live="polite">
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              n={n}
              slug={ws.slug}
              workspaceId={ws.id}
              employer={ws.isEmployer}
              timeZone={ws.timezone}
              now={now}
              actions={(() => {
                const flag =
                  n.kind === 'ENTRY_FLAGGED' && n.link.flagId ? flagById.get(n.link.flagId) : undefined;
                return flag?.status === 'OPEN' ? <FlagActions ws={ws} flag={flag} compact /> : undefined;
              })()}
            />
          ))}
        </div>
      )}
      {list.hasNextPage ? (
        <button
          className="btn btn-ghost"
          type="button"
          style={{ marginTop: 16 }}
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {t('web.notifications.loadMore')}
        </button>
      ) : null}
    </section>
  );
}
