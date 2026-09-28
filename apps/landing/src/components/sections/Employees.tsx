import { ApkLink } from '@/components/ui/ApkLink';
import { FeatureList } from '@/components/ui/FeatureList';
import { Icon, Mark } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { Dictionary } from '@/lib/i18n';
import { calendar, calendarLeadingBlanks } from '@/lib/sample';

export function Employees({ t }: { t: Dictionary }) {
  const e = t.employees;
  const p = e.phone;

  return (
    <section className="section bg-surface" id="employees" aria-labelledby="employees-title">
      <div className="wrap">
        <div className="feature flip">
          <div className="feature-copy reveal">
            <div>
              <p className="eyebrow">{e.eyebrow}</p>
              <h2 className="h2" id="employees-title">
                {e.title}
              </h2>
            </div>
            <p className="lead">{e.lead}</p>
            <FeatureList items={e.features} icons={['calendar', 'bell', 'flag', 'share', 'users', 'moon']} />
            <ApkLink t={t} />
          </div>
          <div className="feature-visual phone-wrap reveal">
            <div className="phone" role="figure" aria-label={p.label}>
              <span className="notch" aria-hidden="true" />
              <div className="screen" aria-hidden="true">
                <div className="ph-top">
                  <div className="lbl">{p.month}</div>
                  <div className="big">
                    {p.total}
                    <small> h</small>
                  </div>
                  <span className="delta">
                    <Icon name="up" />
                    {p.delta}
                  </span>
                </div>
                <div className="cal">
                  <div className="dow">
                    {p.dow.map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>
                  <div className="days">
                    {Array.from({ length: calendarLeadingBlanks }, (_, i) => (
                      <span key={`pad-${i}`} className="d pad" />
                    ))}
                    {calendar.map((c) => (
                      <span
                        key={c.day}
                        className={cn(
                          'd',
                          c.kind !== 'none' && 'h',
                          c.kind === 'short' && 'lo',
                          c.flag && 'flag',
                        )}
                      >
                        {c.day}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ph-list">
                  <div className="n">
                    <div className="t-app brand">
                      <Mark />
                    </div>
                    <div>
                      <b>{p.notifTitle}</b>
                      <span>{p.notifBody}</span>
                    </div>
                  </div>
                  <div className="n">
                    <div className="t-app warn">
                      <Icon name="flag" />
                    </div>
                    <div>
                      <b>{p.flagTitle}</b>
                      <span>{p.flagBody}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
