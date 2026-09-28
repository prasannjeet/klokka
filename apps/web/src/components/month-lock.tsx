'use client';

// Close and reopen a month (CHQ-120): the employer locks a month so nothing in it changes, sees the month's
// total first (GET months/{m}/summary), and can unlock it again. Everyone is told by the API.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatHours, formatMonthName, type IsoMonth } from '@klokka/core';
import { api } from '@/lib/api';
import { useLocale, useT } from '@/lib/i18n';
import { problemMessage, toProblem } from '@/lib/problem';
import { invalidateFigures, useMonthStatus, useMonthSummary } from '@/lib/queries';
import type { WorkspaceView } from '@/lib/workspace';
import { Dialog } from './dialog';
import { Icon } from './icons';
import { useToast } from './toast';

export function useMonthLock(ws: WorkspaceView, month: IsoMonth) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  // Mid-sentence ("Close september" in Swedish) and sentence-initial month names.
  const name = formatMonthName(month, locale, false);
  const Name = formatMonthName(month, locale, true);
  const lock = useMutation({
    mutationFn: () => api.months.lockMonth({ workspaceId: ws.id, month }),
    onSuccess: () =>
      toast({
        title: t('web.month.closedToast', { month: Name }),
        body: t('web.month.closedToastBody'),
        icon: 'lock',
      }),
    onError: async (error) => toast({ title: problemMessage(t, await toProblem(error)), tone: 'error' }),
    onSettled: () => invalidateFigures(queryClient, ws.id),
  });
  const unlock = useMutation({
    mutationFn: () => api.months.unlockMonth({ workspaceId: ws.id, month }),
    onSuccess: () =>
      toast({
        title: t('web.month.unlockedToast', { month: Name }),
        body: t('web.month.unlockedToastBody'),
        icon: 'unlock',
      }),
    onError: async (error) => toast({ title: problemMessage(t, await toProblem(error)), tone: 'error' }),
    onSettled: () => invalidateFigures(queryClient, ws.id),
  });
  return { lock, unlock, name, Name };
}

// The "Close September" / "Unlock September" button with its confirmation. `blocked` holds the close while
// the week grid has unsaved edits.
export function MonthLockButton({
  ws,
  month,
  blocked,
}: {
  ws: WorkspaceView;
  month: IsoMonth;
  blocked?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const status = useMonthStatus(ws.id, month);
  const [confirming, setConfirming] = useState(false);
  const summary = useMonthSummary(ws.id, month, confirming);
  const { lock, unlock, name } = useMonthLock(ws, month);
  const locked = status.data?.locked === true;

  if (locked) {
    return (
      <button
        className="btn btn-ghost"
        type="button"
        disabled={unlock.isPending}
        onClick={() => unlock.mutate()}
      >
        <Icon name="unlock" />
        {t('week.unlockMonth', { month: name })}
      </button>
    );
  }

  const people = summary.data?.members.filter((m) => m.hours > 0).length ?? 0;
  return (
    <>
      <button
        className="btn btn-ghost"
        type="button"
        disabled={!status.data || lock.isPending}
        onClick={() => {
          if (blocked)
            toast({ title: t('web.week.unsavedTitle'), body: t('web.month.saveFirst'), icon: 'alert' });
          else setConfirming(true);
        }}
      >
        <Icon name="lock" />
        {t('week.closeMonth', { month: name })}
      </button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('month.closeMonthTitle', { month: name })}
        description={
          summary.data
            ? t('month.closeMonthHint', {
                hours: formatHours(summary.data.totalHours, locale),
                people: t('common.people', { count: people }),
                month: name,
              })
            : t('common.loading')
        }
      >
        <div className="dlg-actions">
          <button className="btn btn-ghost" type="button" onClick={() => setConfirming(false)}>
            {t('common.notYet')}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={lock.isPending}
            onClick={() => {
              setConfirming(false);
              lock.mutate();
            }}
          >
            <Icon name="lock" />
            {t('month.closeMonth', { month: name })}
          </button>
        </div>
      </Dialog>
    </>
  );
}

// The lock bar's Unlock, for a month shown as closed.
export function UnlockButton({ ws, month }: { ws: WorkspaceView; month: IsoMonth }) {
  const t = useT();
  const { unlock, name } = useMonthLock(ws, month);
  return (
    <button
      className="btn btn-sm btn-ghost"
      type="button"
      disabled={unlock.isPending}
      onClick={() => unlock.mutate()}
    >
      <Icon name="unlock" />
      {t('week.unlockMonth', { month: name })}
    </button>
  );
}
