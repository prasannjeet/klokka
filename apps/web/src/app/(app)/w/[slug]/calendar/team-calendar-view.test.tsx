// The team calendar (CHQ-171): the month's team hours per date from the summary, and the picked date's jobs
// across the team with who worked how long, and New job on that date (CHQ-191).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseDate, type Entry, type Member, type MonthSummary, type MyWorkspace } from '@klokka/api-client';
import { LocaleProvider } from '@/lib/i18n';
import { viewOf } from '@/lib/workspace';
import type * as Workspace from '@/lib/workspace';
import { TeamCalendarView } from './team-calendar-view';

const calls = vi.hoisted(() => ({
  getMonthSummary: vi.fn(),
  listEntries: vi.fn(),
  listMembers: vi.fn(),
  getWorkspace: vi.fn(),
  replace: vi.fn(),
  search: { value: 'month=2026-09&day=2026-09-24' },
}));
vi.mock('@/lib/api', () => ({
  bffUrl: (path: string) => `/api/k/${path}`,
  api: {
    months: { getMonthSummary: calls.getMonthSummary },
    entries: { listEntries: calls.listEntries },
    members: { listMembers: calls.listMembers },
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

function member(id: string, displayName: string, extra: Partial<Member> = {}): Member {
  return {
    id,
    workspaceId: 'ws',
    displayName,
    email: `${id}@example.com`,
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    invitedAt: new Date('2026-01-01'),
    month: { hours: 0 },
    ...extra,
  } as Member;
}

const TEAM = [
  member('m-nora', 'Nora Lind', { role: 'EMPLOYER' }),
  member('m-maria', 'Maria Lind'),
  member('m-jonas', 'Jonas Berg', { status: 'INVITED' }),
  member('m-old', 'Olle Gammal', { status: 'DEACTIVATED' }),
];

const BACK = '/w/kafe-nord/calendar?month=2026-09&day=2026-09-24';

function editorHref(membershipId: string): string {
  const query = new URLSearchParams({ member: membershipId, date: '2026-09-24', mode: 'single', back: BACK });
  return `/w/kafe-nord/jobs/new?${query.toString()}`;
}

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
    calls.listMembers.mockReset().mockResolvedValue(TEAM);
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

  it("shows the day's team total over 24 h as it is (CHQ-191: a sum, not one day)", async () => {
    calls.listEntries.mockResolvedValue([
      entry('m-maria', 'Maria Lind', 9, '06:00'),
      entry('m-jonas', 'Jonas Berg', 9, '07:00'),
      entry('m-sara', 'Sara Ek', 8.5, '08:00'),
    ]);
    renderView();
    const day = screen.getByTestId('team-day');
    expect(await within(day).findByText('26.5 h')).toBeTruthy();
    expect(within(day).queryByText('24 h')).toBeNull();
  });

  it("heads a job card with the job's title and puts its place on the line under it (CHQ-191)", async () => {
    const titled = entry('m-maria', 'Maria Lind', 4, '08:00');
    titled.jobs = [
      {
        ...titled.jobs[0]!,
        title: 'Window cleaning',
        location: {
          placeId: 'p1',
          name: 'Café Nord',
          address: 'Kungsgatan 12',
          latitude: 59.3,
          longitude: 18,
        },
      },
    ];
    calls.listEntries.mockResolvedValue([titled, entry('m-jonas', 'Jonas Berg', 8, '07:00')]);
    renderView();
    const card = await screen.findByTestId('job-j-m-maria');
    expect(card.querySelector('.job-where b')?.textContent).toBe('Window cleaning');
    expect(card.querySelector('.job-place')?.textContent).toBe('Café Nord');
    // Without a title or a place, as before.
    expect(screen.getByTestId('job-j-m-jonas').querySelector('.job-where b')?.textContent).toBe(
      'No location',
    );
    expect(screen.getByTestId('job-j-m-jonas').querySelector('.job-place')).toBeNull();
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

  it('New job goes straight to the editor for the one person who can have it', async () => {
    calls.listMembers.mockResolvedValue([TEAM[0], TEAM[1], TEAM[3]]);
    renderView();
    const day = screen.getByTestId('team-day');
    const action = await within(day).findByTestId('calendar-new-job');
    expect(action.tagName).toBe('A');
    expect(action.textContent).toBe('New job');
    expect(action.getAttribute('href')).toBe(editorHref('m-maria'));
  });

  it('New job asks who it is for when several people can have it, and leaves out the deactivated', async () => {
    renderView();
    const action = await screen.findByTestId('calendar-new-job');
    expect(action.tagName).toBe('BUTTON');
    fireEvent.click(action);
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByText('Who is the job for?')).toBeTruthy();
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((i) => i.querySelector('b')?.textContent)).toEqual(['Maria Lind', 'Jonas Berg']);
    expect(items.map((i) => i.getAttribute('href'))).toEqual([editorHref('m-maria'), editorHref('m-jonas')]);
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('keeps New job visible but disabled in a closed month, with the reason', async () => {
    calls.getMonthSummary.mockResolvedValue({ ...summary, locked: true });
    renderView();
    const action = (await screen.findByTestId('calendar-new-job')) as HTMLButtonElement;
    expect(action.disabled).toBe(true);
    expect(screen.getByText('September is closed. Unlock it to add or change jobs.')).toBeTruthy();
    expect(action.getAttribute('aria-describedby')).toBe('team-day-locked');
  });

  it('offers the action on an empty day too', async () => {
    calls.listEntries.mockResolvedValue([]);
    renderView();
    const day = screen.getByTestId('team-day');
    expect(await within(day).findByText('No jobs on this day.')).toBeTruthy();
    const add = within(day).getByTestId('calendar-add-job');
    expect(add.textContent).toBe('Add a job');
    fireEvent.click(add);
    expect(await screen.findByRole('menu')).toBeTruthy();
  });

  it('hides the action and says why when nobody can have a job', async () => {
    calls.listMembers.mockResolvedValue([TEAM[0], TEAM[3]]);
    calls.listEntries.mockResolvedValue([]);
    renderView();
    expect(await screen.findByText('Add an employee to plan jobs.')).toBeTruthy();
    expect(screen.queryByTestId('calendar-new-job')).toBeNull();
    expect(screen.queryByTestId('calendar-add-job')).toBeNull();
  });
});
