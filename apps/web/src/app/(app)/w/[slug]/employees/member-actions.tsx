'use client';

// Member management (CHQ-116): hourly rate (pay on), deactivate and reactivate (a person leaves by being
// deactivated; their hours stay), withdraw a pending invitation. Status changes are optimistic and roll
// back on a problem.
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu } from '@base-ui/react/menu';
import type { Member, MemberStatus } from '@klokka/api-client';
import { formatMoney, type IsoMonth } from '@klokka/core';
import { Dialog } from '@/components/dialog';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useLocale, useT } from '@/lib/i18n';
import { fieldError, problemMessage, toProblem, type ProblemInfo } from '@/lib/problem';
import { invalidateFigures, keys } from '@/lib/queries';
import type { WorkspaceView } from '@/lib/workspace';
import { parseRate } from './rate';

export function MemberActions({ ws, member, month }: { ws: WorkspaceView; member: Member; month: IsoMonth }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editingRate, setEditingRate] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const listKey = keys.members(ws.id, month);

  const setStatus = useMutation({
    mutationFn: (status: MemberStatus) =>
      api.members.updateMember({ workspaceId: ws.id, membershipId: member.id, memberUpdate: { status } }),
    onMutate: async (status) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const before = queryClient.getQueryData<Member[]>(listKey);
      queryClient.setQueryData<Member[]>(listKey, (all) =>
        all?.map((m) => (m.id === member.id ? { ...m, status } : m)),
      );
      return { before };
    },
    onError: async (error, _status, context) => {
      if (context?.before) queryClient.setQueryData(listKey, context.before);
      toast({ title: problemMessage(t, await toProblem(error)), tone: 'error' });
    },
    onSuccess: (_m, status) =>
      toast({
        title:
          status === 'DEACTIVATED'
            ? t('web.employees.deactivatedToast', { name: member.displayName })
            : t('web.employees.reactivatedToast', { name: member.displayName }),
      }),
    onSettled: () => invalidateFigures(queryClient, ws.id),
  });

  const withdraw = useMutation({
    mutationFn: () => api.members.removeMember({ workspaceId: ws.id, membershipId: member.id }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const before = queryClient.getQueryData<Member[]>(listKey);
      queryClient.setQueryData<Member[]>(listKey, (all) => all?.filter((m) => m.id !== member.id));
      setWithdrawing(false);
      return { before };
    },
    onError: async (error, _v, context) => {
      if (context?.before) queryClient.setQueryData(listKey, context.before);
      toast({ title: problemMessage(t, await toProblem(error)), tone: 'error' });
    },
    onSuccess: () => toast({ title: t('web.employees.withdrawn', { name: member.displayName }) }),
    onSettled: () => invalidateFigures(queryClient, ws.id),
  });

  if (member.status === 'DEACTIVATED') {
    return (
      <button
        className="btn btn-ghost btn-sm"
        type="button"
        disabled={setStatus.isPending}
        onClick={() => setStatus.mutate('ACTIVE')}
      >
        {t('employees.reactivate')}
      </button>
    );
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          className="btn btn-ghost btn-sm btn-icon"
          aria-label={t('web.employees.moreFor', { name: member.displayName })}
        >
          <Icon name="more" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="end" sideOffset={6}>
            <Menu.Popup className="pop">
              {ws.showPay ? (
                <Menu.Item className="pop-item" onClick={() => setEditingRate(true)}>
                  <Icon name="edit" />
                  <span>
                    <b>{t('employees.editRate')}</b>
                    <span>
                      {member.hourlyRate != null
                        ? formatMoney(member.hourlyRate, ws.currency, locale)
                        : t('web.employees.noRate')}
                    </span>
                  </span>
                  <span />
                </Menu.Item>
              ) : null}
              {member.status === 'ACTIVE' ? (
                <Menu.Item className="pop-item" onClick={() => setStatus.mutate('DEACTIVATED')}>
                  <Icon name="minus" />
                  <span>
                    <b>{t('employees.deactivate')}</b>
                  </span>
                  <span />
                </Menu.Item>
              ) : null}
              {member.status === 'INVITED' ? (
                <Menu.Item className="pop-item" onClick={() => setWithdrawing(true)}>
                  <Icon name="trash" />
                  <span>
                    <b>{t('web.employees.withdraw')}</b>
                  </span>
                  <span />
                </Menu.Item>
              ) : null}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {ws.showPay ? (
        <RateDialog ws={ws} member={member} open={editingRate} onClose={() => setEditingRate(false)} />
      ) : null}
      <Dialog
        open={withdrawing}
        onClose={() => setWithdrawing(false)}
        title={t('web.employees.withdrawTitle', { name: member.displayName })}
        description={t('web.employees.withdrawHint', { name: member.displayName })}
      >
        <div className="dlg-actions">
          <button className="btn btn-ghost" type="button" onClick={() => setWithdrawing(false)}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-danger" type="button" onClick={() => withdraw.mutate()}>
            <Icon name="trash" />
            {t('web.employees.withdraw')}
          </button>
        </div>
      </Dialog>
    </>
  );
}

function RateDialog({
  ws,
  member,
  open,
  onClose,
}: {
  ws: WorkspaceView;
  member: Member;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [rate, setRate] = useState(member.hourlyRate != null ? String(member.hourlyRate) : '');
  const [problem, setProblem] = useState<ProblemInfo | null>(null);
  const value = parseRate(rate);
  const invalid = rate.trim() !== '' && value === null;

  const save = useMutation({
    mutationFn: () =>
      api.members.updateMember({
        workspaceId: ws.id,
        membershipId: member.id,
        memberUpdate: { hourlyRate: rate.trim() === '' ? null : value },
      }),
    onSuccess: async () => {
      await invalidateFigures(queryClient, ws.id);
      toast({ title: t('web.employees.rateSaved', { name: member.displayName }) });
      onClose();
    },
    onError: async (error) => setProblem(await toProblem(error)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    save.mutate();
  }

  const error = invalid
    ? t('errors.VALIDATION')
    : (fieldError(problem, 'hourlyRate') ?? (problem ? problemMessage(t, problem) : null));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('web.employees.rateTitle', { name: member.displayName })}
      description={t('employees.ratesPrivateHint')}
    >
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`rate-${member.id}`}>{t('employees.hourlyRate')}</label>
          <div className="inline-field">
            <input
              className="input short"
              id={`rate-${member.id}`}
              inputMode="decimal"
              value={rate}
              placeholder={t('employees.ratePlaceholder')}
              aria-invalid={error ? true : undefined}
              onChange={(e) => setRate(e.target.value)}
            />
            <span className="muted">{t('web.employees.perHourSuffix', { currency: ws.currency })}</span>
          </div>
          {error ? <span className="err">{error}</span> : null}
        </div>
        <div className="dlg-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit" disabled={save.isPending}>
            {t('common.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
