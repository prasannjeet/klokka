import type { MessageKey } from '@klokka/core';
import type { IconName } from '../icons';

export interface OperatorNavItem {
  href: string;
  label: MessageKey;
  tab: MessageKey;
  icon: IconName;
  badge?: true;
}

export const OPERATOR_NAV: readonly OperatorNavItem[] = [
  { href: '/ops/workspaces', label: 'nav.workspaces', tab: 'web.operator.tab.workspaces', icon: 'grid' },
  { href: '/ops/users', label: 'nav.users', tab: 'nav.users', icon: 'users' },
  {
    href: '/ops/invitations',
    label: 'nav.invitations',
    tab: 'web.operator.tab.invitations',
    icon: 'mail',
    badge: true,
  },
  { href: '/ops/volume', label: 'nav.volume', tab: 'nav.volume', icon: 'chart' },
  { href: '/ops/health', label: 'nav.health', tab: 'nav.health', icon: 'activity' },
];
