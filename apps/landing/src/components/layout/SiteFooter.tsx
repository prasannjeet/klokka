import { Mark } from '@/components/ui/Icon';
import type { Dictionary, Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import { apkUrl, appUrl, issuesUrl, licenseUrl, repoUrl } from '@/lib/links';
import { footerColumns, hrefFor, type FooterGroup, type PageId } from '@/lib/pages';
import { LocaleSwitch } from './LocaleSwitch';

type Link = { href: string; label: string };

/** `page` is the page being shown, so the language switch leads to the same page in the other language. */
export function SiteFooter({ t, locale, page }: { t: Dictionary; locale: Locale; page: PageId }) {
  const f = t.footer;
  const home = (hash: string) => hrefFor('home', locale, hash);
  // The registry's pages per footer group, named by their breadcrumb.
  const registered = footerColumns(locale);
  const pagesIn = (group: FooterGroup): Link[] =>
    (registered.find((c) => c.group === group)?.links ?? []).map((link) => ({
      href: link.href,
      label: pageCopy(link.id, locale).breadcrumb,
    }));

  const columns: { title: string; links: Link[] }[] = [
    {
      title: f.groups.product,
      links: [
        ...pagesIn('product'),
        { href: home('#how'), label: f.links.how },
        { href: home('#employers'), label: f.links.employers },
        { href: home('#employees'), label: f.links.employees },
        { href: home('#insights'), label: f.links.insights },
        { href: home('#pay'), label: f.links.pay },
        { href: apkUrl, label: f.links.android },
      ],
    },
    ...(['tools', 'guides', 'industries'] as const)
      .map((group) => ({ title: f.groups[group], links: pagesIn(group) }))
      .filter((column) => column.links.length > 0),
    {
      title: f.openSource,
      links: [
        { href: repoUrl, label: f.links.github },
        { href: licenseUrl, label: f.links.license },
        { href: issuesUrl, label: f.links.issues },
      ],
    },
    {
      title: f.groups.klokka,
      links: [
        ...pagesIn('klokka'),
        { href: home('#faq'), label: f.links.faq },
        { href: appUrl, label: f.links.login },
        { href: appUrl, label: f.links.create },
      ],
    },
  ];

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <a className="wordmark" href={hrefFor('home', locale)} aria-label={t.a11y.home}>
              <Mark className="mark" />
              klokka
            </a>
            <p className="small muted mt-3 max-w-[34ch]">{f.blurb}</p>
          </div>
          <div className="foot-cols">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2>{col.title}</h2>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="foot-bar">
          <span>{f.copyright}</span>
          <LocaleSwitch locale={locale} page={page} label={t.a11y.language} />
        </div>
      </div>
      <div className="wrap foot-big" aria-hidden="true">
        <span className="reveal">klokka</span>
      </div>
    </footer>
  );
}
