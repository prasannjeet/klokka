export const locales = ['sv', 'en'] as const;
export type Locale = (typeof locales)[number];

/** Swedish is served from the site root; every other locale gets a prefix. */
export const defaultLocale: Locale = 'sv';

/** BCP 47 tags for <html lang> and hreflang. */
export const htmlLang: Record<Locale, string> = { sv: 'sv-SE', en: 'en' };

/** Open Graph locale tags. */
export const ogLocale: Record<Locale, string> = { sv: 'sv_SE', en: 'en_GB' };

/** localeHref('sv') is '/', localeHref('en') is '/en', localeHref('en', '#faq') is '/en#faq'. */
export function localeHref(locale: Locale, path = '/'): string {
  const prefix = locale === defaultLocale ? '' : `/${locale}`;
  if (path.startsWith('#')) return `${prefix || '/'}${path}`;
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${clean}` || '/';
}

export function isLocale(value: string | undefined): value is Locale {
  return (locales as readonly string[]).includes(value ?? '');
}

/** Unknown route segments still need a shell to render the 404 page in. */
export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'sv' ? 'en' : 'sv';
}
