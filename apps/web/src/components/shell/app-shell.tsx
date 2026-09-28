'use client';

// The signed-in shell (mockups web-employer.html / web-employee.html): a rail on desktop, a top bar and a
// tab bar on phones. Navigation depends on the role the API reports for this workspace.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { useMe } from '@/lib/me';
import { useWorkspaceView } from '@/lib/workspace';
import { colourVar } from '@/lib/visual';
import { Avatar } from '../avatar';
import { Icon, Mark } from '../icons';
import { AccountMenu } from './account-menu';
import { Now } from './now';
import { isActive, tabNav, workspaceNav } from './nav';
import { WorkspaceSwitcher } from './workspace-switcher';

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const me = useMe();
  const view = useWorkspaceView();
  const pathname = usePathname();
  if (!view) return null;
  const items = workspaceNav(view.slug, view.isEmployer);
  const unread = view.my.unreadNotifications;
  const profileHref = `/w/${view.slug}/profile`;
  const wsStyle = { '--ws-color': colourVar(view.my.colour) } as CSSProperties;

  return (
    <div className="app" style={wsStyle}>
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <aside className="rail" aria-label={t('nav.workspaceNavigation')}>
        <Link className="wordmark" href="/" aria-label={t('nav.klokkaHome')}>
          <Mark />
          klokka
        </Link>
        <WorkspaceSwitcher current={view.my} variant="rail" />
        <nav className="nav" aria-label={t('nav.sections')}>
          {items.map((item) => (
            <Link
              key={item.href}
              className="nav-item"
              href={item.href}
              aria-current={isActive(item, pathname) ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              {t(item.label)}
              {item.badge && unread > 0 ? <span className="cnt">{unread}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="rail-foot">
          <Now timeZone={view.timezone} />
          <AccountMenu profileHref={profileHref} operator={me.platformAdmin} />
        </div>
      </aside>

      <header className="topbar">
        <Link className="wordmark" href="/" aria-label={t('nav.klokkaHome')}>
          <Mark />
        </Link>
        <WorkspaceSwitcher current={view.my} variant="top" />
        <Link
          className="ib"
          href={`/w/${view.slug}/notifications`}
          aria-label={unread > 0 ? t('nav.notificationsUnread', { count: unread }) : t('nav.notifications')}
        >
          <Icon name="bell" />
          {unread > 0 ? <span className="cnt">{unread}</span> : null}
        </Link>
        <Link className="ib" href={profileHref} aria-label={t('nav.profile')}>
          <Avatar name={me.user.name} emoji={me.user.avatarEmoji} index={1} size="sm" />
        </Link>
      </header>

      <main className="content" id="main">
        {children}
      </main>

      <nav className="tabbar" aria-label={t('nav.sections')}>
        {tabNav(items, view.isEmployer).map((item) => (
          <Link
            key={item.href}
            className="tab"
            href={item.href}
            aria-current={isActive(item, pathname) ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            {t(item.tab)}
            {item.badge && unread > 0 ? <span className="cnt">{unread}</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
