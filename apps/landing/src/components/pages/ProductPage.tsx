import { RichText } from '@/components/RichText';
import { Icon } from '@/components/ui/Icon';
import { RepoCard } from '@/components/ui/RepoCard';
import { WeekGrid } from '@/components/ui/WeekGrid';
import type { ReactNode } from 'react';
import { getDictionary, type Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import { apkUrl } from '@/lib/links';
import type { PageId } from '@/lib/pages';
import { employerRows, type WeekRow } from '@/lib/sample';
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
  hourly: 'week',
};

type WeekCard = { label: string; title: string; subtitle: string; gridLabel: string; caption: string };

/** A week grid drawn as UI, labelled as an example with made-up numbers. */
export function WeekVisual({
  card,
  rows,
  locale,
}: {
  card: WeekCard;
  rows: readonly WeekRow[];
  locale: Locale;
}) {
  const t = getDictionary(locale);
  return (
    <figure className="page-visual wg" aria-label={card.label}>
      <div className="card wg-card">
        <div className="wg-head">
          <div className="stage-title">
            {card.title}
            <small>{card.subtitle}</small>
          </div>
        </div>
        <WeekGrid locale={locale} label={card.gridLabel} days={t.stage.days} off={t.stage.off} rows={rows} />
      </div>
      <figcaption className="illustrative">
        <Icon name="info" />
        {card.caption}
      </figcaption>
    </figure>
  );
}

/** The product pages (app, small business, hourly staff, open source), each with its homepage visual. */
export function ProductPage({ id, locale }: { id: PageId; locale: Locale }) {
  const t = getDictionary(locale);
  const visual = visuals[id];
  const g = t.employers.grid;
  return (
    <ProductLayout
      id={id}
      locale={locale}
      visual={
        visual === 'week' ? (
          <WeekVisual card={{ ...g, caption: t.insights.illustrative }} rows={employerRows} locale={locale} />
        ) : visual === 'repo' ? (
          <div className="page-visual">
            <RepoCard t={t} />
          </div>
        ) : null
      }
    />
  );
}

/**
 * The product page shell, shared with the trade pages: breadcrumbs, H1 and lede, an optional notice and visual,
 * sections, FAQ, and the CTA band with sign-up plus the Android download.
 */
export function ProductLayout({
  id,
  locale,
  notice,
  visual,
}: {
  id: PageId;
  locale: Locale;
  notice?: ReactNode;
  visual?: ReactNode;
}) {
  const copy = pageCopy(id, locale);
  const t = getDictionary(locale);
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
            {notice}
          </div>
          {visual}
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
