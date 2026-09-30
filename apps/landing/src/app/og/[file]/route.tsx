import { pageCard } from '@/lib/brand-image';
import { isLocale, locales } from '@/lib/i18n';
import { pages } from '@/lib/pages';

export const dynamic = 'force-static';
export const dynamicParams = false;

/** /og/<id>-<locale>.jpg: every registered page's link card in both languages, drawn at build time. */
export function generateStaticParams(): { file: string }[] {
  return pages.flatMap((page) => locales.map((locale) => ({ file: `${page.id}-${locale}.jpg` })));
}

export async function GET(_request: Request, { params }: RouteContext<'/og/[file]'>) {
  const { file } = await params;
  const match = /^(.+)-([a-z]+)\.jpg$/.exec(file);
  const page = match ? pages.find((p) => p.id === match[1]) : undefined;
  const locale = match?.[2];
  if (!page || !isLocale(locale)) return new Response('Not found', { status: 404 });
  return pageCard(page.id, locale);
}
