import { RichText } from '@/components/RichText';
import { Icon } from '@/components/ui/Icon';
import type { Locale } from '@/lib/i18n';
import type { PageCopyBase } from '@/lib/i18n/pages';

/** A page's questions, the homepage FAQ's native details/summary: keyboard and screen reader support, no script. */
export function FaqList({
  title,
  items,
  locale,
}: {
  title: string;
  items: PageCopyBase['faq'];
  locale: Locale;
}) {
  return (
    <section className="section pt-0" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <h2 className="h2 mb-8" id="faq-title">
          {title}
        </h2>
        <div className="faq">
          {items.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <Icon name="plus" />
              </summary>
              <p className="a">
                <RichText text={item.a} locale={locale} />
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
