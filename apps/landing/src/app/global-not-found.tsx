import type { Metadata, Viewport } from 'next';
import { color } from '@klokka/tokens';
import './globals.css';
import { Mark } from '@/components/ui/Icon';
import { IconSprite } from '@/components/ui/IconSprite';
import { fontVariables } from '@/lib/fonts';
import { en, htmlLang, localeHref, sv } from '@/lib/i18n';

// Any URL that matches no route (the root layout sits under [lang], so there is no single layout to render a
// 404 in; next.config.ts turns on experimental.globalNotFound). A 404 has no language of its own: both.

export const metadata: Metadata = {
  title: `${sv.notFound.title} ${en.notFound.title}`,
  robots: { index: false, follow: true },
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: color.light.bg },
    { media: '(prefers-color-scheme: dark)', color: color.dark.bg },
  ],
};

const HEAD_SCRIPT = `(function(){try{var m=localStorage.getItem('klokka-mode');if(m==='light'||m==='dark')document.documentElement.setAttribute('data-mode',m)}catch(e){}})();`;

export default function GlobalNotFound() {
  return (
    <html lang={htmlLang.sv} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body>
        <IconSprite />
        <main id="main" className="wrap flex min-h-dvh flex-col justify-center gap-8 py-24">
          <a className="wordmark self-start" href={localeHref('sv')} aria-label={sv.a11y.home}>
            <Mark className="mark" />
            klokka
          </a>
          <p className="eyebrow">404</p>
          <h1 className="h1">
            <span>{sv.notFound.title}</span>{' '}
            <span lang={htmlLang.en} className="block text-primary">
              {en.notFound.title}
            </span>
          </h1>
          <div className="flex flex-wrap gap-3">
            <a className="btn btn-primary" href={localeHref('sv')}>
              {sv.notFound.back}
            </a>
            <a className="btn btn-ghost" href={localeHref('en')} lang={htmlLang.en}>
              {en.notFound.back}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
