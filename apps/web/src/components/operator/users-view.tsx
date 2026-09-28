'use client';

// Operator: Users. Identity lives in Logto, membership here; the console shows counts per person, never
// hours. The contract offers search, a role filter and paging (no sorting), so the headers are plain.
import { useCallback, useMemo, useState } from 'react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import type { OperatorUser, Role } from '@klokka/api-client';
import { formatNumber } from '@klokka/core';
import { formatDay, formatWhen } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { Avatar } from '../avatar';
import { ChoiceGroup } from '../choice-group';
import { Icon } from '../icons';
import { Illustrative, ViewHeader } from '../view-header';
import { PAGE_SIZE, useOperatorUsers } from './queries';
import { Pager, SearchBox, TableStatus } from './table-parts';
import { useBrowserTimeZone } from './use-time-zone';

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, OperatorUser>();
const EMPTY: OperatorUser[] = [];

type RoleFilter = 'all' | Role;

export function OperatorUsersView() {
  const t = useT();
  const locale = useLocale();
  const timeZone = useBrowserTimeZone();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [page, setPage] = useState(1);
  const query = useOperatorUsers({ q, role: role === 'all' ? null : role, page });
  const data = query.data;

  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('name', {
          header: () => t('operator.users.person'),
          cell: (info) => {
            const u = info.row.original;
            return (
              <div className="who">
                <Avatar name={u.name} index={info.row.index} size="sm" />
                <div>
                  <b>{u.name}</b>
                  <span>{u.email}</span>
                </div>
              </div>
            );
          },
        }),
        helper.accessor('workspaceCount', {
          header: () => t('operator.users.workspaces'),
          cell: (info) => {
            const u = info.row.original;
            return (
              <span className="roles">
                {u.employerOf > 0 ? (
                  <span className="pill ink">
                    {t('web.operator.users.employerOf', { count: formatNumber(u.employerOf, locale) })}
                  </span>
                ) : null}
                {u.employeeOf > 0 ? (
                  <span className="pill">
                    {t('web.operator.users.employeeAt', { count: formatNumber(u.employeeOf, locale) })}
                  </span>
                ) : null}
                {u.workspaceCount === 0 ? (
                  <span className="pill">{t('web.operator.users.noWorkspace')}</span>
                ) : null}
                {u.platformAdmin ? <span className="pill warn">{t('role.platformAdmin')}</span> : null}
              </span>
            );
          },
        }),
        helper.accessor('language', {
          header: () => t('operator.users.language'),
          cell: (info) => (info.getValue() === 'sv' ? t('settings.swedish') : t('settings.english')),
        }),
        helper.accessor('pushRegistered', {
          header: () => t('operator.users.push'),
          cell: (info) =>
            info.getValue() ? (
              <span className="yes">{t('web.operator.users.pushYes')}</span>
            ) : (
              <span className="no">{t('web.operator.users.pushNo')}</span>
            ),
        }),
        helper.accessor('lastSeenAt', {
          header: () => t('operator.users.lastSeen'),
          cell: (info) => {
            const at = info.getValue();
            return at
              ? formatWhen(at, new Date(), locale, timeZone, {
                  today: t('common.today'),
                  yesterday: t('common.yesterday'),
                })
              : t('web.operator.users.never');
          },
        }),
        helper.accessor('createdAt', {
          header: () => t('web.operator.users.created'),
          cell: (info) => formatDay(info.getValue(), locale, timeZone, true),
        }),
      ]),
    [t, locale, timeZone],
  );

  const table = useTable({ features, columns, data: data?.items ?? EMPTY });

  return (
    <section className="view" aria-labelledby="h-ops-users">
      <ViewHeader
        id="h-ops-users"
        title={t('operator.users.title')}
        sub={data ? t('operator.users.subtitle', { count: formatNumber(data.users, locale) }) : null}
      />
      <div className="tbl-bar">
        <SearchBox
          id="ops-users-q"
          label={t('operator.users.search')}
          placeholder={t('operator.users.searchPlaceholder')}
          onSearch={onSearch}
        />
        <ChoiceGroup<RoleFilter>
          className="seg"
          label={t('operator.users.role')}
          value={role}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
          choices={[
            { value: 'all', label: t('common.all') },
            { value: 'EMPLOYER', label: t('operator.users.employers') },
            { value: 'EMPLOYEE', label: t('operator.users.employees') },
          ]}
        />
      </div>
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
        {t('operator.users.pushHint')}
      </Illustrative>
    </section>
  );
}
