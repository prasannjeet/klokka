import { useEffect, useMemo, type ReactNode } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  CACHE_MAX_AGE_MS,
  cacheBuster,
  createPersister,
  createQueryClient,
  wireManagers,
} from './queryClient';

// Mounted INSIDE the signed-in branch, so "no queries while restoring, all of it torn down on
// sign-out" is enforced by the component tree rather than by flags. The persister needs the user id,
// which the first /me answers; until then the client runs without persistence.
export function DataProvider({ children, userId }: { children: ReactNode; userId: string | null }) {
  const client = useMemo(() => createQueryClient(), []);
  useEffect(() => wireManagers(), []);
  const persister = useMemo(() => (userId ? createPersister(userId) : null), [userId]);
  if (!persister) return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE_MS, buster: cacheBuster() }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
