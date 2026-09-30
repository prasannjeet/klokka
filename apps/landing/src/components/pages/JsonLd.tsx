import type { Locale } from '@/lib/i18n';
import type { PageId } from '@/lib/pages';
import { jsonLdForPage } from '@/lib/seo';

/** The page's JSON-LD graph, with `<` escaped so no copy string can close the script element. */
export function JsonLd({ id, locale }: { id: PageId; locale: Locale }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdForPage(id, locale)).replace(/</g, '\\u003c') }}
    />
  );
}
