'use client';

// Which jobs of a series a save or a removal touches (CHQ-187): only this one, this and the following ones, or the
// whole series (past included), each with how many jobs that is and how many closed months keep as they are. A
// schedule change offers only "this and following", from `scheduleFrom`. The button says what will happen;
// removing the whole series asks once more.
import { useId, useState } from 'react';
import type { JobChangeScope, JobScopeCount, JobScopeCounts } from '@klokka/api-client';
import { formatDate, type IsoDate } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { useJobScopeCounts } from '@/lib/queries';
import { Dialog } from '../dialog';
import { Icon } from '../icons';

const COUNT: Record<JobChangeScope, keyof JobScopeCounts> = {
  ONLY_THIS: 'onlyThis',
  THIS_AND_FUTURE: 'thisAndFuture',
  ALL: 'all',
};

export function ScopeStep({
  workspaceId,
  jobId,
  action,
  scheduleChange,
  scheduleFrom,
  onConfirm,
  busy,
  error,
}: {
  workspaceId: string;
  jobId: string;
  action: 'save' | 'remove';
  scheduleChange: boolean;
  // Where a changed schedule starts: the later of the job's date and today.
  scheduleFrom?: IsoDate | undefined;
  onConfirm: (scope: JobChangeScope) => void;
  busy: boolean;
  error: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const ids = useId();
  const counts = useJobScopeCounts(workspaceId, jobId);
  const scopes: JobChangeScope[] = scheduleChange
    ? ['THIS_AND_FUTURE']
    : ['ONLY_THIS', 'THIS_AND_FUTURE', 'ALL'];
  const [scope, setScope] = useState<JobChangeScope>(scopes[0] as JobChangeScope);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const countOf = (value: JobChangeScope): JobScopeCount | undefined => counts.data?.[COUNT[value]];
  const label = (value: JobChangeScope, count: JobScopeCount) =>
    value === 'ONLY_THIS'
      ? t('recurrence.onlyThis')
      : value === 'THIS_AND_FUTURE'
        ? scheduleChange
          ? // The new schedule writes its own jobs, so the old series' count would overstate the change.
            t('recurrence.futureNoCount')
          : t('recurrence.futureCount', { count: Math.max(count.jobs - 1, 0) })
        : t('recurrence.allCount', { count: count.jobs });
  const chosen = countOf(scope);
  const confirmLabel = scheduleChange
    ? t('recurrence.save')
    : t(action === 'save' ? 'recurrence.saveCount' : 'recurrence.removeCount', { count: chosen?.jobs ?? 0 });
  const confirm = () => {
    if (action === 'remove' && scope === 'ALL') setConfirmingAll(true);
    else onConfirm(scope);
  };

  return (
    <div className="scope-step">
      <fieldset className="scope-list" aria-describedby={scheduleChange ? `${ids}-from` : undefined}>
        <legend>{t('recurrence.scopeTitle')}</legend>
        {scheduleChange && scheduleFrom ? (
          <p className="hint" id={`${ids}-from`} data-testid="scope-schedule-from">
            {t('recurrence.scheduleFrom', { date: formatDate(scheduleFrom, locale, 'long') })}
          </p>
        ) : null}
        {counts.data ? (
          <div className="radio-list">
            {scopes.map((value) => {
              const count = countOf(value) as JobScopeCount;
              return (
                <label key={value} className="radio-row">
                  <input
                    type="radio"
                    name={`${ids}-scope`}
                    checked={value === scope}
                    onChange={() => setScope(value)}
                    data-testid={`scope-${value}`}
                  />
                  <span>
                    {label(value, count)}
                    {count.skippedClosed > 0 ? (
                      <small>{t('recurrence.skippedClosed', { count: count.skippedClosed })}</small>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        ) : counts.isError ? (
          <div className="scope-retry">
            <p className="err" role="alert">
              {t('errors.NETWORK')}
            </p>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => void counts.refetch()}>
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <p className="muted">{t('common.loading')}</p>
        )}
      </fieldset>
      {error ? (
        <p className="err" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className={action === 'remove' ? 'btn btn-danger' : 'btn btn-primary'}
        type="button"
        disabled={!chosen || (!scheduleChange && chosen.jobs === 0) || busy}
        onClick={confirm}
        data-testid="scope-confirm"
      >
        <Icon name={action === 'remove' ? 'trash' : 'check'} />
        {confirmLabel}
      </button>
      <Dialog
        open={confirmingAll}
        onClose={() => setConfirmingAll(false)}
        title={confirmLabel}
        description={t('recurrence.removeAllConfirm')}
      >
        <div className="dlg-actions">
          <button className="btn btn-ghost" type="button" onClick={() => setConfirmingAll(false)}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => {
              setConfirmingAll(false);
              onConfirm('ALL');
            }}
            data-testid="scope-confirm-all"
          >
            {t('common.confirm')}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
