'use client';

// The grid itself: a CSS grid with ARIA grid roles, one text input per person and day. Arrow keys move,
// Enter goes down, Escape puts the saved value back, Backspace on a selected value clears it. The name
// column sticks while the days scroll sideways on a phone.
import type { Dispatch, KeyboardEvent, RefObject } from 'react';
import {
  formatDate,
  formatHours,
  formatMoney,
  formatWeekday,
  isoWeekdayIndex,
  isWeekend,
  monthOf,
  type IsoDate,
  type Rounding,
} from '@klokka/core';
import { Avatar } from '@/components/avatar';
import { Money } from '@/components/money';
import { monthShort } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { firstName } from '@/lib/visual';
import {
  cellKey,
  dayTotal,
  effective,
  isDirty,
  rowTotal,
  weekTotal,
  type GridAction,
  type GridState,
} from '@/lib/week-grid';
import '@/components/jobs/jobs.css';

export interface GridRow {
  id: string;
  name: string;
  emoji: string | null;
  rate: number | null;
}

export function WeekGrid({
  rows,
  dates,
  today,
  anchorMonth,
  state,
  showPay,
  currency,
  isLocked,
  flagged,
  popped,
  inputs,
  onSelect,
  dispatch,
  rounding,
  jobCount,
  onOpenDay,
}: {
  rows: readonly GridRow[];
  dates: readonly IsoDate[];
  today: IsoDate;
  anchorMonth: string;
  state: GridState;
  showPay: boolean;
  currency: string;
  isLocked: (key: string) => boolean;
  flagged: (key: string) => boolean;
  popped: ReadonlySet<string>;
  inputs: RefObject<Map<string, HTMLInputElement>>;
  onSelect: (key: string) => void;
  dispatch: Dispatch<GridAction>;
  rounding: Rounding;
  // A day with two or more jobs is changed job by job (CHQ-156): its cell shows the total and opens the day.
  jobCount: (key: string) => number;
  onOpenDay: (membershipId: string, date: IsoDate) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const ids = rows.map((r) => r.id);

  function move(event: KeyboardEvent<HTMLInputElement>, r: number, c: number) {
    const key = cellKey(rows[r]?.id ?? '', dates[c] ?? '');
    let target: [number, number] | null = null;
    if (event.key === 'ArrowRight') target = [r, c + 1];
    else if (event.key === 'ArrowLeft') target = [r, c - 1];
    else if (event.key === 'ArrowUp') target = [r - 1, c];
    else if (event.key === 'ArrowDown' || event.key === 'Enter') target = [r + 1, c];
    else if (event.key === 'Escape') {
      event.preventDefault();
      dispatch({ type: 'revert', key });
      requestAnimationFrame(() => event.currentTarget?.select());
      return;
    }
    if (!target) return;
    const [nr, nc] = target;
    const next = rows[nr] && dates[nc] ? inputs.current.get(cellKey(rows[nr].id, dates[nc])) : undefined;
    if (next) {
      event.preventDefault();
      next.focus();
      next.select();
    }
  }

  return (
    <div className="wg-scroll">
      <div className="wg" role="grid" aria-label={t('week.gridLabel')} aria-rowcount={rows.length + 2}>
        <div role="row" style={{ display: 'contents' }}>
          <div className="hd corner" role="columnheader">
            {t('employees.person')}
          </div>
          {dates.map((d) => {
            const outside = monthOf(d) !== anchorMonth;
            return (
              <div
                key={d}
                className={d === today ? 'hd today' : 'hd'}
                role="columnheader"
                aria-label={formatDate(d, locale, 'weekdayDayMonth')}
              >
                {formatWeekday(isoWeekdayIndex(d), locale, 'short')}
                <b>
                  {formatDate(d, locale, 'day')}
                  {outside ? <small> {monthShort(d, locale)}</small> : null}
                </b>
              </div>
            );
          })}
          <div className="hd tot" role="columnheader">
            {t('nav.week')}
          </div>
        </div>

        {rows.map((row, r) => (
          <div key={row.id} role="row" style={{ display: 'contents' }}>
            <div className="who" role="rowheader">
              <Avatar name={row.name} emoji={row.emoji} index={r + 1} size="sm" />
              <div>
                <span>{row.name}</span>
                {showPay && row.rate !== null ? (
                  <small>{t('common.perHour', { rate: formatMoney(row.rate, currency, locale) })}</small>
                ) : null}
              </div>
            </div>
            {dates.map((d, c) => {
              const key = cellKey(row.id, d);
              const value = effective(state, key);
              const jobs = jobCount(key);
              if (jobs > 1) {
                return (
                  <div key={d} className={d > today ? 'cell multi future' : 'cell multi'} role="gridcell">
                    <button
                      type="button"
                      aria-label={[
                        t('web.week.cellLabel', {
                          name: firstName(row.name),
                          date: formatDate(d, locale, 'weekdayDayMonth'),
                        }),
                        formatHours(value.hours ?? 0, locale),
                        t('jobs.jobCount', { count: jobs }),
                        flagged(key) ? t('web.week.flagged') : '',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      onClick={() => onOpenDay(row.id, d)}
                      data-testid={`multi-${key}`}
                    >
                      <b>{formatHours(value.hours ?? 0, locale, { unit: false })}</b>
                      <small>{t('jobs.jobCount', { count: jobs })}</small>
                    </button>
                  </div>
                );
              }
              const locked = isLocked(key);
              const text = state.text[key];
              const shown =
                text ?? (value.hours === null ? '' : formatHours(value.hours, locale, { unit: false }));
              const cls = [
                'cell',
                isWeekend(d) ? 'we' : '',
                d > today ? 'future' : '',
                isDirty(state, key) ? 'dirty' : value.hours !== null ? 'has' : '',
                value.note ? 'note' : '',
                flagged(key) ? 'flagged' : '',
                state.errors[key] || state.invalid[key] ? 'error' : '',
                state.saving.includes(key) ? 'saving' : '',
                popped.has(key) ? 'popped' : '',
                locked ? 'locked' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const label = [
                t('web.week.cellLabel', {
                  name: firstName(row.name),
                  date: formatDate(d, locale, 'weekdayDayMonth'),
                }),
                locked ? t('web.week.locked') : '',
                flagged(key) ? t('web.week.flagged') : '',
                value.note ? t('web.week.noteLabel', { note: value.note }) : '',
                state.errors[key] ?? '',
              ]
                .filter(Boolean)
                .join(', ');
              return (
                <div key={d} className={cls} role="gridcell">
                  <input
                    ref={(el) => {
                      if (el) inputs.current.set(key, el);
                      else inputs.current.delete(key);
                    }}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    enterKeyHint="next"
                    value={shown}
                    placeholder="·"
                    readOnly={locked}
                    aria-label={label}
                    aria-invalid={state.invalid[key] || state.errors[key] ? true : undefined}
                    data-r={r}
                    data-c={c}
                    onFocus={(e) => {
                      onSelect(key);
                      e.currentTarget.select();
                    }}
                    onChange={(e) => dispatch({ type: 'type', key, text: e.target.value })}
                    onBlur={() => {
                      if (!locked) dispatch({ type: 'commit', key, rounding });
                    }}
                    onKeyDown={(e) => move(e, r, c)}
                  />
                </div>
              );
            })}
            <div className="rt">
              <span>
                {formatHours(rowTotal(state, row.id, dates), locale, { unit: false })}
                <small>{t('common.hourUnit')}</small>
              </span>
              {row.rate !== null ? (
                <Money
                  block
                  amount={row.rate * rowTotal(state, row.id, dates)}
                  currency={currency}
                  showPay={showPay}
                />
              ) : null}
            </div>
          </div>
        ))}

        <div role="row" style={{ display: 'contents' }}>
          <div className="ct lbl" role="rowheader">
            {t('common.people', { count: rows.length })}
          </div>
          {dates.map((d) => {
            const total = dayTotal(state, ids, d);
            return (
              <div key={d} className="ct" role="gridcell">
                {total ? formatHours(total, locale, { unit: false }) : '·'}
              </div>
            );
          })}
          <div className="ct tot" role="gridcell">
            {formatHours(weekTotal(state, ids, dates), locale)}
          </div>
        </div>
      </div>
    </div>
  );
}
