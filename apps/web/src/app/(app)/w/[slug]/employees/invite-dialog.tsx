'use client';

// Add employee (CHQ-113): name, email and, when pay is on, an optional hourly rate. The API creates the
// Logto invitation and sends the one email; until it is accepted the person shows as Invited.
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@/components/dialog';
import { Icon } from '@/components/icons';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { fieldError, problemMessage, toProblem, type ProblemInfo } from '@/lib/problem';
import { invalidateFigures } from '@/lib/queries';
import type { WorkspaceView } from '@/lib/workspace';
import { parseRate } from './rate';

export function InviteDialog({
  ws,
  open,
  onClose,
}: {
  ws: WorkspaceView;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rate, setRate] = useState('');
  const [problem, setProblem] = useState<ProblemInfo | null>(null);
  const [touched, setTouched] = useState(false);

  const rateValue = parseRate(rate);
  const localErrors = {
    name: touched && !name.trim() ? t('errors.VALIDATION') : null,
    email: touched && !/^\S+@\S+\.\S+$/.test(email.trim()) ? t('errors.VALIDATION') : null,
    rate: rate.trim() && rateValue === null ? t('errors.VALIDATION') : null,
  };

  const invite = useMutation({
    mutationFn: () =>
      api.members.inviteMember({
        workspaceId: ws.id,
        memberInvite: {
          name: name.trim(),
          email: email.trim(),
          ...(ws.showPay && rateValue !== null ? { hourlyRate: rateValue } : {}),
        },
      }),
    onSuccess: async (member) => {
      await invalidateFigures(queryClient, ws.id);
      toast({
        title: t('web.employees.invited', { email: member.email }),
        body: t('employees.untilAccepts', { name: member.displayName }),
        icon: 'send',
      });
      setName('');
      setEmail('');
      setRate('');
      setTouched(false);
      setProblem(null);
      onClose();
    },
    onError: async (error) => {
      const p = await toProblem(error);
      setProblem(p);
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || (rate.trim() && rateValue === null)) return;
    setProblem(null);
    invite.mutate();
  }

  const nameError = localErrors.name ?? fieldError(problem, 'name');
  const emailError = localErrors.email ?? fieldError(problem, 'email');
  const rateError = localErrors.rate ?? fieldError(problem, 'hourlyRate');
  const general = problem && problem.errors.length === 0 ? problemMessage(t, problem) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('employees.addEmployee')}
      description={t('employees.addEmployeeHint', { workspace: ws.my.name })}
    >
      <form onSubmit={submit} noValidate>
        {general ? (
          <div className="banner bad" role="alert" style={{ marginBottom: 14 }}>
            <Icon name="alert" />
            <span>{general}</span>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="inv-name">{t('employees.name')}</label>
          <input
            className="input"
            id="inv-name"
            value={name}
            autoComplete="off"
            placeholder={t('employees.namePlaceholder')}
            aria-invalid={nameError ? true : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {nameError ? <span className="err">{nameError}</span> : null}
        </div>
        <div className="field">
          <label htmlFor="inv-email">{t('employees.email')}</label>
          <input
            className="input"
            id="inv-email"
            type="email"
            inputMode="email"
            value={email}
            autoComplete="off"
            placeholder={t('employees.emailPlaceholder')}
            aria-invalid={emailError ? true : undefined}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailError ? <span className="err">{emailError}</span> : null}
        </div>
        {ws.showPay ? (
          <div className="field">
            <label htmlFor="inv-rate">{t('employees.hourlyRateOptional', { currency: ws.currency })}</label>
            <div className="inline-field">
              <input
                className="input short"
                id="inv-rate"
                inputMode="decimal"
                value={rate}
                placeholder={t('employees.ratePlaceholder')}
                aria-invalid={rateError ? true : undefined}
                onChange={(e) => setRate(e.target.value)}
              />
              <span className="muted">{t('web.employees.perHourSuffix', { currency: ws.currency })}</span>
            </div>
            {rateError ? <span className="err">{rateError}</span> : null}
          </div>
        ) : (
          <p className="hint" style={{ marginTop: 14 }}>
            {t('employees.ratesHiddenAddHint')}
          </p>
        )}
        <div className="dlg-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit" disabled={invite.isPending}>
            <Icon name="send" />
            {t('employees.sendInvitation')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
