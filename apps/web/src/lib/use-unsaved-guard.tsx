'use client';

// Leaving a page with unsaved changes asks first (CHQ-185, the job editor): a reload or closing the tab gets the
// browser's own prompt, a click on any same-origin link and the browser's Back button get "Discard changes?". An
// untouched page leaves silently. Back is caught with one extra history entry pushed while there are changes:
// pressing Back lands on the page's own entry, which re-arms the guard and asks; Discard then leaves past both.
// Leaving forward (Discard on a link or Cancel, or the page's own leaveNow after a save) replaces that extra entry,
// so Back from the next page does not have to step through the editor twice.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '@/components/dialog';
import { Icon } from '@/components/icons';
import { useT } from './i18n';

const SENTINEL = 'klokkaUnsavedGuard';

type Pending = { kind: 'href'; href: string } | { kind: 'history' };

// The href a click would follow inside this app, or null when the browser should handle it as usual.
function guardedHref(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  const target = anchor.getAttribute('target');
  if ((target && target !== '_self') || anchor.hasAttribute('download')) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  const here = window.location;
  if (url.pathname === here.pathname && url.search === here.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function useUnsavedGuard(dirty: boolean): {
  requestLeave: (href: string) => void;
  leaveNow: (href: string) => void;
  dialog: ReactNode;
} {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const dirtyRef = useRef(dirty);
  const armed = useRef(false);
  const leaving = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const onClick = (event: MouseEvent) => {
      if (leaving.current) return;
      const href = guardedHref(event);
      if (href === null) return;
      event.preventDefault();
      event.stopPropagation();
      setPending({ kind: 'href', href });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    if (!armed.current) {
      armed.current = true;
      window.history.pushState(
        { ...(window.history.state ?? {}), [SENTINEL]: true },
        '',
        window.location.href,
      );
    }
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  // Back from the extra entry. With changes it is pushed again and the question asked; without (the changes were
  // undone) the person meant to leave, so the history moves on by one more.
  useEffect(() => {
    const onPopState = () => {
      if (!armed.current || leaving.current) return;
      if (dirtyRef.current) {
        window.history.pushState(
          { ...(window.history.state ?? {}), [SENTINEL]: true },
          '',
          window.location.href,
        );
        setPending({ kind: 'history' });
      } else {
        armed.current = false;
        window.history.back();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const leave = useCallback(
    (to: Pending) => {
      leaving.current = true;
      setPending(null);
      if (to.kind === 'history') window.history.go(-2);
      else if (armed.current) router.replace(to.href);
      else router.push(to.href);
    },
    [router],
  );

  const leaveNow = useCallback((href: string) => leave({ kind: 'href', href }), [leave]);

  const requestLeave = useCallback(
    (href: string) => {
      if (dirtyRef.current) setPending({ kind: 'href', href });
      else leave({ kind: 'href', href });
    },
    [leave],
  );

  const dialog = (
    <Dialog
      open={pending !== null}
      onClose={() => setPending(null)}
      title={t('jobs.discardTitle')}
      description={t('jobs.discardBody')}
    >
      <div className="dlg-actions">
        <button className="btn btn-ghost" type="button" onClick={() => setPending(null)}>
          {t('jobs.keepEditing')}
        </button>
        <button className="btn btn-danger" type="button" onClick={() => pending && leave(pending)}>
          <Icon name="trash" />
          {t('jobs.discard')}
        </button>
      </div>
    </Dialog>
  );

  return { requestLeave, leaveNow, dialog };
}
