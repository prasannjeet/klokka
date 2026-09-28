import type { MessageKey } from '@klokka/core';
import type { IconName } from '../icons';

export interface NavItem {
  href: string;
  label: MessageKey;
  tab: MessageKey;
  icon: IconName;
  badge?: true;
  exact?: true;
}

export function workspaceNav(slug: string, employer: boolean): NavItem[] {
  const base = `/w/${slug}`;
  const notifications: NavItem = {
    href: `${base}/notifications`,
    label: 'nav.notifications',
    tab: 'nav.notifications',
    icon: 'bell',
    badge: true,
  };
  if (employer) {
    return [
      { href: base, label: 'nav.overview', tab: 'nav.overview', icon: 'home', exact: true },
      { href: `${base}/week`, label: 'nav.weekGrid', tab: 'nav.week', icon: 'grid' },
      { href: `${base}/employees`, label: 'nav.employees', tab: 'nav.people', icon: 'users' },
      { href: `${base}/month`, label: 'nav.employeeMonth', tab: 'nav.month', icon: 'calendar' },
      notifications,
      { href: `${base}/settings`, label: 'nav.settings', tab: 'nav.settings', icon: 'settings' },
    ];
  }
  return [
    { href: base, label: 'nav.myMonth', tab: 'nav.myMonth', icon: 'calendar', exact: true },
    { href: `${base}/week`, label: 'nav.week', tab: 'nav.week', icon: 'clock' },
    notifications,
    { href: `${base}/profile`, label: 'nav.profile', tab: 'nav.profile', icon: 'user' },
  ];
}

// The phone tab bar carries five at most; the employer's notifications live in the top bar bell.
export function tabNav(items: NavItem[], employer: boolean): NavItem[] {
  return employer ? items.filter((i) => i.icon !== 'bell') : items;
}

export function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
