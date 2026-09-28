'use client';

// One row of the notification centre: the API's localized title and body (in the user's stored language,
// D2), the time in the workspace zone, unread state, and a way into what it is about.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Notification } from '@klokka/api-client';
import { formatWhen } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { KIND_ICON, notificationHref, useMarkRead } from '@/lib/notifications';
import { Icon } from './icons';

export function NotificationItem({
  n,
  slug,
  workspaceId,
  employer,
  timeZone,
  now,
  actions,
}: {
  n: Notification;
  slug: string;
  workspaceId: string;
  employer: boolean;
  timeZone: string;
  now: Date;
  actions?: ReactNode;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const markRead = useMarkRead(workspaceId);
  const href = notificationHref(n, slug, employer);
  const unread = !n.readAt;

  function open() {
    if (unread) markRead.mutate(n.id);
    router.push(href);
  }

  return (
    <div className={unread ? 'nitem unread' : 'nitem'}>
      <span className="t-app" aria-hidden="true">
        <Icon name={KIND_ICON[n.kind] ?? 'bell'} />
      </span>
      <div>
        <button type="button" className="open" onClick={open}>
          <span className="ttl">{n.title}</span>
          <p>
            {n.body}
            {n.detail ? ` ${n.detail}` : ''}
          </p>
        </button>
        <div className="nact">
          {actions}
          {!actions ? (
            <Link
              className="btn btn-ghost btn-sm"
              href={href}
              onClick={() => unread && markRead.mutate(n.id)}
            >
              <Icon name={n.kind === 'INVITE_ACCEPTED' ? 'users' : 'calendar'} />
              {n.kind === 'INVITE_ACCEPTED'
                ? t('web.notifications.seeEmployees')
                : employer || n.kind === 'MONTH_CLOSED' || n.kind === 'MONTH_REOPENED'
                  ? t('web.notifications.seeMonth')
                  : t('web.notifications.seeDay')}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="side">
        <time dateTime={n.createdAt.toISOString()}>
          {formatWhen(n.createdAt, now, locale, timeZone, {
            today: t('common.today'),
            yesterday: t('common.yesterday'),
          })}
        </time>
        <span
          className="ndot"
          role="img"
          aria-label={unread ? t('web.notifications.unreadDot') : undefined}
          aria-hidden={!unread}
        />
      </div>
    </div>
  );
}
