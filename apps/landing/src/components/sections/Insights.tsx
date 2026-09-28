import type { CSSProperties } from 'react';
import { formatHours, formatMoney, formatNumber } from '@klokka/core/format';
import { CountUp } from '@/components/ui/CountUp';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { Dictionary, Locale } from '@/lib/i18n';
import { currency, insights } from '@/lib/sample';

function vars(values: Record<string, string>): CSSProperties {
  return values as CSSProperties;
}

export function Insights({ t, locale }: { t: Dictionary; locale: Locale }) {
  const s = t.insights;
  const top = Math.max(...insights.perEmployee.map((e) => e.hours));

  return (
    <section className="section" id="insights" aria-labelledby="insights-title">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="eyebrow">{s.eyebrow}</p>
            <h2 className="h2" id="insights-title">
              {s.title}
            </h2>
          </div>
          <p className="lead">{s.lead}</p>
        </div>
        <div className="tiles" data-animate>
          <div className="card tile span2 reveal">
            <div className="lbl">{s.hours}</div>
            <svg className="spark" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
              <path className="area" d={insights.sparkArea} />
              <path d={insights.spark} />
              <circle cx="200" cy="10" r="4" />
            </svg>
            <div className="val">
              <CountUp value={insights.hoursThisMonth} locale={locale} />
              <small> h</small>
            </div>
            <span className="delta">
              <Icon name="up" />
              {s.hoursDelta}
            </span>
          </div>
          <div className="card tile reveal">
            <div className="lbl">{s.busiest}</div>
            <div className="val">{s.busiestValue}</div>
            <span className="delta plain">{s.busiestSub}</span>
          </div>
          <div className="card tile reveal">
            <div className="lbl">{s.projected}</div>
            <div className="val">
              <CountUp value={insights.projected} locale={locale} />
              <small> h</small>
            </div>
            <span className="delta plain">{s.projectedSub}</span>
          </div>
          <div className="card tile span2 reveal">
            <div className="lbl">{s.perEmployee}</div>
            <ul className="bars">
              {insights.perEmployee.map((e) => (
                <li key={e.name} className="bar">
                  <span>{e.name}</span>
                  <span className="track" aria-hidden="true">
                    <span
                      className="fill"
                      style={vars({ '--w': `${(e.hours / top) * 100}%`, '--c': `var(--chart-${e.chart})` })}
                    />
                  </span>
                  <span className="v">{formatHours(e.hours, locale)}</span>
                </li>
              ))}
            </ul>
            <div className="legend" aria-hidden="true">
              {insights.perEmployee.map((e) => (
                <span key={e.name}>
                  <i style={vars({ '--c': `var(--chart-${e.chart})` })} />
                  {e.name}
                </span>
              ))}
            </div>
          </div>
          <div className="card tile reveal">
            <div className="lbl">{s.weekday}</div>
            <div className="cols" role="img" aria-label={s.weekdayLabel}>
              {insights.weekdayShare.map((share, i) => (
                <div key={i} className={cn('c', i === insights.weekdayTop && 'top')}>
                  <i style={vars({ '--h': `${share}%` })} />
                  <span>{s.weekdayLetters[i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card tile reveal">
            <div className="lbl">{s.empty}</div>
            <div className="val">{formatNumber(insights.empty, locale)}</div>
            <span className="delta warn">
              <Icon name="info" />
              {s.emptySub}
            </span>
          </div>
          <div className="card tile cost span2">
            <div className="lbl">{s.cost}</div>
            <div className="val">{formatMoney(insights.labourCost, currency, locale)}</div>
            <span className="delta plain">{s.costSub}</span>
          </div>
        </div>
        <p className="illustrative">
          <Icon name="info" />
          {s.illustrative}
        </p>
      </div>
    </section>
  );
}
