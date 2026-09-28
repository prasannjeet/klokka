'use client';

import { LOCALES, type Locale } from '@klokka/core';
import { useLocale, useSetLocale, useT } from '@/lib/i18n';

const LABEL = { sv: 'settings.swedish', en: 'settings.english' } as const;

// Before sign-in there is no stored preference yet: the choice lives in the cookie until /me exists.
export function LanguageToggle({ onChange }: { onChange?: (locale: Locale) => void }) {
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();
  return (
    <div className="seg" role="group" aria-label={t('settings.language')}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => {
            setLocale(l);
            onChange?.(l);
          }}
        >
          {t(LABEL[l])}
        </button>
      ))}
    </div>
  );
}
