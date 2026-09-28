'use client';

// Operator: Invitations. Each one costs an email, so the console shows where they stand and offers the one
// mutating action of the whole console: Resend (it costs one more email).
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import type { InvitationStatus, OperatorInvitation } from '@klokka/api-client';
import { formatHours, formatMonthName, formatNumber, formatPercent } from '@klokka/core';
import { api } from '@/lib/api';
import { formatDay, formatDayTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { problemMessage, toProblem } from '@/lib/problem';
import { ChoiceGroup } from '../choice-group';
import { Icon } from '../icons';
import { useToast } from '../toast';
import { Illustrative, ViewHeader } from '../view-header';
import { PAGE_SIZE, useOperatorInvitations } from './queries';
import { Pager, TableStatus } from './table-parts';
import { useBrowserTimeZone } from './use-time-zone';

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, OperatorInvitation>();
const EMPTY: OperatorInvitation[] = [];

type StatusFilter = 'all' | 'PENDING' | 'ACCEPTED' | 'EXPIRED';

const STATUS_PILL: Record<InvitationStatus, string> = {
  PENDING: 'pill warn',
  ACCEPTED: 'pill ok',
  EXPIRED: 'pill bad',
  REVOKED: 'pill',
};
const STATUS_KEY = {
  PENDING: 'status.pending',
  ACCEPTED: 'status.accepted',
  EXPIRED: 'status.expired',
  REVOKED: 'status.revoked',
} as const;

export function OperatorInvitationsView() {
  const t = useT();
  const locale = useLocale();
  const timeZone = useBrowserTimeZone();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const query = useOperatorInvitations({ status: status === 'all' ? null : status, page });
  const data = query.data;
  const summary = data?.summary;

  const resend = useMutation({
    mutationFn: (invitation: OperatorInvitation) =>
      api.operator.operatorResendInvitation({ invitationId: invitation.id }),
    onSuccess: async (_void, invitation) => {
      toast({
        title: t('web.operator.invitations.resent', { email: invitation.inviteeEmail }),
        icon: 'send',
      });
      await queryClient.invalidateQueries({ queryKey: ['operator'] });
    },
    onError: async (error) => toast({ title: problemMessage(t, await toProblem(error)), tone: 'error' }),
  });
  const resendMutate = resend.mutate;
  const resending = resend.isPending;

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('inviteeEmail', {
          header: () => t('operator.invitations.invitee'),
          cell: (info) => <b>{info.getValue()}</b>,
        }),
        helper.accessor('workspaceName', { header: () => t('operator.workspaces.workspace') }),
        helper.accessor('invitedBy', { header: () => t('operator.invitations.invitedBy') }),
        helper.accessor('sentAt', {
          header: () => t('operator.invitations.sent'),
          cell: (info) => formatDayTime(info.getValue(), locale, timeZone),
        }),
        helper.accessor('expiresAt', {
          header: () => t('operator.invitations.expires'),
          cell: (info) => {
            const inv = info.row.original;
            if (inv.status === 'ACCEPTED' && inv.acceptedAt) {
              return t('web.operator.invitations.acceptedOn', {
                date: formatDay(inv.acceptedAt, locale, timeZone),
              });
            }
            if (inv.status === 'EXPIRED') {
              return t('web.operator.invitations.expiredOn', {
                date: formatDay(inv.expiresAt, locale, timeZone),
              });
            }
            return formatDay(inv.expiresAt, locale, timeZone);
          },
        }),
        helper.accessor('status', {
          header: () => t('operator.invitations.status'),
          cell: (info) => (
            <span className={STATUS_PILL[info.getValue()]}>
              <span className="dot" />
              {t(STATUS_KEY[info.getValue()])}
            </span>
          ),
        }),
        helper.display({
          id: 'actions',
          header: () => <span className="sr-only">{t('employees.actions')}</span>,
          cell: (info) => {
            const inv = info.row.original;
            if (inv.status !== 'PENDING' && inv.status !== 'EXPIRED') return null;
            return (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={resending}
                aria-label={t('web.operator.invitations.resendFor', { email: inv.inviteeEmail })}
                onClick={() => resendMutate(inv)}
              >
                <Icon name="refresh" />
                {t('common.resend')}
              </button>
            );
          },
        }),
      ]),
    [t, locale, timeZone, resendMutate, resending],
  );

  const table = useTable({ features, columns, data: data?.items ?? EMPTY });

  return (
    <section className="view" aria-labelledby="h-ops-inv">
      <ViewHeader
        id="h-ops-inv"
        title={t('operator.invitations.title')}
        sub={t('operator.invitations.subtitle')}
        actions={
          <ChoiceGroup<StatusFilter>
            className="seg"
            label={t('operator.invitations.status')}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            choices={[
              { value: 'all', label: t('common.all') },
              { value: 'PENDING', label: t('status.pending') },
              { value: 'ACCEPTED', label: t('status.accepted') },
              { value: 'EXPIRED', label: t('status.expired') },
            ]}
          />
        }
      />
      {summary ? (
        <div className="hgrid tiles stat-strip">
          <div className="tile">
            <span className="lbl">{t('operator.invitations.pending')}</span>
            <div className="val">{formatNumber(summary.pending, locale)}</div>
            <span className="delta muted">
              {t('operator.invitations.expireTomorrow', { count: summary.expiringTomorrow })}
            </span>
          </div>
          <div className="tile">
            <span className="lbl">
              {t('operator.invitations.acceptedIn', { month: formatMonthName(summary.month, locale, false) })}
            </span>
            <div className="val">{formatNumber(summary.acceptedThisMonth, locale)}</div>
            <span className="delta">
              <Icon name="up" />
              {t('operator.invitations.acceptedRate', {
                percent: formatPercent(summary.acceptedPercent, locale),
              })}
            </span>
          </div>
          <div className="tile">
            <span className="lbl">
              {t('operator.invitations.expiredIn', { month: formatMonthName(summary.month, locale, false) })}
            </span>
            <div className="val">{formatNumber(summary.expiredThisMonth, locale)}</div>
            <span className="delta muted">
              {t('operator.invitations.resent', { count: summary.resentThisMonth })}
            </span>
          </div>
          <div className="tile">
            <span className="lbl">{t('operator.invitations.medianTimeToAccept')}</span>
            <div className="val">
              {summary.medianHoursToAccept != null ? (
                <>
                  {formatHours(summary.medianHoursToAccept, locale, { unit: false })}
                  <small> {t('common.hourUnit')}</small>
                </>
              ) : (
                t('web.operator.none')
              )}
            </div>
            <span className="delta muted">{t('operator.invitations.fromEmailToSignIn')}</span>
          </div>
        </div>
      ) : null}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} scope="col">
                    <table.FlexRender header={header} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <TableStatus loading={query.isPending} empty={query.isSuccess && data?.items.length === 0} />
        {data ? (
          <Pager page={data.page} pageSize={data.pageSize || PAGE_SIZE} total={data.total} onPage={setPage} />
        ) : null}
      </div>
      <Illustrative>
        <Icon name="info" />
        {t('operator.invitations.resendHint')}
      </Illustrative>
    </section>
  );
}
