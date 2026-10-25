// The employee's own month with insights off (CHQ-191 item 1): the hero is the month's real total, never capped at
// "24 h" (a sum of jobs is not one day), and the "so far, planned" line too.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDate, type MemberMonth, type MemberMonthDay, type MyWorkspace } from '@klokka/api-client';
import { LocaleProvider } from '@/lib/i18n';
import type * as Workspace from '@/lib/workspace';
import { EmployeeMonth } from './employee-month';
import { ToastProvider } from './toast';

const calls = vi.hoisted(() => ({ getMemberMonth: vi.fn(), getMemberInsights: vi.fn() }));
vi.mock('@/lib/api', () => ({
  bffUrl: (path: string) => `/api/k/${path}`,
  api: {
    insights: { getMemberMonth: calls.getMemberMonth, getMemberInsights: calls.getMemberInsights },
    workspaces: { getWorkspace: async () => ({ weekStart: 'MONDAY', defaultDayHours: 8 }) },
    entries: { getEntryHistory: async () => [] },
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/w/stadminator',
  useSearchParams: () => new URLSearchParams(''),
}));

const my = {
  workspaceId: 'ws',
  membershipId: 'm-linkon',
  name: 'Städminator',
  slug: 'stadminator',
  role: 'EMPLOYEE',
  showPay: false,
  currency: 'SEK',
  timezone: 'Europe/Stockholm',
  weekStart: 'MONDAY',
  employeesSeeInsights: false,
  employerName: 'Nora Lind',
} as unknown as MyWorkspace;
vi.mock('@/lib/workspace', async (original) => {
  const actual = await original<typeof Workspace>();
  return { ...actual, useWorkspace: () => actual.viewOf(my) };
});

function job(id: string, hours: number) {
  return { id, hours, startTime: null, note: null, createdAt: new Date(), updatedAt: new Date() };
}

// 1 to 7 October 8 h a day, 8 October 4.25 h: 60.25 h so far; a 3 h job planned on 24 October (today is the 20th).
function days(): MemberMonthDay[] {
  return Array.from({ length: 31 }, (_, i) => {
    const n = i + 1;
    const hours = n <= 7 ? 8 : n === 8 ? 4.25 : n === 24 ? 3 : null;
    return {
      date: parseDate(`2026-10-${String(n).padStart(2, '0')}`),
      weekday: 'MONDAY',
      workingDay: true,
      changeCount: hours === null ? 0 : 1,
      entryId: hours === null ? null : `e${n}`,
      hours,
      note: null,
      jobs: hours === null ? [] : [job(`j${n}`, hours)],
    } as MemberMonthDay;
  });
}

const month: MemberMonth = {
  membershipId: 'm-linkon',
  workspaceId: 'ws',
  name: 'Md Linkon',
  month: '2026-10',
  locked: false,
  currency: 'SEK',
  showPay: false,
  days: days(),
  totalHours: 63.25,
  plannedHours: 3,
  daysWorked: 8,
  workingDays: 22,
  avgPerWorkingDay: 0,
  lastMonthHours: 0,
  vsLastMonthHours: 0,
  weeks: [],
  daysWithNote: 0,
  openFlags: 0,
};

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T10:00:00Z'));
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  calls.getMemberMonth.mockReset().mockResolvedValue(month);
  calls.getMemberInsights.mockReset();
});

describe('EmployeeMonth with insights off', () => {
  it('shows the real month total and the planned hours, not a one-day cap', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LocaleProvider initial="en">
          <ToastProvider>
            <EmployeeMonth />
          </ToastProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('60.25 h so far, 3 h planned')).toBeTruthy();
    const hero = screen.getByText('Hours in October, so far').closest('.me-hero') as HTMLElement;
    expect(hero.querySelector('.val')?.textContent).toBe('60.25 h');
    expect(screen.queryByText('24 h')).toBeNull();
    expect(calls.getMemberInsights).not.toHaveBeenCalled();
  });
});
