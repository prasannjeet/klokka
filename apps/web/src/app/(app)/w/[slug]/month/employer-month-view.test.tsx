// The Employee view's month tile (CHQ-191 item 1): "so far, planned" are month sums, never capped at "24 h".
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  parseDate,
  type Member,
  type MemberMonth,
  type MemberMonthDay,
  type MyWorkspace,
} from '@klokka/api-client';
import { ToastProvider } from '@/components/toast';
import { LocaleProvider } from '@/lib/i18n';
import type * as Workspace from '@/lib/workspace';
import { EmployerMonthView } from './employer-month-view';

const calls = vi.hoisted(() => ({ getMemberMonth: vi.fn(), listMembers: vi.fn() }));
vi.mock('@/lib/api', () => ({
  bffUrl: (path: string) => `/api/k/${path}`,
  api: {
    insights: { getMemberMonth: calls.getMemberMonth },
    members: { listMembers: calls.listMembers },
    months: {
      getMonth: async () => ({
        month: '2026-10',
        locked: false,
        workingDays: 22,
        daysInMonth: 31,
        entryCount: 9,
      }),
    },
    workspaces: { getWorkspace: async () => ({ weekStart: 'MONDAY', defaultDayHours: 8 }) },
    entries: { getEntryHistory: async () => [] },
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/w/stadminator/month',
  useSearchParams: () => new URLSearchParams('member=m-linkon'),
}));

const my = {
  workspaceId: 'ws',
  membershipId: 'm-owner',
  name: 'Städminator',
  slug: 'stadminator',
  role: 'EMPLOYER',
  showPay: false,
  currency: 'SEK',
  timezone: 'Europe/Stockholm',
  weekStart: 'MONDAY',
} as unknown as MyWorkspace;
vi.mock('@/lib/workspace', async (original) => {
  const actual = await original<typeof Workspace>();
  return { ...actual, useWorkspace: () => actual.viewOf(my) };
});

const member = {
  id: 'm-linkon',
  workspaceId: 'ws',
  displayName: 'Md Linkon',
  email: 'linkon@example.com',
  role: 'EMPLOYEE',
  status: 'ACTIVE',
  invitedAt: new Date('2026-01-01'),
  month: { hours: 63.25 },
} as unknown as Member;

const days: MemberMonthDay[] = Array.from({ length: 31 }, (_, i) => {
  const n = i + 1;
  const hours = n <= 7 ? 8 : n === 8 ? 4.25 : n === 24 ? 3 : null;
  return {
    date: parseDate(`2026-10-${String(n).padStart(2, '0')}`),
    weekday: 'MONDAY',
    workingDay: true,
    changeCount: hours === null ? 0 : 1,
    hours,
    jobs: [],
  } as unknown as MemberMonthDay;
});

const month: MemberMonth = {
  membershipId: 'm-linkon',
  workspaceId: 'ws',
  name: 'Md Linkon',
  month: '2026-10',
  locked: false,
  currency: 'SEK',
  showPay: false,
  days,
  totalHours: 63.25,
  plannedHours: 3,
  daysWorked: 8,
  workingDays: 22,
  avgPerWorkingDay: 2.74,
  lastMonthHours: 0,
  vsLastMonthHours: 63.25,
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
  calls.listMembers.mockReset().mockResolvedValue([member]);
});

describe('EmployerMonthView', () => {
  it('shows the hours so far and planned as month sums, not a one-day cap', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LocaleProvider initial="en">
          <ToastProvider>
            <EmployerMonthView />
          </ToastProvider>
        </LocaleProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText('60.25 h so far, 3 h planned')).toBeTruthy();
    expect(calls.getMemberMonth).toHaveBeenCalledWith({
      workspaceId: 'ws',
      membershipId: 'm-linkon',
      month: '2026-10',
    });
  });
});
