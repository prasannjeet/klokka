'use client';

// Shared pieces of the console's tables: a sortable header button (the th carries aria-sort) and the
// pager ("1 to 12 of 38", previous, next). Paging and sorting are the API's (server-side).
import { useEffect, useState, type ReactNode } from 'react';
import { formatNumber } from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';
import { Icon } from '../icons';

// The direction is announced by aria-sort on the header cell; the button only toggles it.
export function SortButton({ label, onToggle }: { label: ReactNode; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}>
      {label}
      <Icon name="sort" />
    </button>
  );
}

export function ariaSort(sorted: false | 'asc' | 'desc'): 'ascending' | 'descending' | undefined {
  return sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined;
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="tbl-foot">
      <span aria-live="polite">
        {t('operator.paging.range', {
          from: formatNumber(from, locale),
          to: formatNumber(to, locale),
          total: formatNumber(total, locale),
        })}
      </span>
      <span className="pages" role="group" aria-label={t('operator.paging.pages')}>
        <button
          type="button"
          aria-label={t('operator.paging.previousPage')}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <Icon name="chev-left" />
        </button>
        <button type="button" aria-current="true" tabIndex={-1}>
          {formatNumber(page, locale)}
        </button>
        <span className="muted">{t('operator.paging.of', { total: formatNumber(pages, locale) })}</span>
        <button
          type="button"
          aria-label={t('operator.paging.nextPage')}
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <Icon name="chev-right" />
        </button>
      </span>
    </div>
  );
}

// A search box whose value reaches the query 300 ms after the last keystroke.
export function SearchBox({
  id,
  label,
  placeholder,
  onSearch,
}: {
  id: string;
  label: string;
  placeholder: string;
  onSearch: (q: string) => void;
}) {
  const [value, setValue] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => onSearch(value.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [value, onSearch]);
  return (
    <div className="search">
      <Icon name="search" />
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        className="input"
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

export function TableStatus({ loading, empty }: { loading: boolean; empty: boolean }) {
  const t = useT();
  if (!loading && !empty) return null;
  return <div className="tbl-empty">{loading ? t('common.loading') : t('web.operator.empty')}</div>;
}
