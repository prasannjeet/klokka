import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalPage } from '@/components/pages/LegalPage';
import { isLocale } from '@/lib/i18n';
import { pageForSlug, staticSlugParams } from '@/lib/pages';
import { metadataForPage } from '@/lib/seo';

// Every page but the homepage, from the registry. Swedish paths reach this route through the rewrites in
// next.config.ts ('/om' is served as '/sv/om'); anything the registry does not list is a 404.
export const dynamicParams = false;

type Props = { params: Promise<{ lang: string; slug: string[] }> };

export function generateStaticParams({ params }: { params: { lang: string } }) {
  return staticSlugParams()
    .filter((p) => p.lang === params.lang)
    .map((p) => ({ slug: p.slug }));
}

async function resolve(params: Props['params']) {
  const { lang, slug } = await params;
  const page = isLocale(lang) ? pageForSlug(lang, slug) : undefined;
  if (!isLocale(lang) || !page) notFound();
  return { locale: lang, page };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, page } = await resolve(params);
  return metadataForPage(page.id, locale);
}

export default async function Page({ params }: Props) {
  const { locale, page } = await resolve(params);
  switch (page.kind) {
    case 'legal':
      return <LegalPage id={page.id} locale={locale} />;
    default:
      // A registered page without a layout must fail the build, never ship as a blank or a 404.
      throw new Error(`no layout for page "${page.id}" of kind "${page.kind}"`);
  }
}
