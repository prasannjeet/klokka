import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Member, MonthSummary } from '@klokka/api-client';
import { TeamCalendarScreen } from './TeamCalendarScreen';
import { TeamDayScreen } from './TeamDayScreen';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import {
  cafeLocation,
  employerMeFixture,
  entryFixture,
  jobFixture,
  membersFixture,
  workspaceFixture,
} from '@/testing/fixtures';
import { fromIsoDate } from '@/lib/dates';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

const summary: MonthSummary = {
  month: '2026-09',
  locked: false,
  currency: 'SEK',
  showPay: true,
  totalHours: 24,
  workingDays: 22,
  members: [
    { membershipId: 'mem-maria', name: 'Maria Lind', status: 'ACTIVE', hours: 8, daysWorked: 2 },
    { membershipId: 'mem-jonas', name: 'Jonas Berg', status: 'ACTIVE', hours: 16, daysWorked: 2 },
    { membershipId: 'mem-ayla', name: 'Ayla Demir', status: 'ACTIVE', hours: 0, daysWorked: 0 },
  ],
  weeks: [],
  days: Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const worked = day === 24 || day === 25;
    return {
      date: fromIsoDate(`2026-09-${String(day).padStart(2, '0')}`),
      hours: worked ? 12 : 0,
      membershipIds: worked ? ['mem-maria', 'mem-jonas'] : [],
    };
  }),
};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
  useAppStore.getState().setActiveWorkspace('ws-cafe');
  routerState.pushes.length = 0;
  routerState.replaces.length = 0;
});
afterEach(() => jest.useRealTimers());

describe('TeamCalendarScreen (CHQ-171)', () => {
  it("shows the month's team hours per date and opens a date's team day", async () => {
    const api = fakeApi({ getMe: employerMeFixture, getMonthSummary: summary });
    await renderApp(<TeamCalendarScreen />, { api });
    expect(await screen.findByText('24 h in September')).toBeTruthy();
    expect(api.calls.find((c) => c.op === 'getMonthSummary')?.args[0]).toEqual({
      workspaceId: 'ws-cafe',
      month: '2026-09',
    });
    // The legend names the people who worked; Ayla has no hours this month.
    expect(screen.getByText('Maria')).toBeTruthy();
    expect(screen.getByText('Jonas')).toBeTruthy();
    expect(screen.queryByText('Ayla')).toBeNull();
    // A screen reader hears who worked the date, not only the dots.
    expect(screen.getByTestId('cell-2026-09-24').props.accessibilityLabel).toMatch(
      /^2026-09-24, Maria, Jonas, 12 h/,
    );
    await fireEvent.press(screen.getByTestId('cell-2026-09-24'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/team-day/[date]',
      params: { date: '2026-09-24' },
    });
    await fireEvent.press(screen.getByTestId('calendar-next'));
    await waitFor(() =>
      expect(api.calls.filter((c) => c.op === 'getMonthSummary').at(-1)?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        month: '2026-10',
      }),
    );
  });
});

describe('TeamDayScreen (CHQ-171)', () => {
  const day = [
    entryFixture('mem-maria', '2026-09-24', 4, { jobs: [jobFixture('job-m', 4, { startTime: '08:00' })] }),
    entryFixture('mem-jonas', '2026-09-24', 8, {
      jobs: [jobFixture('job-j', 8, { startTime: '07:00' })],
      flag: { id: 'flag-9', status: 'OPEN', reason: 'MORE', suggestedHours: 9 },
    }),
  ];

  function dayApi() {
    return fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      listEntries: day,
      listMembers: membersFixture,
      getMonthSummary: summary,
    });
  }

  it("lists every job of the date with who did it, and the team's total", async () => {
    await renderApp(<TeamDayScreen date="2026-09-24" />, { api: dayApi() });
    expect((await screen.findByTestId('team-day-hours')).props.children).toBe('12 h');
    expect(screen.getAllByTestId(/^job-job-/).map((n) => n.props.testID)).toEqual(['job-job-j', 'job-job-m']);
    expect(screen.getByText('Maria, 4 h')).toBeTruthy();
    expect(screen.getByText('Jonas, 8 h')).toBeTruthy();
    // A past day: every job is done.
    expect(screen.getAllByText('Done')).toHaveLength(2);
  });

  // CHQ-191 item 1: the team's day is a sum, so it is not capped at one day's 24 h.
  it('shows a team total over 24 h in full', async () => {
    const long = [
      entryFixture('mem-maria', '2026-09-24', 10),
      entryFixture('mem-jonas', '2026-09-24', 8.5),
      entryFixture('mem-ayla', '2026-09-24', 8),
    ];
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      listEntries: long,
      listMembers: membersFixture,
      getMonthSummary: summary,
    });
    await renderApp(<TeamDayScreen date="2026-09-24" />, { api });
    expect((await screen.findByTestId('team-day-hours')).props.children).toBe('26.5 h');
  });

  it("steps a day sideways, opens a person's day and the open flag", async () => {
    await renderApp(<TeamDayScreen date="2026-09-24" />, { api: dayApi() });
    await screen.findByText('Maria, 4 h');
    await fireEvent.press(screen.getByTestId('team-day-prev'));
    expect(routerState.replaces.at(-1)).toEqual({
      pathname: '/team-day/[date]',
      params: { date: '2026-09-23', step: 'back' },
    });
    await fireEvent.press(screen.getByTestId('team-day-person-mem-maria'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/member/[membershipId]',
      params: { membershipId: 'mem-maria', view: 'day', date: '2026-09-24' },
    });
    await fireEvent.press(screen.getByTestId('team-day-flag-entry-mem-jonas-2026-09-24'));
    expect(routerState.pushes.at(-1)).toEqual({ pathname: '/flag/[flagId]', params: { flagId: 'flag-9' } });
  });

  it('edits a job in the job editor', async () => {
    await renderApp(<TeamDayScreen date="2026-09-24" />, { api: dayApi() });
    await screen.findByText('Maria, 4 h');
    await fireEvent.press(screen.getByTestId('job-edit-job-m'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-maria', date: '2026-09-24', mode: 'edit', jobId: 'job-m' },
    });
  });

  it('says so on a day without jobs', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      listEntries: [],
      listMembers: membersFixture,
      getMonthSummary: summary,
    });
    await renderApp(<TeamDayScreen date="2026-09-27" />, { api });
    expect(await screen.findByText('No jobs on this day.')).toBeTruthy();
  });

  // CHQ-191 item 3: a job's title is its heading, the place the line under it.
  it('heads a job with its title and names the place under it', async () => {
    const titled = [
      entryFixture('mem-maria', '2026-09-24', 4, {
        jobs: [jobFixture('job-t', 4, { title: 'Window cleaning', location: cafeLocation })],
      }),
      entryFixture('mem-jonas', '2026-09-24', 2, {
        jobs: [jobFixture('job-p', 2, { location: cafeLocation })],
      }),
    ];
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      listEntries: titled,
      listMembers: membersFixture,
      getMonthSummary: summary,
    });
    await renderApp(<TeamDayScreen date="2026-09-24" />, { api });
    expect((await screen.findByTestId('job-label-job-t')).props.children).toBe('Window cleaning');
    expect(screen.getByTestId('job-place-job-t').props.children).toBe('Café Nord');
    // Without a title the place is the heading, as before, and is not repeated.
    expect(screen.getByTestId('job-label-job-p').props.children).toBe('Café Nord');
    expect(screen.queryByTestId('job-place-job-p')).toBeNull();
  });
});

// CHQ-191 item 2: the employer plans a single job from the team day.
describe('TeamDayScreen: new job (CHQ-191)', () => {
  const employer: Member = {
    ...(membersFixture[0] as Member),
    id: 'mem-nora',
    role: 'EMPLOYER',
    displayName: 'Nora Lind',
  };
  const deactivated: Member = { ...(membersFixture[1] as Member), status: 'DEACTIVATED' };
  const day = [entryFixture('mem-maria', '2026-09-24', 4)];

  function planApi(members: Member[], extra: Record<string, unknown> = {}) {
    return fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      listEntries: day,
      listMembers: members,
      getMonthSummary: summary,
      ...extra,
    });
  }

  it('with one person who can take it, opens the single job editor for them on the date', async () => {
    await renderApp(<TeamDayScreen date="2026-09-24" />, {
      api: planApi([employer, membersFixture[0] as Member, deactivated]),
    });
    await fireEvent.press(await screen.findByTestId('team-day-new-job'));
    expect(screen.queryByTestId('pick-person-sheet')).toBeNull();
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-maria', date: '2026-09-24', mode: 'single' },
    });
  });

  it('with several, asks who the job is for: employees only, never a deactivated one', async () => {
    await renderApp(<TeamDayScreen date="2026-09-24" />, {
      api: planApi([employer, membersFixture[0] as Member, deactivated, ...membersFixture.slice(2)]),
    });
    await fireEvent.press(await screen.findByTestId('team-day-new-job'));
    expect(await screen.findByText('Who is the job for?')).toBeTruthy();
    expect(screen.getAllByTestId(/^pick-person-mem-/).map((n) => n.props.testID)).toEqual([
      'pick-person-mem-maria',
      'pick-person-mem-ayla',
      'pick-person-mem-sam',
    ]);
    expect(screen.getByText('Ayla Demir')).toBeTruthy();
    expect(routerState.pushes).toEqual([]);
    await fireEvent.press(screen.getByTestId('pick-person-mem-ayla'));
    expect(screen.queryByTestId('pick-person-sheet')).toBeNull();
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-ayla', date: '2026-09-24', mode: 'single' },
    });
  });

  it('closing the sheet without a pick opens nothing', async () => {
    await renderApp(<TeamDayScreen date="2026-09-24" />, { api: planApi(membersFixture) });
    await fireEvent.press(await screen.findByTestId('team-day-new-job'));
    await fireEvent.press(await screen.findByTestId('sheet-close'));
    expect(screen.queryByTestId('pick-person-sheet')).toBeNull();
    expect(routerState.pushes).toEqual([]);
  });

  it('an empty day offers Add a job, which does the same', async () => {
    await renderApp(<TeamDayScreen date="2026-09-27" />, {
      api: planApi([employer, membersFixture[2] as Member], { listEntries: [] }),
    });
    expect(await screen.findByText('No jobs on this day.')).toBeTruthy();
    await fireEvent.press(await screen.findByTestId('team-day-add-job'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-ayla', date: '2026-09-27', mode: 'single' },
    });
  });

  it('a closed month keeps the action in view, disabled, and says why', async () => {
    await renderApp(<TeamDayScreen date="2026-09-27" />, {
      api: planApi(membersFixture, { listEntries: [], getMonthSummary: { ...summary, locked: true } }),
    });
    expect(await screen.findByText('September is closed. Unlock it to add or change jobs.')).toBeTruthy();
    const action = screen.getByTestId('team-day-new-job');
    expect(action.props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(action);
    expect(routerState.pushes).toEqual([]);
    expect(screen.queryByTestId('pick-person-sheet')).toBeNull();
    expect(screen.queryByTestId('team-day-add-job')).toBeNull();
  });

  it('with nobody to plan for, hides the action and says why', async () => {
    await renderApp(<TeamDayScreen date="2026-09-27" />, {
      api: planApi([employer, deactivated], { listEntries: [] }),
    });
    expect(await screen.findByText('Add an employee to plan jobs.')).toBeTruthy();
    expect(screen.queryByTestId('team-day-new-job')).toBeNull();
    expect(screen.queryByTestId('team-day-add-job')).toBeNull();
  });

  it('with nobody to plan for, says so on a day with jobs too', async () => {
    await renderApp(<TeamDayScreen date="2026-09-24" />, { api: planApi([employer, deactivated]) });
    expect(await screen.findByText('Maria, 4 h')).toBeTruthy();
    expect(screen.getByTestId('team-day-no-eligible')).toBeTruthy();
    expect(screen.getByText('Add an employee to plan jobs.')).toBeTruthy();
    expect(screen.queryByTestId('team-day-new-job')).toBeNull();
  });

  it('keeps New job away until the month is known, so it is never live in a closed month', async () => {
    let answer: (value: unknown) => void = () => undefined;
    const pending = new Promise((resolve) => {
      answer = resolve;
    });
    await renderApp(<TeamDayScreen date="2026-09-24" />, {
      api: planApi(membersFixture, { getMonthSummary: () => pending }),
    });
    expect(await screen.findByText('Maria, 4 h')).toBeTruthy();
    expect(screen.queryByTestId('team-day-new-job')).toBeNull();
    expect(screen.queryByTestId('team-day-no-eligible')).toBeNull();
    await act(async () => answer({ ...summary, locked: true }));
    const action = await screen.findByTestId('team-day-new-job');
    expect(action.props.accessibilityState).toEqual({ disabled: true });
  });

  it('an employee sees no action', async () => {
    await renderApp(<TeamDayScreen date="2026-09-24" />, {
      api: planApi(membersFixture, { getMe: meFixture }),
    });
    expect(await screen.findByText('Maria, 4 h')).toBeTruthy();
    expect(screen.queryByTestId('team-day-new-job')).toBeNull();
  });
});
