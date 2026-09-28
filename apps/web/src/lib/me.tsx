'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Me, MyWorkspace } from '@klokka/api-client';
import { api } from './api';
import { useLocale, useSetLocale } from './i18n';
import { applyMode, modeOfPreference } from './mode';

const MeContext = createContext<Me | null>(null);

export const meKey = ['me'] as const;

// The server layout reads /me once; the client keeps it fresh (badge counts, switcher, preferences).
export function MeProvider({ initial, children }: { initial: Me; children: ReactNode }) {
  return (
    <MeContext.Provider value={initial}>
      <PreferenceSync />
      {children}
    </MeContext.Provider>
  );
}

export function useMe(): Me {
  const initial = useContext(MeContext);
  if (!initial) throw new Error('useMe outside <MeProvider>');
  const { data } = useQuery({
    queryKey: meKey,
    queryFn: () => api.me.getMe(),
    initialData: initial,
    refetchInterval: 60_000,
  });
  return data;
}

export function useMyWorkspace(slug: string): MyWorkspace | null {
  return useMe().workspaces.find((w) => w.slug === slug) ?? null;
}

// The stored language and theme (server-side preferences) win over the first-render cookies.
function PreferenceSync() {
  const me = useMe();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const language = me.preferences.language;
  const theme = me.preferences.theme;
  useEffect(() => {
    if (language !== locale) setLocale(language);
  }, [language, locale, setLocale]);
  useEffect(() => {
    applyMode(modeOfPreference(theme));
  }, [theme]);
  return null;
}
