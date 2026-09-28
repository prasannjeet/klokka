import { formatHours, formatMoney } from '@klokka/core/format';
import { PaySwitch } from '@/components/pay/PayScope';
import { cn } from '@/lib/cn';
import type { Dictionary, Locale } from '@/lib/i18n';
import { currency, rates, rowTotal, stageRows, weekTotal } from '@/lib/sample';

export function Pay({ t, locale }: { t: Dictionary; locale: Locale }) {
  const p = t.pay;
  const rows = stageRows.map((row) => {
    const hours = rowTotal(row);
    return { row, hours, money: hours * (rates[row.name] ?? 0) };
  });
  const totalMoney = rows.reduce((sum, r) => sum + r.money, 0);

  return (
    <section className="section pay on-color" id="pay" aria-labelledby="pay-title">
      <div className="wrap">
        <div className="feature">
          <div className="feature-copy reveal">
            <div>
              <p className="eyebrow">{p.eyebrow}</p>
              <h2 className="h1" id="pay-title">
                {p.title}
              </h2>
            </div>
            <p className="lead">{p.lead}</p>
            <PaySwitch label={p.switchLabel} />
            <div className="pay-state" aria-hidden="true">
              <div className="off">
                <b>{p.offTitle}</b>
                <p>{p.offBody}</p>
              </div>
              <div className="on">
                <b>{p.onTitle}</b>
                <p>{p.onBody}</p>
              </div>
            </div>
          </div>
          <div className="feature-visual reveal">
            <div className="card p-[clamp(16px,3vw,28px)]">
              <div className="stage-head">
                <div className="stage-title">
                  {p.cardTitle}
                  <small>{p.cardSubtitle}</small>
                </div>
                <span className="pill">{p.people}</span>
              </div>
              <ul className="pay-list">
                {rows.map(({ row, hours, money }) => (
                  <li key={row.name} className="pay-row">
                    <span className={cn('av', row.tone !== 'c1' && row.tone)} aria-hidden="true">
                      {row.name.charAt(0)}
                    </span>
                    <span>{row.name}</span>
                    <span className="h">
                      {formatHours(hours, locale)}
                      <span className="money">{formatMoney(money, currency, locale)}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pay-total">
                <span>{p.total}</span>
                <span className="big num">
                  <span>{formatHours(weekTotal(stageRows), locale)}</span>
                  <span className="money">{formatMoney(totalMoney, currency, locale)}</span>
                </span>
              </div>
              <p className="rate-note">{p.rateNote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
