import { cookies, headers } from 'next/headers';
import type { Locale } from '@klokka/core';
import { LOCALE_COOKIE, MODE_COOKIE, localeFrom, modeFrom, type Mode } from './prefs';

export async function requestLocale(): Promise<Locale> {
  const [jar, hdrs] = await Promise.all([cookies(), headers()]);
  return localeFrom(jar.get(LOCALE_COOKIE)?.value, hdrs.get('accept-language'));
}

export async function requestMode(): Promise<Mode | null> {
  return modeFrom((await cookies()).get(MODE_COOKIE)?.value);
}
