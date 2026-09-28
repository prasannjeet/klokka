'use client';

import { formatHoursDelta } from '@klokka/core';
import { useLocale } from '@/lib/i18n';
import { Icon } from './icons';

// "+9 h vs August": up in the success colour, down in the warning colour, never red (fewer hours is not an
// error).
export function HoursDelta({ delta, children }: { delta: number; children: (formatted: string) => string }) {
  const locale = useLocale();
  const down = delta < 0;
  return (
    <span className={down ? 'delta warn' : 'delta'}>
      <Icon name={down ? 'down' : 'up'} />
      {children(formatHoursDelta(delta, locale))}
    </span>
  );
}
