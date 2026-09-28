'use client';

// The employer's side of a flag (CHQ-135): set the entry to the suggested (or another) value, which fixes
// the flag and tells the employee, or dismiss it and keep the logged hours. Used by the overview card and by
// the flag notification.
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Flag } from '@klokka/api-client';
import { formatDate, formatHours, parseHours } from '@klokka/core';
import { api } from '@/lib/api';
import { useLocale, useT } from '@/lib/i18n';
import { problemMessage, toProblem } from '@/lib/problem';
import { invalidateFigures } from '@/lib/queries';
import { isoOf } from '@/lib/time';
import { firstName } from '@/lib/visual';
import type { WorkspaceView } from '@/lib/workspace';
import { Dialog } from './dialog';
import { Icon } from './icons';
import { useToast } from './toast';

export function useResolveFlag(ws: WorkspaceView, flag: Flag) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hours: number | null) =>
      api.flags.resolveFlag({
        workspaceId: ws.id,
        flagId: flag.id,
        flagResolve: hours === null ? { action: 'DISMISS' } : { action: 'FIX', hours },
      }),
    onSuccess: (_f, hours) =>
      toast({
        title:
          hours === null
            ? t('flags.resolvedDismissed', { hours: formatHours(flag.loggedHours, locale) })
            : t('flags.resolvedFixed', {
                before: formatHours(flag.loggedHours, locale),
                after: formatHours(hours, locale),
              }),
        body: t('flags.toldEitherWay', { name: firstName(flag.memberName) }),
        icon: 'flag',
      }),
    onError: async (error) => toast({ title: problemMessage(t, await toProblem(error)), tone: 'error' }),
    onSettled: () => invalidateFigures(queryClient, ws.id),
  });
}

// `inPanel`: the day panel of the Employee view (CHQ-145) already shows the day, so no link, and dismissing
// reads as what it does: keep the logged hours.
export function FlagActions({
  ws,
  flag,
  compact,
  inPanel,
}: {
  ws: WorkspaceView;
  flag: Flag;
  compact?: boolean;
  inPanel?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const resolve = useResolveFlag(ws, flag);
  const [fixing, setFixing] = useState(false);
  const target = flag.suggestedHours ?? flag.loggedHours;
  const [hours, setHours] = useState(formatHours(target, locale, { unit: false }));
  const parsed = parseHours(hours);
  const name = firstName(flag.memberName);
  const date = isoOf(flag.workDate);
  const dateLabel = formatDate(date, locale, 'weekdayDayMonth');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (parsed === null) return;
    setFixing(false);
    resolve.mutate(parsed);
  }

  return (
    <>
      <button
        className="btn btn-primary btn-sm"
        type="button"
        disabled={resolve.isPending}
        onClick={() => setFixing(true)}
      >
        {t('flags.setTo', { hours: formatHours(target, locale) })}
      </button>
      {inPanel ? null : !compact ? (
        <Link className="btn btn-ghost btn-sm" href={`/w/${ws.slug}/week?d=${date}`}>
          {t('flags.openInGrid')}
        </Link>
      ) : (
        <Link
          className="btn btn-ghost btn-sm"
          href={`/w/${ws.slug}/month?member=${flag.membershipId}&month=${date.slice(0, 7)}`}
        >
          {t('web.notifications.seeMonth')}
        </Link>
      )}
      <button
        className="btn btn-ghost btn-sm"
        type="button"
        disabled={resolve.isPending}
        onClick={() => resolve.mutate(null)}
      >
        {inPanel
          ? t('flags.keepHours', { hours: formatHours(flag.loggedHours, locale) })
          : t('common.dismiss')}
      </button>
      <Dialog
        open={fixing}
        onClose={() => setFixing(false)}
        title={t('flags.fixTitle', {
          date: dateLabel,
          hours: parsed !== null ? formatHours(parsed, locale) : hours,
        })}
        description={t('flags.fixHint', {
          name,
          before: formatHours(flag.loggedHours, locale),
          after: parsed !== null ? formatHours(parsed, locale) : '',
        })}
      >
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={`fix-${flag.id}`}>{t('web.flags.hoursField')}</label>
            <div className="inline-field">
              <input
                id={`fix-${flag.id}`}
                className="input short"
                inputMode="decimal"
                value={hours}
                aria-invalid={parsed === null ? true : undefined}
                onChange={(e) => setHours(e.target.value)}
              />
              <span className="muted">
                {t('web.flags.onDay', { date: formatDate(date, locale, 'weekdayDay') })}
              </span>
            </div>
            {parsed === null ? <span className="err">{t('entry.invalidHours')}</span> : null}
          </div>
          <div className="dlg-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setFixing(false)}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-primary" type="submit" disabled={parsed === null}>
              <Icon name="check" />
              {t('flags.fixAndTell', { name })}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
