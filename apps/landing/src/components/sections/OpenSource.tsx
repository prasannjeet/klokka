import { RepoCard } from '@/components/ui/RepoCard';
import type { Dictionary } from '@/lib/i18n';

export function OpenSource({ t }: { t: Dictionary }) {
  const o = t.openSource;
  return (
    <section className="section" id="open-source" aria-labelledby="oss-title">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="eyebrow">{o.eyebrow}</p>
            <h2 className="h2" id="oss-title">
              {o.title}
            </h2>
          </div>
          <p className="lead">{o.lead}</p>
        </div>
        <div className="oss">
          <RepoCard t={t} className="reveal" />
          <div className="oss-side">
            {o.cards.map((card) => (
              <div key={card.title} className="card oss-item reveal">
                <b>{card.title}</b>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
