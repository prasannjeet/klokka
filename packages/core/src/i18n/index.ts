// The typed string catalogue (docs/DECISIONS.md D2). `t(locale, key, params)` interpolates `{name}` placeholders
// and picks `_one` / `_other` for plural keys by `count === 1` (the rule is the same for sv and en, and Hermes
// has no Intl.PluralRules). Numbers are interpolated with String(); pass hours and money through
// `@klokka/core/format` first so "22,5 h" and "22.5 h" come out right per locale.
import {
  en,
  pluralKeys,
  sv,
  type CatalogueKey,
  type MessageKey,
  type MessageParams,
} from './catalogue.generated.ts';

export type { MessageKey, MessageParams };

export const LOCALES = ['sv', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'sv';

const catalogues: Record<Locale, Record<CatalogueKey, string>> = { sv, en };

export function isLocale(value: unknown): value is Locale {
  return value === 'sv' || value === 'en';
}

// Device or browser language code ("sv-SE", "en_US", "nb") to a supported locale: Swedish stays Swedish,
// everything else is English (docs/DECISIONS.md D16).
export function resolveLocale(languageCode: string | null | undefined): Locale {
  const code = (languageCode ?? '').trim().toLowerCase();
  return code === 'sv' || code.startsWith('sv-') || code.startsWith('sv_') ? 'sv' : 'en';
}

type Params<K extends MessageKey> = MessageParams[K];
type Args<K extends MessageKey> = keyof Params<K> extends never ? [] : [params: Params<K>];

function interpolate(template: string, params: Record<string, string | number> | undefined): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function t<K extends MessageKey>(locale: Locale, key: K, ...args: Args<K>): string {
  const params = args[0] as Record<string, string | number> | undefined;
  const catalogue = catalogues[locale];
  let lookup: string = key;
  if (pluralKeys.has(key)) {
    const count = params?.['count'];
    if (typeof count !== 'number') {
      throw new TypeError(`i18n: plural key "${key}" needs a numeric "count" param`);
    }
    lookup = `${key}_${count === 1 ? 'one' : 'other'}`;
  }
  const template = catalogue[lookup as CatalogueKey];
  if (template === undefined) throw new RangeError(`i18n: unknown key "${key}"`);
  return interpolate(template, params);
}

export type Translator = <K extends MessageKey>(key: K, ...args: Args<K>) => string;

// A locale-bound translator for a screen: `const t = translator(locale); t('nav.overview')`.
export function translator(locale: Locale): Translator {
  return (key, ...args) => t(locale, key, ...args);
}

// Every public key, for tooling and tests.
export function messageKeys(): MessageKey[] {
  const keys = new Set<string>();
  for (const k of Object.keys(sv)) keys.add(k.replace(/_(one|other)$/, ''));
  return [...keys] as MessageKey[];
}

export { sv, en };
