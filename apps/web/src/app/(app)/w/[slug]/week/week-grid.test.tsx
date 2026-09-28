// Rounding and number display in the rendered grid: values show with the locale's decimal sign, a typed
// value is rounded by the workspace rule when the cell is left, totals follow as you type.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useReducer, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import type { Locale, Rounding } from '@klokka/core';
import { LocaleProvider } from '@/lib/i18n';
import { gridReducer, initialGrid, type EntryLike } from '@/lib/week-grid';
import { WeekGrid, type GridRow } from './week-grid';

const DATES = [
  '2026-09-21',
  '2026-09-22',
  '2026-09-23',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-09-27',
];
const ROWS: GridRow[] = [{ id: 'm1', name: 'Maria Lind', emoji: null, rate: 170 }];
const ENTRIES: EntryLike[] = [{ membershipId: 'm1', workDate: '2026-09-23', hours: 6.5, note: null }];

function Harness({ rounding, showPay = false }: { rounding: Rounding; showPay?: boolean }) {
  const [state, dispatch] = useReducer(
    gridReducer,
    gridReducer(initialGrid, { type: 'load', entries: ENTRIES }),
  );
  const inputs = useRef(new Map<string, HTMLInputElement>());
  return (
    <WeekGrid
      rows={ROWS}
      dates={DATES}
      today="2026-09-28"
      anchorMonth="2026-09"
      state={state}
      showPay={showPay}
      currency="SEK"
      isLocked={() => false}
      flagged={() => false}
      popped={new Set()}
      inputs={inputs}
      onSelect={() => {}}
      dispatch={dispatch}
      rounding={rounding}
    />
  );
}

function renderGrid(locale: Locale, rounding: Rounding, showPay = false) {
  return render(
    <LocaleProvider initial={locale}>
      <Harness rounding={rounding} showPay={showPay} />
    </LocaleProvider>,
  );
}

const cell = (index: number) => screen.getAllByRole('textbox')[index] as HTMLInputElement;

describe('week grid display', () => {
  it('shows 6,5 in Swedish and 6.5 in English', () => {
    const { unmount } = renderGrid('sv', 'NONE');
    expect(cell(2).value).toBe('6,5');
    unmount();
    renderGrid('en', 'NONE');
    expect(cell(2).value).toBe('6.5');
  });

  it('rounds a typed 3.8 to 3,75 with quarter hours when the cell is left, and totals follow', () => {
    renderGrid('sv', 'QUARTER');
    act(() => {
      fireEvent.focus(cell(0));
      fireEvent.change(cell(0), { target: { value: '3,8' } });
    });
    expect(cell(0).value).toBe('3,8');
    expect(screen.getByText('10,3')).toBeTruthy();
    act(() => fireEvent.blur(cell(0)));
    expect(cell(0).value).toBe('3,75');
    expect(screen.getByText('10,25')).toBeTruthy();
  });

  it('Escape puts the saved value back', () => {
    renderGrid('en', 'NONE');
    act(() => fireEvent.change(cell(2), { target: { value: '2' } }));
    expect(cell(2).value).toBe('2');
    act(() => fireEvent.keyDown(cell(2), { key: 'Escape' }));
    expect(cell(2).value).toBe('6.5');
  });

  it('shows the rate and earnings only when pay is on', () => {
    const { unmount } = renderGrid('en', 'NONE', false);
    expect(document.querySelectorAll('.money')).toHaveLength(0);
    expect(screen.queryByText(/per hour/)).toBeNull();
    unmount();
    renderGrid('en', 'NONE', true);
    expect(screen.getByText(/per hour/)).toBeTruthy();
    expect(document.querySelectorAll('.money').length).toBeGreaterThan(0);
  });
});
