import { htmlLang, localeHref, locales, type Locale } from '@/lib/i18n';

/**
 * Real links rather than client state: each language has its own URL and both are indexable. Plain <a>
 * (a full load), so <html lang>, the metadata and the head script always match the page.
 */
export function LocaleSwitch({ locale, label }: { locale: Locale; label: string }) {
  return (
    <div className="lang" role="group" aria-label={label}>
      {locales.map((l) => (
        <a
          key={l}
          href={localeHref(l)}
          hrefLang={htmlLang[l]}
          lang={htmlLang[l]}
          aria-current={l === locale ? 'true' : undefined}
        >
          {l.toUpperCase()}
        </a>
      ))}
    </div>
  );
}
