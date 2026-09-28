'use client';

import { useEffect, useState } from 'react';
import { formatDate, formatTime } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { todayIn } from '@/lib/time';
import { RailwayClock } from '../clock';

// The rail's clock and date in the workspace's zone. Rendered after mount only, so the server's time and
// the browser's never disagree during hydration.
export function Now({ timeZone }: { timeZone: string }) {
  const locale = useLocale();
  const t = useT();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="now">
      <div className="clock-wrap">
        <RailwayClock timeZone={timeZone} label={t('web.shell.clockLabel')} />
      </div>
      {now ? (
        <div>
          <b>{formatDate(todayIn(timeZone, now), locale, 'weekdayDayMonth')}</b>
          {formatTime(now.toISOString(), locale, timeZone)}, {timeZone}
        </div>
      ) : null}
    </div>
  );
}
