'use client';

import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import { signOutAction } from '@/lib/auth-actions';
import { useT } from '@/lib/i18n';
import { useMe } from '@/lib/me';
import { Avatar } from '../avatar';
import { Icon } from '../icons';

// The operator's account menu: back to their own workspaces, or sign out. Rail and phone top bar variants.
export function OperatorAccountMenu({ variant }: { variant: 'rail' | 'top' }) {
  const t = useT();
  const me = useMe();
  return (
    <Menu.Root>
      {variant === 'rail' ? (
        <Menu.Trigger className="acct-btn">
          <Avatar name={me.user.name} emoji={me.user.avatarEmoji} index={0} />
          <span>
            <b>{me.user.name}</b>
            <span>{t('role.platformAdmin')}</span>
          </span>
          <Icon name="chev-up" />
        </Menu.Trigger>
      ) : (
        <Menu.Trigger className="ib" aria-label={t('web.operator.account')}>
          <Avatar name={me.user.name} emoji={me.user.avatarEmoji} index={0} size="sm" />
        </Menu.Trigger>
      )}
      <Menu.Portal>
        <Menu.Positioner
          side={variant === 'rail' ? 'top' : 'bottom'}
          align={variant === 'rail' ? 'start' : 'end'}
          sideOffset={6}
        >
          <Menu.Popup className="pop">
            <Menu.LinkItem className="pop-item" render={<Link href="/" />}>
              <Icon name="arrow-left" />
              <span>
                <b>{t('nav.backToApp')}</b>
                <span>{t('nav.yourOwnWorkspaces')}</span>
              </span>
              <span />
            </Menu.LinkItem>
            <Menu.Separator className="pop-sep" />
            <Menu.Item className="pop-item" onClick={() => void signOutAction()}>
              <Icon name="logout" />
              <span>
                <b>{t('common.signOut')}</b>
              </span>
              <span />
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
