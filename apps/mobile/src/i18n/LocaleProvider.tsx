import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';
import { resolveLocale, translator, type Locale, type Translator } from '@klokka/core';

// The language (docs/DECISIONS.md D2, D16): the user's server-side preference wins, the device
// language is the default on first sign-in. Every string reaches the screen through `useT()`, never
// as a literal.

interface LocaleContextValue {
  locale: Locale;
  t: Translator;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function deviceLocale(): Locale {
  return resolveLocale(getLocales()[0]?.languageCode ?? null);
}

export interface LocaleProviderProps {
  // The stored preference (`Preferences.language`), or undefined before /me has answered.
  preference?: Locale | undefined;
  children: ReactNode;
}

export function LocaleProvider({ preference, children }: LocaleProviderProps) {
  const locale = preference ?? deviceLocale();
  const value = useMemo<LocaleContextValue>(() => ({ locale, t: translator(locale) }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (value === null) throw new Error('useT must be used inside a LocaleProvider');
  return value;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}

export function useT(): Translator {
  return useLocaleContext().t;
}
