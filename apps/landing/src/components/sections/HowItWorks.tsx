import { formatNumber } from '@klokka/core/format';
import { Mark } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { Dictionary, Locale } from '@/lib/i18n';
import { logChips } from '@/lib/sample';

export function HowItWorks({ t, locale }: { t: Dictionary; locale: Locale }) {
  const h = t.how;
  const [invite, log, notify] = h.steps;
  const vignettes = [
    <div key="invite" className="vig" aria-hidden="true">
      <div className="lbl">{h.invite.label}</div>
      <div className="row mt-2">
        <span className="av">N</span>
        <div>
          <b>{h.invite.title}</b>
          <div className="muted small">{h.invite.sub}</div>
        </div>
      </div>
      <div className="row mt-3">
        <span className="btnm start">{h.invite.action}</span>
        <span className="muted small">{h.invite.expires}</span>
      </div>
    </div>,
    <div key="log" className="vig" aria-hidden="true">
      <div className="row">
        <div>
          <b>{h.log.name}</b>
          <div className="muted small">{h.log.day}</div>
        </div>
        <span className="btnm">{h.log.save}</span>
      </div>
      <div className="chips">
        {logChips.chips.map((c) => (
          <span key={c} className={cn('chip', c === logChips.selected && 'on')}>
            {formatNumber(c, locale)}
          </span>
        ))}
        <span className="chip same">{h.log.same}</span>
      </div>
      <div className="row mt-2.5">
        <div className="line w-3/5" />
      </div>
    </div>,
    <div key="notify" className="vig" aria-hidden="true">
      <div className="notif">
        <div className="t-app brand">
          <Mark />
        </div>
        <div>
          <b>{h.notify.title}</b>
          <span>{h.notify.body}</span>
        </div>
      </div>
      <div className="row mt-2.5 justify-between">
        <span className="lbl">{h.notify.month}</span>
        <b className="num">{h.notify.total}</b>
      </div>
    </div>,
  ];

  return (
    <section className="section how on-color" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            <p className="eyebrow">{h.eyebrow}</p>
            <h2 className="h1" id="how-title">
              {h.title}
            </h2>
          </div>
          <p className="lead">{h.lead}</p>
        </div>
        <ol className="steps">
          {[invite, log, notify].map((step, i) =>
            step ? (
              <li key={step.title} className="step reveal">
                <div className="n" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                {vignettes[i]}
              </li>
            ) : null,
          )}
        </ol>
      </div>
    </section>
  );
}
