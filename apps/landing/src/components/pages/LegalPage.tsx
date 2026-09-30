import { RichText } from '@/components/RichText';
import { getDictionary, type Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import type { PageId } from '@/lib/pages';
import { Breadcrumbs } from './Breadcrumbs';
import { CtaBand } from './CtaBand';
import { FaqList } from './FaqList';
import { PageShell } from './PageShell';

/** About, privacy and terms: a reading page. Breadcrumbs, H1, lede, sections, optional FAQ, CTA band. */
export function LegalPage({ id, locale }: { id: PageId; locale: Locale }) {
  const copy = pageCopy(id, locale);
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
      {copy.faq.length > 0 && (
        <FaqList title={getDictionary(locale).faq.eyebrow} items={copy.faq} locale={locale} />
      )}
      <CtaBand cta={copy.cta} locale={locale} />
    </PageShell>
  );
}
