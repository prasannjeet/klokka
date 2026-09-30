import type { Viewport } from 'next';
import { color } from '@klokka/tokens';
import '../globals.css';
import { IconSprite } from '@/components/ui/IconSprite';
import { fontVariables } from '@/lib/fonts';
import { getDictionary, htmlLang, locales, resolveLocale } from '@/lib/i18n';

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: color.light.bg },
    { media: '(prefers-color-scheme: dark)', color: color.dark.bg },
  ],
};

/**
 * Runs before first paint: marks the page as scripted (the reveal fallback hides content only then) and
 * applies a stored light/dark choice. No stored choice means the page follows the device.
 */
const HEAD_SCRIPT = `(function(){var d=document.documentElement;d.setAttribute('data-js','');try{var m=localStorage.getItem('klokka-mode');if(m==='light'||m==='dark')d.setAttribute('data-mode',m)}catch(e){}})();`;

export default async function RootLayout({ children, params }: Props) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const t = getDictionary(locale);

  return (
    // The head script sets data-js / data-mode on <html> before React hydrates.
    <html lang={htmlLang[locale]} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body>
        <a className="skip" href="#main">
          {t.a11y.skip}
        </a>
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
