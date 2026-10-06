// The team calendar (CHQ-171): the month's team hours per date from the summary, and the picked date's jobs
// across the team with who worked how long.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDate, type Entry, type MonthSummary, type MyWorkspace } from '@klokka/api-client';
import { LocaleProvider } from '@/lib/i18n';
import { viewOf } from '@/lib/workspace';
import type * as Workspace from '@/lib/workspace';
import { TeamCalendarView } from './team-calendar-view';

const calls = vi.hoisted(() => ({
  getMonthSummary: vi.fn(),
  listEntries: vi.fn(),
  getWorkspace: vi.fn(),
  replace: vi.fn(),
  search: { value: 'month=2026-09&day=2026-09-24' },
}));
vi.mock('@/lib/api', () => ({
  bffUrl: (path: string) => `/api/k/${path}`,
  api: {
    months: { getMonthSummary: calls.getMonthSummary },
    entries: { listEntries: calls.listEntries },
    workspaces: { getWorkspace: calls.getWorkspace },
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: calls.replace, push: vi.fn() }),
  usePathname: () => '/w/kafe-nord/calendar',
  useSearchParams: () => new URLSearchParams(calls.search.value),
}));

const my = {
  workspaceId: 'ws',
  membershipId: 'm-nora',
  name: 'Kafé Nord',
  slug: 'kafe-nord',
  role: 'EMPLOYER',
  showPay: true,
  currency: 'SEK',
  timezone: 'Europe/Stockholm',
  weekStart: 'MONDAY',
} as unknown as MyWorkspace;
vi.mock('@/lib/workspace', async (original) => ({
  ...(await original<typeof Workspace>()),
  useWorkspace: () => viewOf(my),
}));

const summary: MonthSummary = {
  month: '2026-09',
  locked: false,
  currency: 'SEK',
  showPay: true,
  totalHours: 24,
  workingDays: 22,
  members: [
    { membershipId: 'm-maria', name: 'Maria Lind', status: 'ACTIVE', hours: 8, daysWorked: 2 },
    { membershipId: 'm-jonas', name: 'Jonas Berg', status: 'ACTIVE', hours: 16, daysWorked: 2 },
  ],
  weeks: [],
  days: Array.from({ length: 30 }, (_, i) => {
    const worked = i + 1 === 24 || i + 1 === 25;
    return {
      date: parseDate(`2026-09-${String(i + 1).padStart(2, '0')}`),
      hours: worked ? 12 : 0,
      membershipIds: worked ? ['m-maria', 'm-jonas'] : [],
    };
  }),
};

function entry(membershipId: string, name: string, hours: number, startTime: string): Entry {
  return {
    id: `e-${membershipId}`,
    workspaceId: 'ws',
    membershipId,
    memberName: name,
    workDate: parseDate('2026-09-24'),
    hours,
    jobs: [
      {
        id: `j-${membershipId}`,
        hours,
        startTime,
        note: null,
        createdAt: new Date('2026-09-20T10:00:00Z'),
        updatedAt: new Date('2026-09-20T10:00:00Z'),
      },
    ],
    locked: false,
    createdAt: new Date('2026-09-20T10:00:00Z'),
    createdBy: { userId: 'u-nora', name: 'Nora Lind' },
    updatedAt: new Date('2026-09-20T10:00:00Z'),
    updatedBy: { userId: 'u-nora', name: 'Nora Lind' },
    changeCount: 1,
  };
}

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider initial="en">
        <TeamCalendarView />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe('TeamCalendarView', () => {
  beforeEach(() => {
    calls.getMonthSummary.mockReset().mockResolvedValue(summary);
    calls.getWorkspace.mockReset().mockResolvedValue({ weekStart: 'MONDAY', defaultDayHours: 8 });
    calls.listEntries
      .mockReset()
      .mockResolvedValue([
        entry('m-maria', 'Maria Lind', 4, '08:00'),
        entry('m-jonas', 'Jonas Berg', 8, '07:00'),
      ]);
    calls.replace.mockReset();
  });

  it("shows the month's team hours and the picked date's jobs with who did them", async () => {
    renderView();
    expect(await screen.findByText('Whole team, 24 h in September')).toBeTruthy();
    expect(calls.getMonthSummary).toHaveBeenCalledWith({ workspaceId: 'ws', month: '2026-09' });
    const day = screen.getByTestId('team-day');
    expect(within(day).getByText('Thursday 24 September')).toBeTruthy();
    expect(await within(day).findByText('12 h')).toBeTruthy();
    const maria = within(day).getByRole('link', { name: /Maria, 4 h/ });
    expect(maria.getAttribute('href')).toBe('/w/kafe-nord/month?member=m-maria&month=2026-09&day=2026-09-24');
    // Jonas starts first; both jobs are in the past.
    expect(
      within(day)
        .getAllByTestId(/^job-/)
        .map((n) => n.dataset.testid),
    ).toEqual(['job-j-m-jonas', 'job-j-m-maria']);
    expect(within(day).getAllByText('Done')).toHaveLength(2);
  });

  it('picks another date from the calendar', async () => {
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: /^Friday 25 September, Maria, Jonas, 12 h/ }));
    await waitFor(() =>
      expect(calls.replace).toHaveBeenCalledWith('/w/kafe-nord/calendar?month=2026-09&day=2026-09-25', {
        scroll: false,
      }),
    );
  });
});
