'use client';

// Operator: health of the API and what it depends on (Postgres, Logto, Expo push, SMTP), plus the recent
// deploys. Refreshed every minute.
import type { HealthStatus } from '@klokka/api-client';
import { formatNumber } from '@klokka/core';
import { formatDayTime, formatWhen } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { Icon } from '../icons';
import { ViewHeader } from '../view-header';
import { useOperatorHealth } from './queries';
import { useBrowserTimeZone } from './use-time-zone';

const PILL: Record<HealthStatus, string> = { UP: 'pill ok', DEGRADED: 'pill warn', DOWN: 'pill bad' };

function StatusPill({ status }: { status: HealthStatus }) {
  const t = useT();
  return (
    <span className={PILL[status]}>
      <span className="dot" />
      {t(`web.operator.health.${status}`)}
    </span>
  );
}

export function OperatorHealthView() {
  const t = useT();
  const locale = useLocale();
  const timeZone = useBrowserTimeZone();
  const query = useOperatorHealth();
  const h = query.data;
  const words = { today: t('common.today'), yesterday: t('common.yesterday') };

  function uptime(seconds: number): string {
    const days = Math.floor(seconds / 86_400);
    const hours = Math.floor((seconds % 86_400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return days > 0
      ? t('web.operator.health.uptimeDays', { days: formatNumber(days, locale), hours })
      : t('web.operator.health.uptimeHours', { hours, minutes });
  }

  const overall =
    h?.status === 'UP'
      ? t('operator.health.allNormal')
      : h?.status === 'DEGRADED'
        ? t('operator.health.degraded')
        : t('web.operator.health.down');

  return (
    <section className="view" aria-labelledby="h-ops-health">
      <ViewHeader
        id="h-ops-health"
        title={t('operator.health.title')}
        sub={t('operator.health.subtitle')}
        actions={
          h ? (
            <span className={`${PILL[h.status]} live`} role="status">
              <span className="dot" />
              {overall}
            </span>
          ) : null
        }
      />
      {h ? (
        <>
          <div
            className="hgrid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))' }}
          >
            <div className="svc">
              <div className="top">
                <b>{t('web.operator.health.api')}</b>
                <StatusPill status={h.status} />
              </div>
              <span className="lbl">{t('web.operator.health.uptime')}</span>
              <div className="big">{uptime(h.uptimeSeconds)}</div>
              <dl>
                <dt>{t('web.operator.health.version')}</dt>
                <dd className="mono">{h.version}</dd>
                <dt>{t('web.operator.health.checked')}</dt>
                <dd>{formatWhen(h.checkedAt, new Date(), locale, timeZone, words)}</dd>
              </dl>
            </div>
            {h.dependencies.map((d) => (
              <div className="svc" key={d.name}>
                <div className="top">
                  <b>{d.name}</b>
                  <StatusPill status={d.status} />
                </div>
                <div className="big">
                  {d.latencyMs != null
                    ? t('web.operator.health.ms', { value: formatNumber(d.latencyMs, locale) })
                    : t('web.operator.none')}
                </div>
                {d.detail ? <p className="small muted">{d.detail}</p> : null}
              </div>
            ))}
          </div>
          <div className="health-grid">
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-head pad" style={{ margin: 0, paddingBottom: 10 }}>
                <h2>{t('operator.health.dependencies')}</h2>
                <span className="sub">{t('operator.health.dependenciesHint')}</span>
              </div>
              <div className="tbl-wrap" style={{ border: 0, borderRadius: 0, boxShadow: 'none' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th scope="col">{t('operator.health.service')}</th>
                      <th scope="col">{t('operator.health.status')}</th>
                      <th scope="col" className="num">
                        {t('operator.health.latency')}
                      </th>
                      <th scope="col">{t('operator.health.detail')}</th>
                      <th scope="col">{t('operator.health.lastChecked')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.dependencies.map((d) => (
                      <tr key={d.name}>
                        <td>
                          <b>{d.name}</b>
                        </td>
                        <td>
                          <StatusPill status={d.status} />
                        </td>
                        <td className="num">
                          {d.latencyMs != null
                            ? t('web.operator.health.ms', { value: formatNumber(d.latencyMs, locale) })
                            : ''}
                        </td>
                        <td>{d.detail ?? ''}</td>
                        <td>{formatWhen(d.checkedAt, new Date(), locale, timeZone, words)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-head pad" style={{ margin: 0, paddingBottom: 10 }}>
                <h2>{t('operator.health.recentDeploys')}</h2>
              </div>
              {h.recentDeploys.length > 0 ? (
                <div
                  className="hgrid deploys"
                  style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}
                >
                  {h.recentDeploys.map((d) => (
                    <div className="row" key={`${d.app}-${d.version}-${d.deployedAt.toISOString()}`}>
                      <Icon name="check" />
                      <div>
                        <b>{d.app}</b>
                        <span className="mono">{d.version}</span>
                      </div>
                      <time dateTime={d.deployedAt.toISOString()}>
                        {formatDayTime(d.deployedAt, locale, timeZone)}
                      </time>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pad muted">{t('web.operator.health.noDeploys')}</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="muted">{t('common.loading')}</p>
      )}
    </section>
  );
}
