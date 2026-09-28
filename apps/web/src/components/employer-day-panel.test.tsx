// The Employee view's day panel (CHQ-145): a flagged day shows the employee's flag (reason, suggestion,
// message, when) with the answers, and "keep" resolves by dismissing; a plain day shows no flag block.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDate, type Flag, type MemberMonthDay, type MyWorkspace } from '@klokka/api-client';
import { LocaleProvider } from '@/lib/i18n';
import { viewOf } from '@/lib/workspace';
import { EmployerDayPanel } from './employer-day-panel';
import { ToastProvider } from './toast';

const calls = vi.hoisted(() => ({ getFlag: vi.fn(), resolveFlag: vi.fn(), getEntryHistory: vi.fn() }));
vi.mock('@/lib/api', () => ({
  api: {
    flags: { getFlag: calls.getFlag, resolveFlag: calls.resolveFlag },
    entries: { getEntryHistory: calls.getEntryHistory },
  },
}));

const my = {
  workspaceId: 'ws',
  membershipId: 'm-anna',
  name: 'Kafé Nord',
  slug: 'kafe-nord',
  role: 'EMPLOYER',
  showPay: false,
  currency: 'SEK',
  timezone: 'Europe/Stockholm',
  weekStart: 'MONDAY',
} as unknown as MyWorkspace;

const flag: Flag = {
  id: 'f1',
  workspaceId: 'ws',
  entryId: 'e1',
  membershipId: 'm-test',
  memberName: 'Test Testsson',
  workDate: parseDate('2026-09-29'),
  loggedHours: 5,
  suggestedHours: 6,
  reason: 'MORE',
  message: 'I stayed until closing, 6 h not 5.',
  status: 'OPEN',
  raisedAt: new Date('2026-09-28T13:56:00Z'),
  raisedBy: { userId: 'u-test', name: 'Test Testsson' },
};

function day(withFlag: boolean): MemberMonthDay {
  return {
    date: parseDate('2026-09-29'),
    weekday: 'TUESDAY',
    workingDay: true,
    changeCount: 2,
    entryId: 'e1',
    hours: 5,
    note: null,
    earnings: null,
    ...(withFlag ? { flag: { id: 'f1', status: 'OPEN', reason: 'MORE', suggestedHours: 6 } } : {}),
  } as MemberMonthDay;
}

function renderPanel(withFlag: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider initial="en">
        <ToastProvider>
          <EmployerDayPanel
            ws={viewOf(my)}
            day={day(withFlag)}
            date="2026-09-29"
            personName="Test Testsson"
            currency="SEK"
          />
        </ToastProvider>
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe('EmployerDayPanel', () => {
  beforeEach(() => {
    calls.getFlag.mockReset().mockResolvedValue(flag);
    calls.resolveFlag.mockReset().mockResolvedValue({ ...flag, status: 'DISMISSED' });
    calls.getEntryHistory.mockReset().mockResolvedValue([]);
  });

  it('shows the open flag with the reason, the suggestion, the message and when, and keeps the hours on request', async () => {
    renderPanel(true);
    expect(await screen.findByText('Test flagged this day')).toBeTruthy();
    expect(screen.getByText('Worked more than logged. Test suggests 6 h')).toBeTruthy();
    expect(screen.getByText('I stayed until closing, 6 h not 5.')).toBeTruthy();
    expect(screen.getByText(/^Raised 28 Sept/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Set to 6 h' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep 5 h' }));
    await waitFor(() =>
      expect(calls.resolveFlag).toHaveBeenCalledWith({
        workspaceId: 'ws',
        flagId: 'f1',
        flagResolve: { action: 'DISMISS' },
      }),
    );
  });

  it('shows no flag block for a day without an open flag', async () => {
    renderPanel(false);
    expect(await screen.findByText('History')).toBeTruthy();
    expect(screen.queryByTestId('panel-flag')).toBeNull();
    expect(calls.getFlag).not.toHaveBeenCalled();
  });
});
