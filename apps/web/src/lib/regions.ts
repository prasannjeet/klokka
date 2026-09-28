// Countries, currencies and time zones for workspace settings. Names come from Intl.DisplayNames in the
// user's language, so nothing here is a user-facing string. Picking a country proposes its zone and
// currency; both stay editable.
import { intlLocale, type Locale } from '@klokka/core';

interface CountryDefaults {
  timezone: string;
  currency: string;
}

export const COUNTRIES: Record<string, CountryDefaults> = {
  SE: { timezone: 'Europe/Stockholm', currency: 'SEK' },
  NO: { timezone: 'Europe/Oslo', currency: 'NOK' },
  DK: { timezone: 'Europe/Copenhagen', currency: 'DKK' },
  FI: { timezone: 'Europe/Helsinki', currency: 'EUR' },
  IS: { timezone: 'Atlantic/Reykjavik', currency: 'ISK' },
  EE: { timezone: 'Europe/Tallinn', currency: 'EUR' },
  LV: { timezone: 'Europe/Riga', currency: 'EUR' },
  LT: { timezone: 'Europe/Vilnius', currency: 'EUR' },
  DE: { timezone: 'Europe/Berlin', currency: 'EUR' },
  NL: { timezone: 'Europe/Amsterdam', currency: 'EUR' },
  BE: { timezone: 'Europe/Brussels', currency: 'EUR' },
  FR: { timezone: 'Europe/Paris', currency: 'EUR' },
  ES: { timezone: 'Europe/Madrid', currency: 'EUR' },
  IT: { timezone: 'Europe/Rome', currency: 'EUR' },
  AT: { timezone: 'Europe/Vienna', currency: 'EUR' },
  CH: { timezone: 'Europe/Zurich', currency: 'CHF' },
  PL: { timezone: 'Europe/Warsaw', currency: 'PLN' },
  IE: { timezone: 'Europe/Dublin', currency: 'EUR' },
  GB: { timezone: 'Europe/London', currency: 'GBP' },
  US: { timezone: 'America/New_York', currency: 'USD' },
};

export const CURRENCIES = ['SEK', 'NOK', 'DKK', 'EUR', 'ISK', 'CHF', 'PLN', 'GBP', 'USD'] as const;

export function countryName(code: string, locale: Locale): string {
  return new Intl.DisplayNames([intlLocale(locale)], { type: 'region' }).of(code) ?? code;
}

export function currencyName(code: string, locale: Locale): string {
  return new Intl.DisplayNames([intlLocale(locale)], { type: 'currency' }).of(code) ?? code;
}

export function sortedCountries(locale: Locale): { code: string; name: string }[] {
  return Object.keys(COUNTRIES)
    .map((code) => ({ code, name: countryName(code, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name, intlLocale(locale)));
}

export function timeZones(current: string): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return all.includes(current) ? all : [current, ...all];
}
