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
  bffUrl: (path: string) => `/api/k/${path}`,
  api: {
    flags: { getFlag: calls.getFlag, resolveFlag: calls.resolveFlag },
    entries: { getEntryHistory: calls.getEntryHistory },
  },
}));

const my = {
  notifyFlagDeclined: true,
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

const JOB = {
  id: 'j1',
  hours: 5,
  startTime: '09:00',
  note: 'Counter',
  location: { placeId: 'p1', name: 'Café Nord', address: 'Kungsgatan 12', latitude: 59.3, longitude: 18 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

function day(withFlag: boolean, jobs: (typeof JOB)[] = [JOB]): MemberMonthDay {
  return {
    date: parseDate('2026-09-29'),
    weekday: 'TUESDAY',
    workingDay: true,
    changeCount: 2,
    entryId: 'e1',
    hours: 5,
    note: null,
    jobs,
    earnings: null,
    ...(withFlag ? { flag: { id: 'f1', status: 'OPEN', reason: 'MORE', suggestedHours: 6 } } : {}),
  } as MemberMonthDay;
}

function renderPanel(withFlag: boolean, jobs: (typeof JOB)[] = [JOB], editing = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider initial="en">
        <ToastProvider>
          <EmployerDayPanel
            ws={viewOf(my)}
            day={day(withFlag, jobs)}
            date="2026-09-29"
            personName="Test Testsson"
            currency="SEK"
            {...(editing
              ? {
                  editing: { membershipId: 'm-test', rounding: 'QUARTER', defaultDayHours: 8, locked: false },
                }
              : {})}
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

  it("shows the day's jobs with where, when, how long and directions, and the employer's job actions (CHQ-156)", async () => {
    renderPanel(false, [JOB], true);
    expect(await screen.findByText('Café Nord')).toBeTruthy();
    expect(screen.getByText('09:00 to 14:00, Kungsgatan 12')).toBeTruthy();
    expect(screen.getAllByText('5 h').length).toBeGreaterThan(0);
    expect(screen.getByText('Counter')).toBeTruthy();
    const directions = screen.getByRole('link', { name: 'Directions' });
    expect(directions.getAttribute('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=59.3%2C18&query_place_id=p1',
    );
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add another job' })).toBeTruthy();
  });

  it('approves a flag on a day with several jobs as the day stands', async () => {
    const second = { ...JOB, id: 'j2', hours: 2, startTime: '15:00' };
    renderPanel(true, [JOB, second], true);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve, 5 h as it stands' }));
    await waitFor(() =>
      expect(calls.resolveFlag).toHaveBeenCalledWith({
        workspaceId: 'ws',
        flagId: 'f1',
        flagResolve: { action: 'FIX', hours: 5 },
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
