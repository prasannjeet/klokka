'use client';

// The selected day on the employer's Employee view (CHQ-145): the hours, the note, the employee's open
// flag with the resolve actions, the whole change history and, for a day without hours, the way to the
// week grid. Same shape as the employee's day panel.
import Link from 'next/link';
import type { Flag, FlagReason, MemberMonthDay } from '@klokka/api-client';
import { formatDate, formatHours, isoWeek, type IsoDate, type MessageKey } from '@klokka/core';
import { formatDayTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { useFlag } from '@/lib/queries';
import { firstName } from '@/lib/visual';
import type { WorkspaceView } from '@/lib/workspace';
import { EntryHistory } from './entry-history';
import { FlagActions } from './flag-resolve';
import { Icon } from './icons';
import { Money } from './money';

export function EmployerDayPanel({
  ws,
  day,
  date,
  personName,
  currency,
}: {
  ws: WorkspaceView;
  day: MemberMonthDay | null;
  date: IsoDate | null;
  personName: string;
  currency: string;
}) {
  const t = useT();
  const locale = useLocale();
  if (!date) {
    return (
      <div className="card pad dd" id="day-panel">
        <p className="muted">{t('web.month.pickDay')}</p>
      </div>
    );
  }
  const title = formatDate(date, locale, 'weekdayDayMonth');
  return (
    <div className="card pad dd" id="day-panel" aria-live="polite">
      <div className="dd-head">
        <div>
          <h2>{title.charAt(0).toLocaleUpperCase() + title.slice(1)}</h2>
          <p className="sub">{t('web.dayList.dayOf', { week: isoWeek(date).week, name: personName })}</p>
        </div>
      </div>
      {day?.hours != null ? (
        <>
          <div className="big">
            <span className="num">{formatHours(day.hours, locale, { unit: false })}</span>
            <small>{t('common.hourUnit')}</small>
            <Money amount={day.earnings} currency={currency} showPay={ws.showPay} />
          </div>
          {day.note ? (
            <div className="note-row">
              <Icon name="note" />
              <div>
                {day.note}
                {day.updatedBy ? (
                  <span>{t('entry.note', { name: firstName(day.updatedBy.name) })}</span>
                ) : null}
              </div>
            </div>
          ) : null}
          {day.flag?.status === 'OPEN' ? <OpenFlag ws={ws} flagId={day.flag.id} /> : null}
          {day.entryId ? (
            <>
              <h3>{t('entry.history')}</h3>
              <EntryHistory workspaceId={ws.id} entryId={day.entryId} timeZone={ws.timezone} />
            </>
          ) : null}
        </>
      ) : (
        <>
          <p className="empty-day">{t('entry.nothingYet')}</p>
          <div className="acts">
            <Link className="btn btn-ghost btn-sm" href={`/w/${ws.slug}/week?d=${date}`}>
              <Icon name="grid" />
              {t('web.dayList.logInGrid')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

const REASON: Record<FlagReason, MessageKey> = {
  MORE: 'flags.reasonMoreShort',
  LESS: 'flags.reasonLessShort',
  NOT_IN: 'flags.reasonNotInShort',
};

// The employee's flag as they sent it: why, what they say the hours were, their message and when, then
// the employer's answer (set to the suggested hours, or keep what is logged).
function OpenFlag({ ws, flagId }: { ws: WorkspaceView; flagId: string }) {
  const flag = useFlag(ws.id, flagId);
  if (!flag.data) return null;
  return <OpenFlagBody ws={ws} flag={flag.data} />;
}

function OpenFlagBody({ ws, flag }: { ws: WorkspaceView; flag: Flag }) {
  const t = useT();
  const locale = useLocale();
  const name = firstName(flag.memberName);
  return (
    <div className="flag-open" role="status" data-testid="panel-flag">
      <b>
        <Icon name="flag" />
        {t('web.month.flagRaised', { name })}
      </b>
      <span>
        {t(REASON[flag.reason])}
        {flag.suggestedHours != null
          ? `. ${t('web.month.suggests', { name, hours: formatHours(flag.suggestedHours, locale) })}`
          : ''}
      </span>
      {flag.message ? <q>{flag.message}</q> : null}
      <span className="when">
        {t('flags.raised', { when: formatDayTime(flag.raisedAt, locale, ws.timezone) })}
      </span>
      <div className="acts">
        <FlagActions ws={ws} flag={flag} inPanel />
      </div>
      <span className="when">{t('flags.toldEitherWay', { name })}</span>
    </div>
  );
}
