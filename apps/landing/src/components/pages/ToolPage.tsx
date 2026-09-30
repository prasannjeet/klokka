import { RichText } from '@/components/RichText';
import { HoursCalculator } from '@/components/tools/HoursCalculator';
import { TemplateDownloads } from '@/components/tools/TemplateDownloads';
import { getDictionary, type Locale } from '@/lib/i18n';
import { pageCopy } from '@/lib/i18n/pages';
import * as calculator from '@/lib/i18n/pages/calculator';
import * as template from '@/lib/i18n/pages/template';
import { hrefFor, type PageId } from '@/lib/pages';
import { Breadcrumbs } from './Breadcrumbs';
import { CtaBand } from './CtaBand';
import { FaqList } from './FaqList';
import { PageShell } from './PageShell';

type ToolId = Extract<PageId, 'calculator' | 'template'>;

export function isToolId(id: PageId): id is ToolId {
  return id === 'calculator' || id === 'template';
}

/**
 * A free tool: breadcrumbs, H1 and lede, then the tool itself (the work-hours calculator or the template's
 * downloads), the sections that explain it, FAQ and the CTA band. The calculator's CTA also points at the template.
 */
export function ToolPage({ id, locale }: { id: ToolId; locale: Locale }) {
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
          </div>
          <div className="tool-slot">
            {id === 'calculator' ? (
              <HoursCalculator t={calculator[locale].tool} locale={locale} />
            ) : (
              <TemplateDownloads t={template[locale].tool} locale={locale} />
            )}
          </div>
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
      {copy.faq.length > 0 && (
        <FaqList title={getDictionary(locale).faq.eyebrow} items={copy.faq} locale={locale} />
      )}
      <CtaBand cta={copy.cta} locale={locale}>
        {id === 'calculator' && (
          <a className="btn btn-ghost" href={hrefFor('template', locale)}>
            {calculator[locale].tool.templateButton}
          </a>
        )}
      </CtaBand>
    </PageShell>
  );
}
