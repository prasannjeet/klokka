'use client';

// The shareable monthly card (CHQ-138, mockup web-employee.html "Your September, as a card"): drawn in the
// page with the workspace's colour and emoji, rendered to a 1200 x 630 PNG in the browser (html-to-image),
// then shared through the system share sheet where there is one, or saved. Hours and the workspace only,
// never pay.
import { useRef, useState, type CSSProperties } from 'react';
import { toBlob } from 'html-to-image';
import type { MemberInsights } from '@klokka/api-client';
import { formatHours, formatMonthName, type IsoMonth } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { colourVar } from '@/lib/visual';
import { useWorkspace } from '@/lib/workspace';
import { Icon, Mark } from './icons';
import { Switch } from './switch';
import { useToast } from './toast';

const WIDTH = 1200;
const HEIGHT = 630;

export function ShareCard({ month, insights }: { month: IsoMonth; insights: MemberInsights }) {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const toast = useToast();
  const card = useRef<HTMLDivElement>(null);
  const [extras, setExtras] = useState(true);
  const [busy, setBusy] = useState(false);
  const monthName = formatMonthName(month, locale, locale === 'en');
  const fileName = `klokka-${ws.slug}-${month}.png`;

  async function image(): Promise<Blob> {
    const node = card.current;
    if (!node) throw new Error('share card not mounted');
    // canvasWidth/Height scale the drawing to the card's fixed image size; pixelRatio 1 keeps it exact.
    const blob = await toBlob(node, {
      pixelRatio: 1,
      canvasWidth: WIDTH,
      canvasHeight: HEIGHT,
      cacheBust: true,
    });
    if (!blob) throw new Error('empty image');
    return blob;
  }

  function download(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function run(share: boolean) {
    setBusy(true);
    try {
      const blob = await image();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (share && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('share.myMonthAt', { month: monthName, workspace: ws.my.name }),
        });
        toast({ title: t('share.shared'), icon: 'share' });
      } else {
        download(blob);
        toast({ title: t('web.share.downloaded'), body: fileName, icon: 'download' });
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast({ title: t('web.share.failed'), tone: 'error' });
      }
    } finally {
      setBusy(false);
    }
  }

  const hours = formatHours(insights.totalHours, locale, { unit: false });
  return (
    <section className="card pad" id="share-card" aria-labelledby="h-share" style={{ marginTop: 16 }}>
      <div className="card-head">
        <h2 id="h-share">{t('share.cardTitle', { month: monthName })}</h2>
        <span className="sub">{t('share.cardSize')}</span>
      </div>
      <div className="share">
        <div
          ref={card}
          className="share-card"
          role="img"
          aria-label={t('share.cardLabelDays', {
            month: monthName,
            workspace: ws.my.name,
            hours,
            days: insights.daysWorked,
          })}
          style={{ '--ws-color': colourVar(ws.my.colour) } as CSSProperties}
        >
          <div className="sc-top" aria-hidden="true">
            <span>{ws.my.name}</span>
            <span className="wordmark">
              <Mark />
              klokka
            </span>
          </div>
          <span className="sc-em" aria-hidden="true">
            {ws.my.emoji}
          </span>
          <div className="sc-num" aria-hidden="true">
            {hours}
            <small> {t('common.hourUnit')}</small>
          </div>
          <div className="sc-title" aria-hidden="true">
            {t('share.yourMonth', { month: monthName })}
          </div>
          {extras ? (
            <div className="sc-foot" aria-hidden="true">
              <span>{t('web.share.daysValue', { count: insights.daysWorked })}</span>
              <span>
                {t('web.share.dayAverage', { hours: formatHours(insights.avgPerWorkingDay, locale) })}
              </span>
              {insights.bestWeek ? (
                <span>
                  {t('web.share.bestWeekValue', { hours: formatHours(insights.bestWeek.hours, locale) })}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="share-side">
          <p>{t('share.cardHint')}</p>
          <Switch checked={extras} onChange={setExtras} label={t('share.includeBestWeek')} />
          <div className="btns">
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void run(true)}>
              <Icon name="share" />
              {t('common.share')}
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void run(false)}>
              <Icon name="download" />
              {t('common.saveImage')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
