'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, Mark } from '@/components/ui/Icon';

type Props = {
  labels: { open: string; close: string; menu: string };
  items: ReadonlyArray<{ href: string; label: string }>;
  actions: ReactNode;
  foot: ReactNode;
};

/** The burger and its full-screen menu (below 1200 px, where the inline links are hidden). */
export function MobileMenu({ labels, items, actions, foot }: Props) {
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);

  const shut = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) burger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = 'hidden';
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') shut(true);
    };
    const onResize = () => {
      if (window.matchMedia('(min-width: 1200px)').matches) shut(false);
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open, shut]);

  return (
    <>
      <button
        ref={burger}
        type="button"
        className="icon-btn nav-burger"
        aria-label={labels.open}
        aria-expanded={open}
        aria-controls="menu"
        onClick={() => setOpen(true)}
      >
        <span className="burger-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      <div className="menu" id="menu" role="dialog" aria-modal="true" aria-label={labels.menu} hidden={!open}>
        <div className="menu-head">
          <span className="wordmark">
            <Mark className="mark" />
            klokka
          </span>
          <button
            ref={close}
            type="button"
            className="icon-btn"
            aria-label={labels.close}
            onClick={() => shut(true)}
          >
            <Icon name="x" />
          </button>
        </div>
        <nav aria-label={labels.menu}>
          {items.map((item) => (
            <a key={item.href} className="item" href={item.href} onClick={() => shut(false)}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="menu-actions">{actions}</div>
        <div className="menu-foot">{foot}</div>
      </div>
    </>
  );
}
