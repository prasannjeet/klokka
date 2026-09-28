'use client';

import { useT } from '@/lib/i18n';
import { Icon } from '@/components/icons';

export default function SignedInError({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return (
    <main className="content" id="main">
      <div className="card empty-state" role="alert">
        <Icon name="alert" />
        <b>{t('web.errorPage.title')}</b>
        <p>{t('errors.INTERNAL')}</p>
        <button type="button" className="btn btn-secondary" onClick={() => reset()}>
          {t('common.retry')}
        </button>
      </div>
    </main>
  );
}
