'use client';

import { useSyncExternalStore } from 'react';

const noSubscription = () => () => {};

// The operator has no workspace zone: dates show in the browser's zone. The server renders with UTC and
// every date in the console is rendered from client-side data, so the two never meet in one render.
export function useBrowserTimeZone(): string {
  return useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => 'UTC',
  );
}
