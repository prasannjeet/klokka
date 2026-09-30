import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteNav } from '@/components/layout/SiteNav';
import { InViewObserver } from '@/components/ui/InViewObserver';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { PageId } from '@/lib/pages';
import { JsonLd } from './JsonLd';

/** The frame of every page but the homepage: nav, the page's own content in <main>, footer and JSON-LD. */
export function PageShell({
  id,
  locale,
  children,
}: {
  id: PageId;
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = getDictionary(locale);
  return (
    <>
      <header>
        <SiteNav t={t} locale={locale} page={id} />
      </header>
      <main id="main">{children}</main>
      <SiteFooter t={t} locale={locale} page={id} />
      <InViewObserver />
      <JsonLd id={id} locale={locale} />
    </>
  );
}
