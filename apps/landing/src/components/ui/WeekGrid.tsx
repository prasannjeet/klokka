import type { CSSProperties, ReactNode } from 'react';
import { formatNumber } from '@klokka/core/format';
import type { Locale } from '@/lib/i18n';
import type { WeekRow } from '@/lib/sample';
import { cn } from '@/lib/cn';

type Props = {
  locale: Locale;
  label: string;
  days: readonly string[];
  off: string;
  rows: readonly WeekRow[];
  /** A row whose worked days pop in (the hero stage). */
  fillRow?: number;
  /** A cell drawn as being edited, with its popover. */
  edit?: { row: number; day: number; popover: ReactNode };
};

/** The week grid drawn as UI: people down, Monday..Sunday across. Rows use display: contents for the grid. */
export function WeekGrid({ locale, label, days, off, rows, fillRow, edit }: Props) {
  return (
    <div className="wk" role="table" aria-label={label}>
      <div className="wk-row" role="row">
        <span className="hd" role="columnheader" />
        {days.map((d, i) => (
          <span key={i} className="hd" role="columnheader">
            {d}
          </span>
        ))}
      </div>
      {rows.map((row, r) => {
        let popIndex = 0;
        return (
          <div key={row.name} className="wk-row" role="row">
            <span className="who" role="rowheader">
              <span className={cn('av', row.tone !== 'c1' && row.tone)} aria-hidden="true">
                {row.name.charAt(0)}
              </span>
              <span>{row.name}</span>
            </span>
            {row.hours.map((h, d) => {
              if (h === null) {
                return (
                  <span key={d} className="cell off" role="cell">
                    {off}
                  </span>
                );
              }
              const filling = r === fillRow;
              const editing = edit && edit.row === r && edit.day === d;
              const style = filling ? ({ '--i': popIndex++ } as CSSProperties) : undefined;
              return (
                <span
                  key={d}
                  className={cn('cell', filling && 'fill', editing && 'edit')}
                  role="cell"
                  style={style}
                >
                  {formatNumber(h, locale)}
                  {editing ? edit.popover : null}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
