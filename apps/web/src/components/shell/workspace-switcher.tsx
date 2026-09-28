'use client';

// The workspace switcher (CHQ-115): every workspace from /me with its colour, emoji and role, the current one
// checked, and "Create workspace". Keyboard and focus handling come from Base UI's Menu.
import Link from 'next/link';
import { useEffect, type CSSProperties } from 'react';
import { Menu } from '@base-ui/react/menu';
import type { MyWorkspace } from '@klokka/api-client';
import { useT } from '@/lib/i18n';
import { useMe } from '@/lib/me';
import { LAST_WORKSPACE_COOKIE } from '@/lib/prefs';
import { colourVar } from '@/lib/visual';
import { Icon } from '../icons';
import { roleLine } from './role-line';

function WsEmoji({ ws }: { ws: MyWorkspace }) {
  return (
    <span
      className="ws-em"
      style={{ '--ws-color': colourVar(ws.colour) } as CSSProperties}
      aria-hidden="true"
    >
      {ws.emoji}
    </span>
  );
}

export function WorkspaceSwitcher({ current, variant }: { current: MyWorkspace; variant: 'rail' | 'top' }) {
  const t = useT();
  const me = useMe();

  // "/" reopens the workspace used last on this browser.
  useEffect(() => {
    document.cookie = `${LAST_WORKSPACE_COOKIE}=${encodeURIComponent(current.slug)}; path=/; max-age=31536000; samesite=lax`;
  }, [current.slug]);

  return (
    <div className="ws">
      <Menu.Root>
        <Menu.Trigger className="ws-btn" aria-label={`${t('nav.switchWorkspace')}: ${current.name}`}>
          <WsEmoji ws={current} />
          <span>
            <b>{current.name}</b>
            {variant === 'rail' ? <span>{roleLine(t, current)}</span> : null}
          </span>
          <Icon name={variant === 'rail' ? 'updown' : 'chev-down'} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={6}>
            <Menu.Popup className="pop">
              {me.workspaces.map((ws) => {
                const isCurrent = ws.workspaceId === current.workspaceId;
                return (
                  <Menu.LinkItem
                    key={ws.workspaceId}
                    className="pop-item"
                    aria-current={isCurrent ? 'true' : undefined}
                    render={<Link href={`/w/${ws.slug}`} />}
                  >
                    <WsEmoji ws={ws} />
                    <span>
                      <b>{ws.name}</b>
                      <span>{roleLine(t, ws)}</span>
                    </span>
                    {isCurrent ? <Icon name="check" className="check" /> : <span />}
                  </Menu.LinkItem>
                );
              })}
              <Menu.Separator className="pop-sep" />
              <Menu.LinkItem className="pop-item" render={<Link href="/new" />}>
                <Icon name="plus" />
                <span>
                  <b>{t('nav.createWorkspace')}</b>
                </span>
                <span />
              </Menu.LinkItem>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
