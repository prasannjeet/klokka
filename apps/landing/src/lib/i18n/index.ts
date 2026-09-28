import { en, sv, type Dictionary } from './dictionaries';
import type { Locale } from './config';

export { sv, en, type Dictionary } from './dictionaries';
export * from './config';

const dictionaries: Record<Locale, Dictionary> = { sv, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
