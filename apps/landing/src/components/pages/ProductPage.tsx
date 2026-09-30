import { RichText } from '@/components/RichText';
import { Icon } from '@/components/ui/Icon';
import { RepoCard } from '@/components/ui/RepoCard';
import { WeekGrid } from '@/components/ui/WeekGrid';
import { getDictionary, type Dictionary, type Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import { apkUrl } from '@/lib/links';
import type { PageId } from '@/lib/pages';
import { employerRows } from '@/lib/sample';
import { Breadcrumbs } from './Breadcrumbs';
import { CtaBand } from './CtaBand';
import { FaqList } from './FaqList';
import { PageShell } from './PageShell';

type Visual = 'week' | 'repo';

/** The homepage visual a product page shows under its lede; a page without one is text only. */
const visuals: Partial<Record<PageId, Visual>> = {
  app: 'week',
  'small-business': 'week',
  'open-source': 'repo',
};

/** The employer's week grid from the homepage, labelled as an example with made-up numbers. */
function WeekVisual({ t, locale }: { t: Dictionary; locale: Locale }) {
  const g = t.employers.grid;
  return (
    <figure className="page-visual wg" aria-label={g.label}>
      <div className="card wg-card">
        <div className="wg-head">
          <div className="stage-title">
            {g.title}
            <small>{g.subtitle}</small>
          </div>
        </div>
        <WeekGrid
          locale={locale}
          label={g.gridLabel}
          days={t.stage.days}
          off={t.stage.off}
          rows={employerRows}
        />
      </div>
      <figcaption className="illustrative">
        <Icon name="info" />
        {t.insights.illustrative}
      </figcaption>
    </figure>
  );
}

/**
 * The product pages (app, small business, open source): breadcrumbs, H1 and lede, one homepage visual, sections,
 * FAQ, and the CTA band with sign-up plus the Android download.
 */
export function ProductPage({ id, locale }: { id: PageId; locale: Locale }) {
  const copy = pageCopy(id, locale);
  const t = getDictionary(locale);
  const visual = visuals[id];
  return (
    <PageShell id={id} locale={locale}>
      <article className="section pt-6">
        <div className="wrap">
          <div className="prose">
            <Breadcrumbs id={id} locale={locale} />
            <h1 className="h1">{copy.h1}</h1>
            {copy.lede.map((text) => (
              <p key={text} className="lead">
                <RichText text={text} locale={locale} />
              </p>
            ))}
          </div>
          {visual === 'week' && <WeekVisual t={t} locale={locale} />}
          {visual === 'repo' && (
            <div className="page-visual">
              <RepoCard t={t} />
            </div>
          )}
          <div className="prose">
            {copy.sections.map((section) => (
              <section key={section.h2}>
                <h2 className="h3">{section.h2}</h2>
                {section.body.map((text) => (
                  <p key={text}>
                    <RichText text={text} locale={locale} />
                  </p>
                ))}
                {section.list && (
                  <ul>
                    {section.list.map((text) => (
                      <li key={text}>
                        <RichText text={text} locale={locale} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </article>
      {copy.faq.length > 0 && <FaqList title={t.faq.eyebrow} items={copy.faq} locale={locale} />}
      <CtaBand cta={copy.cta} locale={locale}>
        <a className="btn btn-ghost" href={apkUrl} type="application/vnd.android.package-archive">
          <Icon name="android" />
          {t.apk.cta}
        </a>
      </CtaBand>
    </PageShell>
  );
}
