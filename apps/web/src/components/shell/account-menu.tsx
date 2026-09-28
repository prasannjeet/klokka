'use client';

import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import { signOutAction } from '@/lib/auth-actions';
import { useT } from '@/lib/i18n';
import { useMe } from '@/lib/me';
import { Avatar } from '../avatar';
import { Icon } from '../icons';

export function AccountMenu({ profileHref, operator }: { profileHref: string | null; operator: boolean }) {
  const t = useT();
  const me = useMe();
  return (
    <Menu.Root>
      <Menu.Trigger className="acct-btn">
        <Avatar name={me.user.name} emoji={me.user.avatarEmoji} index={1} />
        <span>
          <b>{me.user.name}</b>
          <span>{me.platformAdmin ? t('role.platformAdmin') : (me.user.email ?? '')}</span>
        </span>
        <Icon name="chev-up" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={6}>
          <Menu.Popup className="pop">
            {profileHref ? (
              <Menu.LinkItem className="pop-item" render={<Link href={profileHref} />}>
                <Icon name="user" />
                <span>
                  <b>{t('nav.profile')}</b>
                  <span>{t('profile.subtitle')}</span>
                </span>
                <span />
              </Menu.LinkItem>
            ) : null}
            {operator ? (
              <Menu.LinkItem className="pop-item" render={<Link href="/ops" />}>
                <Icon name="shield" />
                <span>
                  <b>{t('web.shell.operatorConsole')}</b>
                  <span>{t('operator.aggregatesOnly')}</span>
                </span>
                <span />
              </Menu.LinkItem>
            ) : null}
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
