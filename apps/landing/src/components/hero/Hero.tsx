import { formatHours } from '@klokka/core/format';
import { Icon, Mark } from '@/components/ui/Icon';
import { WeekGrid } from '@/components/ui/WeekGrid';
import type { Dictionary, Locale } from '@/lib/i18n';
import { appUrl } from '@/lib/links';
import { rowTotal, stageFilledRow, stageRows, weekTotal } from '@/lib/sample';
import { HeadlineRotator } from './HeadlineRotator';
import { HeroClock } from './HeroClock';
import { StageLoop } from './StageLoop';

export function Hero({ t, locale }: { t: Dictionary; locale: Locale }) {
  const s = t.stage;
  const filled = stageRows[stageFilledRow];
  const filledTotal = filled ? rowTotal(filled) : 0;

  return (
    <div className="wrap hero-body">
      <p className="badge">
        <span className="dot" aria-hidden="true" />
        {t.hero.badge}
      </p>
      <div className="hero-top">
        <h1>
          <span className="line">{t.hero.line1}</span> <span className="line accent">{t.hero.line2}</span>
        </h1>
        <HeroClock label={t.hero.clockLabel} />
      </div>

      <div className="hero-row">
        <div className="hero-copy">
          <p className="hero-for">
            {t.hero.madeFor} <HeadlineRotator words={t.hero.words} />
          </p>
          <p className="lead">{t.hero.lead}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={appUrl}>
              {t.hero.primaryCta}
              <Icon name="arrow" />
            </a>
            <a className="btn btn-ghost" href="#how">
              {t.hero.secondaryCta}
            </a>
          </div>
          <p className="hero-note">{t.hero.note}</p>
          <ul className="trust">
            {t.hero.trust.map((line) => (
              <li key={line}>
                <Icon name="check" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <StageLoop label={s.label}>
          <div className="phone-mini" aria-hidden="true">
            <div className="pm-label">{s.phoneLabel}</div>
            <div className="pm-val">
              {formatHours(filledTotal, locale, { unit: false })}
              <small> h</small>
            </div>
            <div className="pm-sub">{s.phoneDelta}</div>
          </div>
          <div className="card stage-card">
            <div className="stage-head">
              <div className="stage-title">
                {s.title}
                <small>{s.subtitle}</small>
              </div>
              <span className="pill">
                <span className="dot" aria-hidden="true" />
                {s.pill}
              </span>
            </div>
            <WeekGrid
              locale={locale}
              label={s.gridLabel}
              days={s.days}
              off={s.off}
              rows={stageRows}
              fillRow={stageFilledRow}
            />
            <div className="stage-foot">
              <span>{s.weekTotal}</span>
              <b>{formatHours(weekTotal(stageRows), locale)}</b>
            </div>
          </div>
          <div className="toast" aria-hidden="true">
            <div className="t-app brand">
              <Mark />
            </div>
            <div>
              <div className="t-title">
                {s.toastApp} <span>{s.toastWhen}</span>
              </div>
              <div className="t-body">{s.toastBody}</div>
            </div>
          </div>
        </StageLoop>
      </div>
    </div>
  );
}
