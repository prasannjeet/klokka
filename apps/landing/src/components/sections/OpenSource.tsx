import { Icon } from '@/components/ui/Icon';
import type { Dictionary } from '@/lib/i18n';
import { cloneCommand, repoHost, repoUrl } from '@/lib/links';

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
          <div className="card oss-big reveal">
            <div className="mit" role="img" aria-label={o.mitLabel}>
              MIT
            </div>
            <p className="lead max-w-[40ch]">{o.mitBody}</p>
            <code className="code" aria-label={o.cloneLabel}>
              {cloneCommand}
            </code>
            <a className="gh" href={repoUrl}>
              <Icon name="github" />
              {repoHost}
            </a>
          </div>
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
