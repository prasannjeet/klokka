'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { Mark } from './icons';

// The coloured left panel of the sign-in, join and create-workspace pages (mockup login.html).
export function BrandPanel({ top, children }: { top?: ReactNode; children: ReactNode }) {
  const t = useT();
  return (
    <aside className="brand">
      <Link className="wordmark rise" href="/" aria-label={t('nav.klokkaHome')}>
        <Mark />
        klokka
      </Link>
      {top}
      <div className="brand-body">{children}</div>
      <p className="brand-foot">{t('auth.freeAndOpenSource')}</p>
    </aside>
  );
}
