import Link from 'next/link';
import { translator } from '@klokka/core';
import { Icon } from '@/components/icons';
import { requestLocale } from '@/lib/server-prefs';

export default async function NotFound() {
  const t = translator(await requestLocale());
  return (
    <main className="content" id="main">
      <div className="card empty-state">
        <Icon name="search" />
        <b>{t('web.notFound.title')}</b>
        <p>{t('errors.NOT_FOUND')}</p>
        <Link className="btn btn-secondary" href="/">
          {t('nav.backToApp')}
        </Link>
      </div>
    </main>
  );
}
