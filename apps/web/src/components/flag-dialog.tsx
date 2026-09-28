'use client';

// The employee flags an entry (CHQ-135, mockup web-employee.html "Flag an entry"): what is wrong, the hours
// they think are right (optional) and a message. The employer is notified and can fix or dismiss it.
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FlagReason } from '@klokka/api-client';
import { formatDate, formatHours, parseHours, type IsoDate } from '@klokka/core';
import { api } from '@/lib/api';
import { useLocale, useT } from '@/lib/i18n';
import { problemMessage, toProblem, type ProblemInfo } from '@/lib/problem';
import { invalidateFigures } from '@/lib/queries';
import type { WorkspaceView } from '@/lib/workspace';
import { ChoiceGroup } from './choice-group';
import { Dialog } from './dialog';
import { Icon } from './icons';
import { useToast } from './toast';

function reasonFor(suggested: number | null, logged: number): FlagReason | null {
  if (suggested === null) return null;
  if (suggested === 0) return 'NOT_IN';
  return suggested > logged ? 'MORE' : suggested < logged ? 'LESS' : null;
}

export function FlagDialog({
  ws,
  entryId,
  date,
  loggedHours,
  employer,
  open,
  onClose,
}: {
  ws: WorkspaceView;
  entryId: string;
  date: IsoDate;
  loggedHours: number;
  employer: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<FlagReason>('MORE');
  const [hours, setHours] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const [problem, setProblem] = useState<ProblemInfo | null>(null);
  const suggested = hours.trim() ? parseHours(hours) : null;
  const hoursInvalid = hours.trim() !== '' && suggested === null;
  const messageMissing = touched && message.trim() === '';

  const raise = useMutation({
    mutationFn: () =>
      api.flags.raiseFlag({
        workspaceId: ws.id,
        entryId,
        flagCreate: {
          reason,
          message: message.trim(),
          ...(reason === 'NOT_IN'
            ? { suggestedHours: 0 }
            : suggested !== null
              ? { suggestedHours: suggested }
              : {}),
        },
      }),
    onSuccess: async () => {
      await invalidateFigures(queryClient, ws.id);
      toast({
        title: t('web.flags.sent', { name: employer }),
        body: t('flags.sendFlagHint', { name: employer }),
        icon: 'flag',
      });
      setHours('');
      setMessage('');
      setTouched(false);
      setProblem(null);
      onClose();
    },
    onError: async (error) => setProblem(await toProblem(error)),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (message.trim() === '' || hoursInvalid) return;
    setProblem(null);
    raise.mutate();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('flags.flagDay', { date: formatDate(date, locale, 'weekdayDayMonth') })}
      description={t('flags.webHint', { name: employer })}
    >
      <form onSubmit={submit} noValidate>
        {problem ? (
          <div className="banner bad" role="alert" style={{ marginBottom: 14 }}>
            <Icon name="alert" />
            <span>
              {problem.code === 'FLAG_ALREADY_OPEN' ? t('flags.alreadyOpen') : problemMessage(t, problem)}
            </span>
          </div>
        ) : null}
        <div className="field">
          <span className="l" id="flag-reason">
            {t('web.flags.reason')}
          </span>
          <ChoiceGroup
            className="seg block stack"
            labelledBy="flag-reason"
            value={reason}
            onChange={setReason}
            choices={[
              { value: 'MORE', label: t('flags.reasonMore') },
              { value: 'LESS', label: t('flags.reasonLess') },
              { value: 'NOT_IN', label: t('flags.reasonNotIn') },
            ]}
          />
        </div>
        {reason !== 'NOT_IN' ? (
          <div className="field">
            <label htmlFor="flag-hours">{t('web.flags.hoursLabel')}</label>
            <div className="inline-field">
              <input
                id="flag-hours"
                className="input short"
                inputMode="decimal"
                value={hours}
                placeholder={formatHours(loggedHours, locale, { unit: false })}
                aria-invalid={hoursInvalid ? true : undefined}
                onChange={(e) => {
                  setHours(e.target.value);
                  const next = reasonFor(parseHours(e.target.value), loggedHours);
                  if (next) setReason(next);
                }}
              />
              <span className="muted">
                {t('flags.entrySays', { hours: formatHours(loggedHours, locale) })}
              </span>
            </div>
            {hoursInvalid ? <span className="err">{t('entry.invalidHours')}</span> : null}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="flag-msg">{t('flags.message')}</label>
          <textarea
            id="flag-msg"
            className="input"
            maxLength={300}
            required
            value={message}
            placeholder={t('flags.messagePlaceholder')}
            aria-invalid={messageMissing ? true : undefined}
            onChange={(e) => setMessage(e.target.value)}
          />
          {messageMissing ? (
            <span className="err">{t('web.flags.messageRequired', { name: employer })}</span>
          ) : null}
        </div>
        <div className="dlg-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" type="submit" disabled={raise.isPending}>
            <Icon name="flag" />
            {t('flags.sendFlag')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
