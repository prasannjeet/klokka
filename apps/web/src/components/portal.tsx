'use client';

// Fixed bars (the week grid's save bar) live at the end of <body>: the views rise in with a transform
// animation, and a transformed ancestor would pin a fixed child to itself instead of the viewport.
import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const noSubscription = () => () => {};

export function BodyPortal({ children }: { children: ReactNode }) {
  const inBrowser = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  return inBrowser ? createPortal(children, document.body) : null;
}
