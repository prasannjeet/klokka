// The employer's day list (CHQ-145): one clean line per day, newest first, with the note, who changed it
// last, the flag, the hours and pay only when shown; a line selects its day.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { parseDate, type MemberMonthDay } from '@klokka/api-client';
import { LocaleProvider } from '@/lib/i18n';
import { DayList } from './day-list';

const anna = { id: 'u1', name: 'Anna Admin' };

function day(date: string, hours: number | null, extra: Partial<MemberMonthDay> = {}): MemberMonthDay {
  return {
    date: parseDate(date),
    weekday: 'MONDAY',
    workingDay: true,
    changeCount: hours === null ? 0 : 1,
    entryId: hours === null ? null : `e-${date}`,
    hours,
    note: null,
    earnings: hours === null ? null : hours * 165,
    ...(hours === null ? {} : { updatedAt: new Date('2026-09-28T13:05:00Z'), updatedBy: anna }),
    ...extra,
  } as MemberMonthDay;
}

const DAYS = [
  day('2026-09-21', 8),
  day('2026-09-22', null),
  day('2026-09-23', 6, { note: 'Delivery day', changeCount: 3 }),
  day('2026-09-24', 4, { flag: { id: 'f1', status: 'OPEN', reason: 'MORE', suggestedHours: 6 } }),
];

function renderList(showPay: boolean, onSelect = vi.fn()) {
  render(
    <LocaleProvider initial="en">
      <DayList
        days={DAYS}
        timeZone="Europe/Stockholm"
        showPay={showPay}
        currency="SEK"
        selected="2026-09-23"
        onSelect={onSelect}
      />
    </LocaleProvider>,
  );
  return onSelect;
}

describe('DayList', () => {
  it('lists the days with hours, newest first, with who changed them and the open flag', () => {
    renderList(false);
    const rows = screen.getAllByRole('button');
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Thursday 24 September, 4 h. Show the day.',
      'Wednesday 23 September, 6 h. Show the day.',
      'Monday 21 September, 8 h. Show the day.',
    ]);
    expect(within(rows[0]!).getByText('Open flag')).toBeTruthy();
    expect(within(rows[1]!).getByText('Delivery day')).toBeTruthy();
    expect(within(rows[1]!).getByText(/^Changed by Anna, /)).toBeTruthy();
    expect(within(rows[1]!).getByText('edited 2 times')).toBeTruthy();
    expect(within(rows[2]!).getByText(/^Logged by Anna, /)).toBeTruthy();
    expect(rows[1]!.getAttribute('aria-current')).toBe('true');
    expect(screen.queryByText(/SEK|kr/)).toBeNull();
  });

  it('shows the pay only when pay is on, and selects a day on click', () => {
    const onSelect = renderList(true);
    expect(screen.getByText('SEK 990')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button')[2]!);
    expect(onSelect).toHaveBeenCalledWith('2026-09-21');
  });
});
