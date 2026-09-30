import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuidePage, isGuideId } from '@/components/pages/GuidePage';
import { IndustryPage, isIndustryId } from '@/components/pages/IndustryPage';
import { LegalPage } from '@/components/pages/LegalPage';
import { ProductPage } from '@/components/pages/ProductPage';
import { isTableId, TablePage } from '@/components/pages/TablePage';
import { isToolId, ToolPage } from '@/components/pages/ToolPage';
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
    case 'product':
      return <ProductPage id={page.id} locale={locale} />;
    case 'guide':
      if (!isGuideId(page.id)) throw new Error(`guide page "${page.id}" needs a guide- id for its copy type`);
      return <GuidePage id={page.id} locale={locale} />;
    case 'tool':
      if (!isToolId(page.id)) throw new Error(`tool page "${page.id}" has no tool component`);
      return <ToolPage id={page.id} locale={locale} />;
    case 'table':
      if (!isTableId(page.id)) throw new Error(`table page "${page.id}" has no table`);
      return <TablePage id={page.id} locale={locale} />;
    case 'industry':
      if (!isIndustryId(page.id))
        throw new Error(`industry page "${page.id}" needs a trade- id for its copy type`);
      return <IndustryPage id={page.id} locale={locale} />;
    default:
      // A registered page without a layout must fail the build, never ship as a blank or a 404.
      throw new Error(`no layout for page "${page.id}" of kind "${page.kind}"`);
  }
}
