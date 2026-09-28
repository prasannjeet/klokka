'use client';

// The operator console's shell (mockup web-operator.html): the same rail, top bar and tab bar as the
// product, the OPERATOR tag, a denser type scale (`.op`), and no workspace switcher; the console is about
// the hosted instance, never one business.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { formatNumber } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { Icon, Mark } from '../icons';
import { Now } from '../shell/now';
import { OperatorAccountMenu } from './account-menu';
import { OPERATOR_NAV, type OperatorNavItem } from './nav';
import { usePendingInvitations } from './queries';
import { useBrowserTimeZone } from './use-time-zone';

function isActive(item: OperatorNavItem, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function OperatorShell({ children }: { children: ReactNode }) {
  const t = useT();
  const locale = useLocale();
  const pathname = usePathname();
  const timeZone = useBrowserTimeZone();
  const pending = usePendingInvitations().data ?? 0;
  const badge = (item: OperatorNavItem) =>
    item.badge && pending > 0 ? <span className="cnt">{formatNumber(pending, locale)}</span> : null;

  return (
    <div className="app op">
      <a className="skip-link" href="#main">
        {t('common.skipToContent')}
      </a>
      <aside className="rail" aria-label={t('web.operator.navigation')}>
        <Link className="wordmark" href="/" aria-label={t('nav.backToApp')}>
          <Mark />
          klokka
          <span className="tag">{t('operator.title')}</span>
        </Link>
        <nav className="nav" aria-label={t('nav.sections')} style={{ marginTop: 22 }}>
          {OPERATOR_NAV.map((item) => (
            <Link
              key={item.href}
              className="nav-item"
              href={item.href}
              aria-current={isActive(item, pathname) ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              {t(item.label)}
              {badge(item)}
            </Link>
          ))}
        </nav>
        <p className="hint op-note">{t('operator.aggregatesOnly')}</p>
        <div className="rail-foot">
          <Now timeZone={timeZone} />
          <OperatorAccountMenu variant="rail" />
        </div>
      </aside>

      <header className="topbar">
        <Link className="wordmark" href="/" aria-label={t('nav.backToApp')}>
          <Mark />
        </Link>
        <span className="op-tag">
          <Icon name="shield" />
          {t('operator.title')}
        </span>
        <span className="op-spacer" />
        <OperatorAccountMenu variant="top" />
      </header>

      <main className="content" id="main">
        {children}
      </main>

      <nav className="tabbar" aria-label={t('nav.sections')}>
        {OPERATOR_NAV.map((item) => (
          <Link
            key={item.href}
            className="tab"
            href={item.href}
            aria-current={isActive(item, pathname) ? 'page' : undefined}
          >
            <Icon name={item.icon} />
            {t(item.tab)}
            {badge(item)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
