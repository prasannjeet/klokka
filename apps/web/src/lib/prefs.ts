// Cookie names shared by the server (first render) and the client (live changes). The stored preference
// is server-side (`/me` preferences, docs/DECISIONS.md D2 and D16); the cookies only let the very first
// HTML render in the right language and mode, before `/me` has been read.
import { isLocale, resolveLocale, type Locale } from '@klokka/core';

export const LOCALE_COOKIE = 'klokka_lang';
export const MODE_COOKIE = 'klokka_mode';
export const LAST_WORKSPACE_COOKIE = 'klokka_ws';

export type Mode = 'light' | 'dark';

export function localeFrom(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  const first = (acceptLanguage ?? '').split(',')[0]?.split(';')[0];
  return resolveLocale(first);
}

export function modeFrom(cookieValue: string | undefined): Mode | null {
  return cookieValue === 'light' || cookieValue === 'dark' ? cookieValue : null;
}
