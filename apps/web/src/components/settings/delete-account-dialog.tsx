'use client';

// Delete my account (CHQ-157). The API decides what goes (DELETE /me); this only says it plainly first: the
// businesses the user owns are deleted with everyone's hours, an employee's hours stay with the employer. The
// button unlocks once the confirmation word is typed, then the session ends.
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Me } from '@klokka/api-client';
import { api } from '@/lib/api';
import { signOutAction } from '@/lib/auth-actions';
import { useT } from '@/lib/i18n';
import { Dialog } from '../dialog';
import { Icon } from '../icons';

export function DeleteAccountDialog({ me, open, onClose }: { me: Me; open: boolean; onClose: () => void }) {
  const t = useT();
  const [typed, setTyped] = useState('');
  const owned = me.workspaces.filter((w) => w.role === 'EMPLOYER').map((w) => w.name);
  const word = t('account.delete.confirmWord');
  const remove = useMutation({
    mutationFn: () => api.me.deleteMe(),
    onSuccess: () => signOutAction(),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (typed.trim().toUpperCase() === word && !remove.isPending) remove.mutate();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('account.delete.title')}
      description={t('account.delete.hint')}
    >
      <form onSubmit={submit} noValidate>
        {remove.isError ? (
          <div className="banner bad" role="alert" style={{ marginBottom: 14 }}>
            <Icon name="alert" />
            <span>{t('account.delete.failed')}</span>
          </div>
        ) : null}
        {owned.length > 0 ? (
          <p className="banner bad">
            {t('account.delete.ownerWarning', { count: owned.length, workspaces: owned.join(', ') })}
          </p>
        ) : null}
        {me.workspaces.some((w) => w.role === 'EMPLOYEE') ? (
          <p className="hint">{t('account.delete.employeeNote')}</p>
        ) : null}
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="del-confirm">{t('account.delete.confirmLabel', { word })}</label>
          <input
            className="input"
            id="del-confirm"
            value={typed}
            autoComplete="off"
            autoCapitalize="characters"
            onChange={(e) => setTyped(e.target.value)}
          />
        </div>
        <div className="dlg-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn btn-danger"
            type="submit"
            disabled={typed.trim().toUpperCase() !== word || remove.isPending}
          >
            <Icon name="trash" />
            {t('account.delete.confirm')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
