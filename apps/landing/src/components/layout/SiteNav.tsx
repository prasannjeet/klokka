import { Mark } from '@/components/ui/Icon';
import { htmlLang, otherLocale, type Dictionary, type Locale } from '@/lib/i18n';
import { appUrl } from '@/lib/links';
import { hrefFor, type PageId } from '@/lib/pages';
import { LocaleSwitch } from './LocaleSwitch';
import { MobileMenu } from './MobileMenu';
import { ThemeToggle } from './ThemeToggle';

/** `page` is the page being shown: the language button leads to the same page in the other language. */
export function SiteNav({ t, locale, page }: { t: Dictionary; locale: Locale; page: PageId }) {
  const other = otherLocale(locale);
  // Homepage sections, as full links so they also work from every other page.
  const home = (hash: string) => hrefFor('home', locale, hash);
  const items = [
    { href: home('#how'), label: t.nav.how },
    { href: home('#employers'), label: t.nav.employers },
    { href: home('#employees'), label: t.nav.employees },
    { href: home('#insights'), label: t.nav.insights },
    { href: home('#open-source'), label: t.nav.openSource },
    { href: home('#faq'), label: t.nav.faq },
  ];

  return (
    <div className="wrap">
      <nav className="nav" aria-label={t.a11y.mainNav}>
        <a className="wordmark" href={hrefFor('home', locale)} aria-label={t.a11y.home}>
          <Mark className="mark" />
          klokka
        </a>
        <ul className="nav-links">
          {items.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
        <div className="nav-right">
          <a
            className="icon-btn"
            href={hrefFor(page, other)}
            hrefLang={htmlLang[other]}
            lang={htmlLang[other]}
            aria-label={t.a11y.switchLanguage}
            title={t.a11y.switchLanguage}
          >
            {other.toUpperCase()}
          </a>
          <ThemeToggle label={t.a11y.theme} />
          <a className="nav-login" href={appUrl}>
            {t.nav.login}
          </a>
          <a className="btn btn-secondary btn-sm nav-cta" href={appUrl}>
            {t.nav.createWorkspace}
          </a>
          <MobileMenu
            labels={{ open: t.a11y.openMenu, close: t.a11y.closeMenu, menu: t.a11y.menu }}
            items={items}
            actions={
              <>
                <a className="btn btn-primary" href={appUrl}>
                  {t.nav.createWorkspace}
                </a>
                <a className="btn btn-ghost" href={appUrl}>
                  {t.nav.login}
                </a>
              </>
            }
            foot={
              <>
                <LocaleSwitch locale={locale} page={page} label={t.a11y.language} />
                <ThemeToggle label={t.a11y.theme} />
              </>
            }
          />
        </div>
      </nav>
    </div>
  );
}
