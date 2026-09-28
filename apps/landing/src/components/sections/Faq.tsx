import { Icon } from '@/components/ui/Icon';
import type { Dictionary } from '@/lib/i18n';

/** Native details/summary: keyboard and screen reader support for free, no script. */
export function Faq({ t }: { t: Dictionary }) {
  return (
    <section className="section pt-0" id="faq" aria-labelledby="faq-title">
      <div className="wrap">
        <div className="section-head reveal mb-8">
          <div>
            <p className="eyebrow">{t.faq.eyebrow}</p>
            <h2 className="h2" id="faq-title">
              {t.faq.title}
            </h2>
          </div>
        </div>
        <div className="faq reveal">
          {t.faq.items.map((item) => (
            <details key={item.q}>
              <summary>
                {item.q}
                <Icon name="plus" />
              </summary>
              <p className="a">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
