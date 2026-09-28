import { formatNumber } from '@klokka/core/format';
import { FeatureList } from '@/components/ui/FeatureList';
import { Icon } from '@/components/ui/Icon';
import { WeekGrid } from '@/components/ui/WeekGrid';
import { cn } from '@/lib/cn';
import type { Dictionary, Locale } from '@/lib/i18n';
import { editing, employerRows } from '@/lib/sample';

export function Employers({ t, locale }: { t: Dictionary; locale: Locale }) {
  const e = t.employers;
  const popover = (
    <span className="wg-pop" aria-hidden="true">
      {editing.chips.map((c) => (
        <span key={c} className={cn(c === editing.selected && 'on')}>
          {formatNumber(c, locale)}
        </span>
      ))}
      <span className="same">{t.how.log.same}</span>
    </span>
  );

  return (
    <section className="section" id="employers" aria-labelledby="employers-title">
      <div className="wrap">
        <div className="feature">
          <div className="feature-copy reveal">
            <div>
              <p className="eyebrow">{e.eyebrow}</p>
              <h2 className="h2" id="employers-title">
                {e.title}
              </h2>
            </div>
            <p className="lead">{e.lead}</p>
            <FeatureList items={e.features} icons={['grid', 'zap', 'note', 'lock', 'flag', 'history']} />
          </div>
          <div className="feature-visual wg reveal">
            <div className="card wg-card" role="figure" aria-label={e.grid.label}>
              <div className="wg-head">
                <div className="stage-title">
                  {e.grid.title}
                  <small>{e.grid.subtitle}</small>
                </div>
                <div className="wg-tabs" aria-hidden="true">
                  <span className="on">{e.grid.tabs[0]}</span>
                  <span>{e.grid.tabs[1]}</span>
                </div>
              </div>
              <WeekGrid
                locale={locale}
                label={e.grid.gridLabel}
                days={t.stage.days}
                off={t.stage.off}
                rows={employerRows}
                edit={{ row: editing.row, day: editing.day, popover }}
              />
              <div className="wg-foot" aria-hidden="true">
                <span className="btnm">
                  <Icon name="lock" />
                  {e.grid.close}
                </span>
                <span className="btnm ghost">
                  <Icon name="download" />
                  {e.grid.export}
                </span>
                <span className="flag">
                  <Icon name="flag" />
                  {e.grid.flag}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
