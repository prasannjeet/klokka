'use client';

// Open flags on the employer's overview (CHQ-135, mockup "Open flag" card).
import { useState } from 'react';
import type { Flag } from '@klokka/api-client';
import { formatDate, formatHours } from '@klokka/core';
import { formatWhen } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useFlags } from '@/lib/queries';
import { isoOf } from '@/lib/time';
import { firstName } from '@/lib/visual';
import type { WorkspaceView } from '@/lib/workspace';
import { declineNote, FlagActions } from './flag-resolve';
import { Icon } from './icons';

export function OpenFlags({ ws }: { ws: WorkspaceView }) {
  const flags = useFlags(ws.id, 'OPEN');
  const open = (flags.data ?? []).filter((f) => f.status === 'OPEN').slice(0, 3);
  return (
    <>
      {open.map((flag) => (
        <FlagCard key={flag.id} ws={ws} flag={flag} />
      ))}
    </>
  );
}

function FlagCard({ ws, flag }: { ws: WorkspaceView; flag: Flag }) {
  const t = useT();
  const locale = useLocale();
  const [now] = useState(() => new Date());
  const name = firstName(flag.memberName);
  return (
    <div className="card flagcard" role="region" aria-label={t('overview.openFlag')}>
      <div className="fh">
        <span className="pill warn">
          <Icon name="flag" />
          {t('overview.openFlag')}
        </span>
        <b>
          {t('web.flags.who', { name, date: formatDate(isoOf(flag.workDate), locale, 'weekdayDayMonth') })}
        </b>
        <span className="muted small">
          {t('flags.raised', {
            when: formatWhen(flag.raisedAt, now, locale, ws.timezone, {
              today: t('common.today').toLocaleLowerCase(),
              yesterday: t('common.yesterday').toLocaleLowerCase(),
            }),
          })}
        </span>
      </div>
      <blockquote>&ldquo;{flag.message}&rdquo;</blockquote>
      <div className="fnums">
        <span className="big">
          {formatHours(flag.loggedHours, locale, { unit: false })}
          <small> {t('common.hourUnit')}</small>
        </span>
        {flag.suggestedHours != null ? (
          <>
            <Icon name="arrow" />
            <span className="big">
              {formatHours(flag.suggestedHours, locale, { unit: false })}
              <small> {t('common.hourUnit')}</small>
            </span>
            <span className="muted small">{t('flags.suggests', { name })}</span>
          </>
        ) : null}
      </div>
      <div className="fa">
        <FlagActions ws={ws} flag={flag} />
      </div>
      <p className="muted small">{declineNote(t, ws, flag, true)}</p>
    </div>
  );
}
