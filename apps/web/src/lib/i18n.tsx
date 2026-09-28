'use client';

// The client side of the typed catalogue (docs/DECISIONS.md D2): one locale for the whole tree, changed in
// place when the user picks a language (CHQ-134), mirrored into <html lang> and a cookie so the next server
// render starts in the same language.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { translator, type Locale, type Translator } from '@klokka/core';

import { LOCALE_COOKIE } from './prefs';

interface LocaleState {
  locale: Locale;
  t: Translator;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleState | null>(null);

function persist(locale: Locale) {
  document.documentElement.lang = locale;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LocaleProvider({ initial, children }: { initial: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persist(next);
  }, []);
  const value = useMemo(() => ({ locale, t: translator(locale), setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleState(): LocaleState {
  const state = useContext(LocaleContext);
  if (!state) throw new Error('useT/useLocale outside <LocaleProvider>');
  return state;
}

export function useT(): Translator {
  return useLocaleState().t;
}

export function useLocale(): Locale {
  return useLocaleState().locale;
}

export function useSetLocale(): (locale: Locale) => void {
  return useLocaleState().setLocale;
}
