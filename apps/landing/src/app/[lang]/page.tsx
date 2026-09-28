import { notFound } from 'next/navigation';
import { LandingPage } from '@/components/LandingPage';
import { isLocale } from '@/lib/i18n';

export const dynamicParams = false;

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <LandingPage locale={lang} />;
}
