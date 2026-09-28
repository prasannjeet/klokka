import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Unbounded } from 'next/font/google';
import type { ReactNode } from 'react';
import { requestLocale, requestMode } from '@/lib/server-prefs';
import { Providers } from './providers';
import './globals.css';

// Nightshift type (docs/DECISIONS.md D11): Unbounded for display, Inter for body, JetBrains Mono for ids.
const unbounded = Unbounded({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-unbounded',
  display: 'swap',
});
const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'Klokka',
  applicationName: 'Klokka',
  robots: { index: false, follow: false },
};

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
      className={`${unbounded.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
