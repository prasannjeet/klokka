import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Unbounded } from 'next/font/google';
import type { ReactNode } from 'react';
import { translator } from '@klokka/core';
import { requestLocale, requestMode, requestPreviewLocale } from '@/lib/server-prefs';
import { Providers } from './providers';
import './globals.css';

// Nightshift type (docs/DECISIONS.md D11): Inter for headings and body in the product (data-surface="app",
// CHQ-162), Unbounded only for the wordmark, JetBrains Mono for ids.
const unbounded = Unbounded({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-unbounded',
  display: 'swap',
});
const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

// The marketing site serves the share images (1200x630); inlined at build time, like the landing's own URLs.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://klokka.coolify.ooguy.com').replace(/\/+$/, '');

// Never indexed (also X-Robots-Tag in next.config.ts), but a shared link, an invitation above all, still gets a
// proper preview in the viewer's language (Swedish for a preview bot that sends no language at all).
export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestPreviewLocale();
  const t = translator(locale);
  const description = t('web.meta.description');
  const image = {
    url: `${SITE_URL}/og/home-${locale}.jpg`,
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt: t('web.meta.ogAlt'),
  };
  return {
    title: 'Klokka',
    applicationName: 'Klokka',
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: 'Klokka',
      title: 'Klokka',
      description,
      locale: locale === 'sv' ? 'sv_SE' : 'en_US',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: 'Klokka', description, images: [image] },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, mode] = await Promise.all([requestLocale(), requestMode()]);
  return (
    <html
      lang={locale}
      data-mode={mode ?? undefined}
      data-surface="app"
      className={`${unbounded.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
