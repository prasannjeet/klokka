import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LandingPage } from '@/components/LandingPage';
import { JsonLd } from '@/components/pages/JsonLd';
import { isLocale, resolveLocale } from '@/lib/i18n';
import { metadataForPage } from '@/lib/seo';

export const dynamicParams = false;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return metadataForPage('home', resolveLocale(lang));
}

export default async function Page({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <>
      <LandingPage locale={lang} />
      <JsonLd id="home" locale={lang} />
    </>
  );
}
