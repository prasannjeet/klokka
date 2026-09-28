'use client';

// Operator: Workspaces (mockup web-operator.html). Counts and dates per business, never anyone's hours;
// search, pay filter, sorting and paging all happen in the API.
import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import type { OperatorListWorkspacesSortEnum, OperatorWorkspace } from '@klokka/api-client';
import { formatHours, formatMonthName, formatNumber } from '@klokka/core';
import { formatDay, formatWhen } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { Icon } from '../icons';
import { ViewHeader, Illustrative } from '../view-header';
import { ChoiceGroup } from '../choice-group';
import { PAGE_SIZE, useOperatorWorkspaces } from './queries';
import { Pager, SearchBox, SortButton, TableStatus, ariaSort } from './table-parts';
import { useBrowserTimeZone } from './use-time-zone';

const features = tableFeatures({ rowSortingFeature });
const helper = createColumnHelper<typeof features, OperatorWorkspace>();

// Column id -> the API's sort key (the contract sorts by these five).
const SORT_KEYS: Record<string, string> = {
  name: 'name',
  memberCount: 'members',
  monthHours: 'hours',
  createdAt: 'created',
  lastActivityAt: 'activity',
};
const NUMERIC = new Set(['memberCount', 'invitedCount', 'activeCount', 'monthHours']);

function sortParam(sorting: SortingState): OperatorListWorkspacesSortEnum {
  const first = sorting[0];
  const key = first ? (SORT_KEYS[first.id] ?? 'name') : 'name';
  return `${first?.desc ? '-' : ''}${key}` as OperatorListWorkspacesSortEnum;
}

type PayFilter = 'all' | 'on' | 'off';

export function OperatorWorkspacesView() {
  const t = useT();
  const locale = useLocale();
  const timeZone = useBrowserTimeZone();
  const [q, setQ] = useState('');
  const [pay, setPay] = useState<PayFilter>('all');
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);

  const query = useOperatorWorkspaces({
    q,
    pay: pay === 'all' ? null : pay === 'on',
    page,
    sort: sortParam(sorting),
  });
  const data = query.data;
  const summary = data?.summary;
  const maxHours = Math.max(1, ...(data?.items ?? []).map((w) => w.monthHours));

  const onSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);
  const onSortingChange = useCallback((updater: Updater<SortingState>) => {
    setSorting((current) => (typeof updater === 'function' ? updater(current) : updater));
    setPage(1);
  }, []);

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('name', {
          header: () => t('operator.workspaces.workspace'),
          cell: (info) => {
            const w = info.row.original;
            return (
              <div className="who">
                <span
                  className="ws-em"
                  style={{ '--ws-color': 'var(--primary)' } as CSSProperties}
                  aria-hidden="true"
                >
                  {w.emoji}
                </span>
                <div>
                  <b>{w.name}</b>
                  <span className="mono">{w.slug}</span>
                </div>
              </div>
            );
          },
        }),
        helper.accessor('memberCount', {
          header: () => t('operator.workspaces.members'),
          cell: (info) => formatNumber(info.getValue(), locale),
        }),
        helper.accessor('invitedCount', {
          header: () => t('operator.workspaces.invited'),
          enableSorting: false,
          cell: (info) => formatNumber(info.getValue(), locale),
        }),
        helper.accessor('activeCount', {
          header: () => t('operator.workspaces.active'),
          enableSorting: false,
          cell: (info) => formatNumber(info.getValue(), locale),
        }),
        helper.accessor('monthHours', {
          header: () => (summary ? formatMonthName(summary.month, locale) : t('common.hours')),
          cell: (info) => (
            <span className="bar-cell">
              <i
                style={{ '--w': `${Math.round((info.getValue() / maxHours) * 100)}%` } as CSSProperties}
                aria-hidden="true"
              />
              {formatHours(info.getValue(), locale)}
            </span>
          ),
        }),
        helper.accessor('showPay', {
          header: () => t('operator.workspaces.pay'),
          enableSorting: false,
          cell: (info) => (
            <span className={info.getValue() ? 'pill ok' : 'pill'}>
              {info.getValue() ? t('common.on') : t('common.off')}
            </span>
          ),
        }),
        helper.accessor('createdAt', {
          header: () => t('operator.workspaces.created'),
          cell: (info) => formatDay(info.getValue(), locale, timeZone, true),
        }),
        helper.accessor('lastActivityAt', {
          header: () => t('operator.workspaces.lastActivity'),
          cell: (info) => {
            const at = info.getValue();
            return at
              ? formatWhen(at, new Date(), locale, timeZone, {
                  today: t('common.today'),
                  yesterday: t('common.yesterday'),
                })
              : t('web.operator.none');
          },
        }),
      ]),
    [t, locale, timeZone, summary, maxHours],
  );

  const table = useTable({
    features,
    columns,
    data: data?.items ?? EMPTY,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    enableSortingRemoval: false,
    enableMultiSort: false,
  });

  return (
    <section className="view" aria-labelledby="h-ops-ws">
      <ViewHeader
        id="h-ops-ws"
        title={t('operator.workspaces.title')}
        sub={
          summary
            ? t('operator.workspaces.subtitle', { count: formatNumber(summary.workspaces, locale) })
            : null
        }
      />
      {summary ? (
        <div className="hgrid tiles stat-strip">
          <div className="tile">
            <span className="lbl">{t('operator.workspaces.title')}</span>
            <div className="val">{formatNumber(summary.workspaces, locale)}</div>
            <span className={summary.newThisMonth > 0 ? 'delta' : 'delta muted'}>
              {summary.newThisMonth > 0 ? <Icon name="up" /> : null}
              {t('operator.workspaces.newThisMonth', {
                delta: `${summary.newThisMonth > 0 ? '+' : ''}${formatNumber(summary.newThisMonth, locale)}`,
                month: formatMonthName(summary.month, locale, false),
              })}
            </span>
          </div>
          <div className="tile">
            <span className="lbl">{t('operator.workspaces.members')}</span>
            <div className="val">{formatNumber(summary.members, locale)}</div>
            <span className="delta muted">
              {t('operator.workspaces.membersBreakdown', {
                active: formatNumber(summary.membersActive, locale),
                invited: formatNumber(summary.membersInvited, locale),
                deactivated: formatNumber(summary.membersDeactivated, locale),
              })}
            </span>
          </div>
          <div className="tile">
            <span className="lbl">
              {t('operator.workspaces.hoursLoggedIn', {
                month: formatMonthName(summary.month, locale, false),
              })}
            </span>
            <div className="val">
              {formatHours(summary.hoursThisMonth, locale, { unit: false })}
              <small> {t('common.hourUnit')}</small>
            </div>
            <span className="delta muted">{t('operator.workspaces.acrossAll')}</span>
          </div>
          <div className="tile">
            <span className="lbl">{t('operator.workspaces.activeLast7')}</span>
            <div className="val">{formatNumber(summary.activeLast7Days, locale)}</div>
            <span className="delta muted">{t('operator.workspaces.activeLast7Hint')}</span>
          </div>
        </div>
      ) : null}

      <div className="tbl-bar">
        <SearchBox
          id="ops-ws-q"
          label={t('operator.workspaces.search')}
          placeholder={t('operator.workspaces.searchPlaceholder')}
          onSearch={onSearch}
        />
        <ChoiceGroup<PayFilter>
          className="seg"
          label={t('operator.workspaces.pay')}
          value={pay}
          onChange={(value) => {
            setPay(value);
            setPage(1);
          }}
          choices={[
            { value: 'all', label: t('common.all') },
            { value: 'on', label: t('operator.workspaces.payOn') },
            { value: 'off', label: t('operator.workspaces.payOff') },
          ]}
        />
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={NUMERIC.has(header.column.id) ? 'num' : undefined}
                      aria-sort={ariaSort(sorted)}
                    >
                      {header.column.getCanSort() ? (
                        <SortButton
                          label={<table.FlexRender header={header} />}
                          onToggle={() => header.column.toggleSorting()}
                        />
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className={NUMERIC.has(cell.column.id) ? 'num' : undefined}>
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
        {t('web.operator.serverSide')}
      </Illustrative>
    </section>
  );
}

const EMPTY: OperatorWorkspace[] = [];
