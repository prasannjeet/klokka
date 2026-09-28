import { Mark } from '@/components/ui/Icon';
import type { Dictionary, Locale } from '@/lib/i18n';
import { apkUrl, appUrl, issuesUrl, licenseUrl, repoUrl } from '@/lib/links';
import { LocaleSwitch } from './LocaleSwitch';

export function SiteFooter({ t, locale }: { t: Dictionary; locale: Locale }) {
  const f = t.footer;
  const columns = [
    {
      title: f.product,
      links: [
        { href: '#how', label: f.links.how },
        { href: '#employers', label: f.links.employers },
        { href: '#employees', label: f.links.employees },
        { href: '#insights', label: f.links.insights },
        { href: '#pay', label: f.links.pay },
        { href: apkUrl, label: f.links.android },
      ],
    },
    {
      title: f.openSource,
      links: [
        { href: repoUrl, label: f.links.github },
        { href: licenseUrl, label: f.links.license },
        { href: issuesUrl, label: f.links.issues },
      ],
    },
    {
      title: f.help,
      links: [
        { href: '#faq', label: f.links.faq },
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
            <a className="wordmark" href="#top" aria-label={t.a11y.home}>
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
          <LocaleSwitch locale={locale} label={t.a11y.language} />
        </div>
      </div>
      <div className="wrap foot-big" aria-hidden="true">
        <span className="reveal">klokka</span>
      </div>
    </footer>
  );
}
