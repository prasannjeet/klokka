import { htmlLang, locales, type Locale } from '@/lib/i18n';
import { hrefFor, type PageId } from '@/lib/pages';

/**
 * Real links rather than client state: each language has its own URL and both are indexable. Plain <a>
 * (a full load), so <html lang>, the metadata and the head script always match the page. Each language links
 * to the same page, not to its homepage.
 */
export function LocaleSwitch({ locale, page, label }: { locale: Locale; page: PageId; label: string }) {
  return (
    <div className="lang" role="group" aria-label={label}>
      {locales.map((l) => (
        <a
          key={l}
          href={hrefFor(page, l)}
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
