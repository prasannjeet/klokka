import { RichText } from '@/components/RichText';
import { getDictionary, type Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import type { PageId } from '@/lib/pages';
import { Breadcrumbs } from './Breadcrumbs';
import { CtaBand } from './CtaBand';
import { FaqList } from './FaqList';
import { PageShell } from './PageShell';

type GuideId = Extract<PageId, `guide-${string}`>;

export function isGuideId(id: PageId): id is GuideId {
  return id.startsWith('guide-');
}

/** Dates written out as each language writes them: "30 september 2026" / "30 September 2026". */
const dateLocale: Record<Locale, string> = { sv: 'sv-SE', en: 'en-GB' };

/** An anchor id from a heading: "Vad är en tidrapport?" is "vad-ar-en-tidrapport". */
export function headingId(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * A guide: breadcrumbs, H1, the reviewed date and disclaimer, lede, a table of contents from the H2s, the sections
 * (the "About Klokka" box after the first, so the opening answers the question before any product mention), FAQ,
 * the sources and the CTA band. The Article JSON-LD comes from jsonLdForPage.
 */
export function GuidePage({ id, locale }: { id: GuideId; locale: Locale }) {
  const copy = pageCopy(id, locale);
  const g = getDictionary(locale).guide;
  const [beforeDate, afterDate] = g.reviewed.replace('{author}', copy.author).split('{date}');
  const reviewed = new Intl.DateTimeFormat(dateLocale[locale], { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${copy.reviewed}T00:00:00Z`),
  );
  const sections = copy.sections.map((section) => ({ ...section, id: headingId(section.h2) }));

  return (
    <PageShell id={id} locale={locale}>
      <article className="section pt-6">
        <div className="wrap">
          <div className="prose">
            <Breadcrumbs id={id} locale={locale} />
            <h1 className="h1">{copy.h1}</h1>
            <p className="guide-meta">
              {beforeDate}
              <time dateTime={copy.reviewed}>{reviewed}</time>
              {afterDate} {g.disclaimer}
            </p>
            {copy.lede.map((text) => (
              <p key={text} className="lead">
                <RichText text={text} locale={locale} />
              </p>
            ))}
            <nav className="toc" aria-labelledby="toc-title">
              <p className="eyebrow" id="toc-title">
                {g.toc}
              </p>
              <ol>
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.h2}</a>
                  </li>
                ))}
              </ol>
            </nav>
            {sections.map((section, i) => (
              <section key={section.id} aria-labelledby={section.id}>
                <h2 className="h3" id={section.id}>
                  {section.h2}
                </h2>
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
                {i === 0 && (
                  <aside className="card note-box" aria-labelledby="about-klokka">
                    <p className="eyebrow" id="about-klokka">
                      {g.aboutTitle}
                    </p>
                    <p>
                      <RichText text={g.aboutBody} locale={locale} />
                    </p>
                  </aside>
                )}
              </section>
            ))}
          </div>
        </div>
      </article>
      {copy.faq.length > 0 && (
        <FaqList title={getDictionary(locale).faq.eyebrow} items={copy.faq} locale={locale} />
      )}
      <section className="section pt-0" aria-labelledby="sources-title">
        <div className="wrap">
          <div className="prose sources">
            <h2 className="h3" id="sources-title">
              {g.sources}
            </h2>
            <ol>
              {copy.sources.map((source) => (
                <li key={source.url}>
                  <a className="inline-link" href={source.url} rel="noopener">
                    {source.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      <CtaBand cta={copy.cta} locale={locale} />
    </PageShell>
  );
}
