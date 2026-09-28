'use client';

// Employees (CHQ-113 list and invite, CHQ-116 manage): everyone the employer logs hours for, their status,
// this month's hours and, with pay on, their rate and earnings. Mockup web-employer.html "Employees".
import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Member } from '@klokka/api-client';
import { formatHours, formatMoney, formatMonthName } from '@klokka/core';
import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/icons';
import { Money } from '@/components/money';
import { useToast } from '@/components/toast';
import { ViewHeader } from '@/components/view-header';
import { api } from '@/lib/api';
import { formatDay } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { problemMessage, toProblem } from '@/lib/problem';
import { keys, useMembers } from '@/lib/queries';
import { monthIn } from '@/lib/time';
import { useWorkspace } from '@/lib/workspace';
import { InviteDialog } from './invite-dialog';
import { MemberActions } from './member-actions';

const STATUS_PILL = { ACTIVE: 'pill ok', INVITED: 'pill warn', DEACTIVATED: 'pill' } as const;
const STATUS_KEY = {
  ACTIVE: 'status.active',
  INVITED: 'status.invited',
  DEACTIVATED: 'status.deactivated',
} as const;

export function EmployeesView() {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const toast = useToast();
  const queryClient = useQueryClient();
  const month = monthIn(ws.timezone);
  const members = useMembers(ws.id, month);
  const [inviting, setInviting] = useState(false);

  const people = (members.data ?? []).filter((m) => m.role === 'EMPLOYEE');
  const count = (status: Member['status']) => people.filter((m) => m.status === status).length;

  const resend = useMutation({
    mutationFn: (m: Member) => api.members.resendInvitation({ workspaceId: ws.id, membershipId: m.id }),
    onSuccess: async (m) => {
      await queryClient.invalidateQueries({ queryKey: keys.members(ws.id, month) });
      toast({ title: t('employees.invitationResent', { email: m.email }), icon: 'send' });
    },
    onError: async (error) => toast({ title: problemMessage(t, await toProblem(error)), tone: 'error' }),
  });

  function joinedText(m: Member): string {
    if (m.status === 'INVITED' && m.invitation) {
      if (m.invitation.status === 'EXPIRED') {
        return t('web.employees.invitationExpired', {
          date: formatDay(m.invitation.expiresAt, locale, ws.timezone),
        });
      }
      return t('web.employees.invitedOn', {
        sent: formatDay(m.invitation.sentAt, locale, ws.timezone, true),
        expires: formatDay(m.invitation.expiresAt, locale, ws.timezone),
      });
    }
    return m.joinedAt ? formatDay(m.joinedAt, locale, ws.timezone, true) : '';
  }

  return (
    <section className="view" aria-labelledby="h-emp">
      <ViewHeader
        id="h-emp"
        title={t('employees.title')}
        sub={t('employees.subtitle', {
          active: count('ACTIVE'),
          invited: count('INVITED'),
          deactivated: count('DEACTIVATED'),
        })}
        actions={
          <button className="btn btn-primary" type="button" onClick={() => setInviting(true)}>
            <Icon name="plus" />
            {t('employees.addEmployee')}
          </button>
        }
      />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t('employees.person')}</th>
              <th scope="col">{t('employees.status')}</th>
              {ws.showPay ? (
                <th scope="col" className="num">
                  {t('employees.hourlyRate')}
                </th>
              ) : null}
              <th scope="col" className="num">
                {formatMonthName(month, locale)}
              </th>
              {ws.showPay ? (
                <th scope="col" className="num">
                  {t('employees.earned')}
                </th>
              ) : null}
              <th scope="col">{t('employees.joined')}</th>
              <th scope="col">
                <span className="sr-only">{t('employees.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {people.map((m, i) => (
              <tr key={m.id} className={m.status === 'DEACTIVATED' ? 'dim' : undefined}>
                <td>
                  <div className="who">
                    <Avatar
                      name={m.displayName}
                      emoji={m.avatarEmoji}
                      index={m.status === 'ACTIVE' ? i : 0}
                    />
                    <div>
                      <b>{m.displayName}</b>
                      <span>{m.email}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={STATUS_PILL[m.status]}>
                    {m.status !== 'DEACTIVATED' ? <span className="dot" /> : null}
                    {t(STATUS_KEY[m.status])}
                  </span>
                </td>
                {ws.showPay ? (
                  <td className="num">
                    {m.hourlyRate != null ? formatMoney(m.hourlyRate, ws.currency, locale) : ''}
                  </td>
                ) : null}
                <td className="num">{formatHours(m.month.hours, locale)}</td>
                {ws.showPay ? (
                  <td className="num">
                    <Money amount={m.month.earnings} currency={ws.currency} showPay={ws.showPay} />
                  </td>
                ) : null}
                <td>{joinedText(m)}</td>
                <td>
                  <div className="acts">
                    {m.status === 'INVITED' ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        disabled={resend.isPending}
                        onClick={() => resend.mutate(m)}
                      >
                        <Icon name="refresh" />
                        {t('common.resend')}
                      </button>
                    ) : null}
                    {m.status !== 'DEACTIVATED' ? (
                      <Link className="btn btn-ghost btn-sm" href={`/w/${ws.slug}/month?member=${m.id}`}>
                        <Icon name="calendar" />
                        {t('nav.month')}
                      </Link>
                    ) : null}
                    <MemberActions ws={ws} member={m} month={month} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.isSuccess && people.length === 0 ? (
          <div className="empty-state">
            <Icon name="users" />
            <b>{t('web.employees.emptyTitle')}</b>
            <p>{t('employees.addEmployeeShortHint')}</p>
          </div>
        ) : null}
        <div className="tbl-foot">
          <span>{ws.showPay ? t('employees.ratesPrivateHint') : t('employees.ratesHiddenHint')}</span>
        </div>
      </div>
      <InviteDialog ws={ws} open={inviting} onClose={() => setInviting(false)} />
    </section>
  );
}
