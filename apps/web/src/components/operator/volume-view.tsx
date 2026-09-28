'use client';

// Operator: notification and email volume. The SMTP account allows about 100 emails a month, so the meter
// against the quota leads; push and in-app volume, coalescing and the per-day chart follow. Counts only.
import { useState, type CSSProperties } from 'react';
import { Bar, BarChart, Tooltip, XAxis } from 'recharts';
import {
  addMonths,
  formatDate,
  formatMonth,
  formatMonthName,
  formatNumber,
  formatPercent,
} from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { isoOf, monthIn, todayIn } from '@/lib/time';
import { Icon } from '../icons';
import { MonthNav } from '../month-nav';
import { ViewHeader } from '../view-header';
import { useOperatorVolume } from './queries';
import { useBrowserTimeZone } from './use-time-zone';

const DAY_MS = 86_400_000;

function daysUntil(fromIso: string, toIso: string): number {
  return Math.max(
    0,
    Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS),
  );
}

interface DayPoint {
  day: string;
  label: string;
  push: number;
  inApp: number;
}

function DayTip({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) {
  const t = useT();
  const locale = useLocale();
  const point = payload?.[0]?.payload as DayPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="chart-tip">
      <div>{point.label}</div>
      <div>
        {t('web.operator.volume.push')}: <b>{formatNumber(point.push, locale)}</b>
      </div>
      <div>
        {t('operator.volume.inApp')}: <b>{formatNumber(point.inApp, locale)}</b>
      </div>
    </div>
  );
}

export function OperatorVolumeView() {
  const t = useT();
  const locale = useLocale();
  const timeZone = useBrowserTimeZone();
  const [month, setMonth] = useState<string | null>(null);
  const query = useOperatorVolume(month);
  const v = query.data;

  if (!v) {
    return (
      <section className="view" aria-labelledby="h-ops-vol">
        <ViewHeader id="h-ops-vol" title={t('operator.volume.title')} sub={t('common.loading')} />
      </section>
    );
  }

  const quota = Math.max(1, v.email.quota);
  const share = (n: number) => `${Math.min(100, (n / quota) * 100).toFixed(1)}%`;
  const today = todayIn(timeZone);
  const resets = isoOf(v.email.resetsOn);
  const days: DayPoint[] = v.perDay.map((d) => {
    const iso = isoOf(d.date);
    return {
      day: String(Number(iso.slice(8, 10))),
      label: formatDate(iso, locale, 'weekdayDayMonth'),
      push: d.push,
      inApp: d.inApp,
    };
  });
  const first = v.perDay[0];
  const last = v.perDay[v.perDay.length - 1];

  return (
    <section className="view" aria-labelledby="h-ops-vol">
      <ViewHeader
        id="h-ops-vol"
        title={t('operator.volume.title')}
        sub={t('operator.volume.subtitle', {
          month: formatMonth(v.month, locale, { capitalize: true }),
          quota: formatNumber(v.email.quota, locale),
        })}
        actions={<MonthNav month={v.month} current={monthIn(timeZone)} onChange={setMonth} />}
      />
      <div className="vol-grid" style={{ marginTop: 0 }}>
        <div className="card meter" role="region" aria-label={t('operator.volume.emailsAgainstQuota')}>
          <span className="lbl">{t('operator.volume.emailsAgainstQuota')}</span>
          <div className="val">
            <span>{formatNumber(v.email.sent, locale)}</span>
            <small>{t('operator.volume.ofQuota', { quota: formatNumber(v.email.quota, locale) })}</small>
          </div>
          <div
            className="track"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={v.email.quota}
            aria-valuenow={v.email.sent}
            aria-label={t('operator.volume.emailsAgainstQuota')}
          >
            <i style={{ '--w': share(v.email.invitations), '--c': 'var(--chart-1)' } as CSSProperties} />
            <i style={{ '--w': share(v.email.verifications), '--c': 'var(--chart-2)' } as CSSProperties} />
            <i style={{ '--w': share(v.email.digests), '--c': 'var(--chart-3)' } as CSSProperties} />
          </div>
          <div className="legend">
            <span>
              <i style={{ '--c': 'var(--chart-1)' } as CSSProperties} />
              {t('operator.volume.invitations', { count: formatNumber(v.email.invitations, locale) })}
            </span>
            <span>
              <i style={{ '--c': 'var(--chart-2)' } as CSSProperties} />
              {t('operator.volume.verifications', { count: formatNumber(v.email.verifications, locale) })}
            </span>
            <span>
              <i style={{ '--c': 'var(--chart-3)' } as CSSProperties} />
              {t('operator.volume.digests', { count: formatNumber(v.email.digests, locale) })}
            </span>
          </div>
          <div className="foot">
            <span>
              {t('operator.volume.resets', {
                date: formatDate(resets, locale, 'dayMonth'),
                when: t('web.operator.volume.inDays', { count: daysUntil(today, resets) }),
              })}
            </span>
            <span>
              {t('operator.volume.samePointLastMonth', {
                month: formatMonthName(addMonths(v.month, -1), locale, false),
                count: formatNumber(v.email.sameMonthLastMonth, locale),
              })}
            </span>
            <span>
              {t('operator.volume.digestOptIns', {
                people: t('common.people', { count: v.email.digestOptIns }),
                mondays: formatNumber(v.email.digestMondays, locale),
              })}
            </span>
            <span>{t('operator.volume.bounced', { count: formatNumber(v.email.bounced, locale) })}</span>
          </div>
        </div>
        <div className="hgrid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="tile">
            <span className="lbl">{t('operator.volume.pushSent')}</span>
            <div className="val">{formatNumber(v.push.sent, locale)}</div>
            <span className="delta muted">
              {t('operator.volume.pushDelivery', {
                delivered: formatNumber(v.push.delivered, locale),
                failed: formatNumber(v.push.failed, locale),
                percent: formatPercent(v.push.failedPercent, locale),
              })}
            </span>
          </div>
          <div className="tile">
            <span className="lbl">{t('operator.volume.inApp')}</span>
            <div className="val">{formatNumber(v.inApp.created, locale)}</div>
            <span className="delta muted">
              {t('operator.volume.readWithinDay', {
                percent: formatPercent(v.inApp.readWithinDayPercent, locale),
              })}
            </span>
          </div>
          <div className="tile span2">
            <span className="lbl">{t('operator.volume.coalescing')}</span>
            <div className="val">
              {formatNumber(v.coalescing.sittings, locale)}
              <small> {t('operator.volume.sittings')}</small>
            </div>
            <span className="delta muted">
              {t('operator.volume.coalescingHint', {
                changes: formatNumber(v.coalescing.entryChanges, locale),
                notifications: formatNumber(v.coalescing.sittings, locale),
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="vol-grid">
        <div className="card pad">
          <div className="card-head">
            <h2>{t('operator.volume.perDay')}</h2>
            {first && last ? (
              <span className="sub">
                {t('operator.volume.perDayHint', {
                  from: formatDate(isoOf(first.date), locale, 'dayMonth'),
                  to: formatDate(isoOf(last.date), locale, 'dayMonth'),
                })}
              </span>
            ) : null}
          </div>
          {days.length > 0 ? (
            <>
              <div className="chart chart-wrap" aria-hidden="true">
                <BarChart
                  responsive
                  style={{ width: '100%', height: 180 }}
                  data={days}
                  margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
                >
                  <XAxis dataKey="day" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <Tooltip
                    content={(p) => <DayTip active={p.active} payload={p.payload} />}
                    cursor={{ fill: 'var(--surface-2)' }}
                  />
                  <Bar
                    dataKey="push"
                    stackId="n"
                    fill="var(--chart-1)"
                    maxBarSize={24}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="inApp"
                    stackId="n"
                    fill="var(--chart-2)"
                    maxBarSize={24}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </div>
              <div className="legend">
                <span>
                  <i style={{ '--c': 'var(--chart-1)' } as CSSProperties} />
                  {t('web.operator.volume.push')}
                </span>
                <span>
                  <i style={{ '--c': 'var(--chart-2)' } as CSSProperties} />
                  {t('operator.volume.inApp')}
                </span>
              </div>
              <table className="sr-only">
                <caption>{t('web.operator.volume.perDayLabel')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('web.operator.volume.day')}</th>
                    <th scope="col">{t('web.operator.volume.push')}</th>
                    <th scope="col">{t('operator.volume.inApp')}</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.label}>
                      <th scope="row">{d.label}</th>
                      <td>{d.push}</td>
                      <td>{d.inApp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="muted">{t('web.operator.volume.noDays')}</p>
          )}
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-head pad" style={{ margin: 0, paddingBottom: 10 }}>
            <h2>{t('operator.volume.byKind')}</h2>
          </div>
          <div
            className="hgrid kinds"
            style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}
          >
            <div className="row head">
              <span>{t('web.operator.volume.kind')}</span>
              <span className="n">{t('web.operator.volume.count')}</span>
            </div>
            {v.byKind.map((k) => (
              <div className="row" key={k.kind}>
                <span>{t(`web.operator.kind.${k.kind}`)}</span>
                <span className="n">{formatNumber(k.count, locale)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="illustrative">
        <Icon name="info" />
        {t('operator.aggregatesOnly')}
      </p>
    </section>
  );
}
