'use client';

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponseError } from '@klokka/api-client';
import { useState, type ReactNode } from 'react';
import type { Locale } from '@klokka/core';
import { LocaleProvider } from '@/lib/i18n';
import { ToastProvider } from '@/components/toast';

// A 4xx answer (a problem the user or the contract caused) is final; only network trouble and 5xx are
// retried, twice.
function retry(failureCount: number, error: unknown): boolean {
  if (error instanceof ResponseError && error.response.status < 500) return false;
  return failureCount < 2;
}

// The session ended (refresh token expired, signed out elsewhere): back to sign-in, then back here.
function onUnauthenticated(error: unknown): void {
  if (!(error instanceof ResponseError) || error.response.status !== 401) return;
  const next = `${window.location.pathname}${window.location.search}`;
  // A full load on purpose: the sign-in page must re-read the session cookie on the server.
  window.location.href = `/sign-in?reauth=1&next=${encodeURIComponent(next)}`;
}

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: onUnauthenticated }),
        mutationCache: new MutationCache({ onError: onUnauthenticated }),
        defaultOptions: {
          queries: { staleTime: 30_000, retry, refetchOnWindowFocus: true },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <LocaleProvider initial={locale}>
        <ToastProvider>{children}</ToastProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
