import { RichText } from '@/components/RichText';
import type { Locale } from '@/lib/i18n';
import type { PageCopyBase } from '@/lib/i18n/pages';
import { appUrl } from '@/lib/links';

/** The closing call to action: the homepage's dark band, a button to sign-up and any secondary actions after it. */
export function CtaBand({
  cta,
  locale,
  children,
}: {
  cta: PageCopyBase['cta'];
  locale: Locale;
  children?: React.ReactNode;
}) {
  return (
    <section className="section pt-0" aria-labelledby="cta-title">
      <div className="wrap">
        <div className="cta-dark cta-page on-color">
          <h2 className="h2" id="cta-title">
            {cta.title}
          </h2>
          <p className="lead">
            <RichText text={cta.body} locale={locale} />
          </p>
          <div className="cta-actions">
            <a className="btn btn-primary" href={appUrl}>
              {cta.button}
            </a>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
