import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { Entry, Job } from '@klokka/api-client';
import { PersonScreen } from './PersonScreen';
import MemberRoute from '../../../app/member/[membershipId]';
import { fakeApi, renderApp, type FakeApi } from '@/testing/render';
import {
  cafeLocation,
  employerMeFixture,
  entryFixture,
  jobFixture,
  memberMonthFixture,
  membersFixture,
  workspaceFixture,
} from '@/testing/fixtures';
import { toIsoDate } from '@/lib/dates';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

const entries: Entry[] = [
  entryFixture('mem-maria', '2026-09-22', 4),
  entryFixture('mem-maria', '2026-09-23', 8, { jobs: [jobFixture('job-a', 5), jobFixture('job-b', 3)] }),
  entryFixture('mem-maria', '2026-09-25', 6),
];

function personApi() {
  return fakeApi({
    getMe: employerMeFixture,
    getWorkspace: workspaceFixture,
    getMember: membersFixture[0],
    listEntries: ({ from, to }: { from: Date; to: Date }) =>
      entries.filter((e) => e.workDate >= from && e.workDate <= to),
    getMemberMonth: memberMonthFixture,
    getEntryHistory: [],
  });
}

const ranges = (api: FakeApi) =>
  api.calls
    .filter((c) => c.op === 'listEntries')
    .map((c) => {
      const a = c.args[0] as { from: Date; to: Date; membershipId?: string };
      return `${toIsoDate(a.from)}..${toIsoDate(a.to)} ${a.membershipId ?? 'all'}`;
    });

// One person behind a Day / Week / Month switch (CHQ-171): week first, the date carries over.
describe('PersonScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    routerState.pushes.length = 0;
    routerState.backs = 0;
    routerState.dispatches.length = 0;
    routerState.preventRemove = null;
    routerState.params = {};
  });
  afterEach(() => jest.useRealTimers());

  it("opens on the person's current week, and the arrows step a week", async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api });
    expect(await screen.findByText('Week 39')).toBeTruthy();
    expect(screen.getByTestId('person-week')).toBeTruthy();
    expect(await screen.findByText('Maria Lind')).toBeTruthy();
    expect(ranges(api)).toContain('2026-09-14..2026-09-27 mem-maria');
    await fireEvent.press(screen.getByTestId('week-prev'));
    expect(await screen.findByText('Week 38')).toBeTruthy();
    await waitFor(() => expect(ranges(api)).toContain('2026-09-07..2026-09-20 mem-maria'));
  });

  it('opens a day with jobs as the Day view (where another can be added), and an empty day in the single job editor', async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api });
    await screen.findByText('Maria Lind');
    await fireEvent.press(await screen.findByTestId('day-mem-maria-2026-09-26'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-maria', date: '2026-09-26', mode: 'single' },
    });
    await fireEvent.press(screen.getByTestId('day-mem-maria-2026-09-23'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await waitFor(() => expect(ranges(api)).toContain('2026-09-23..2026-09-23 mem-maria'));
    expect(screen.getByTestId('view-day').props.accessibilityState).toEqual({ checked: true });
  });

  it('opens a day with one job as the Day view, not as an edit of that job', async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api });
    await fireEvent.press(await screen.findByTestId('day-mem-maria-2026-09-22'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    expect(await screen.findByTestId('day-add-another')).toBeTruthy();
  });

  it('switches to the month, and a day in its calendar opens as the Day view', async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api });
    await screen.findByText('Week 39');
    await fireEvent.press(screen.getByTestId('view-month'));
    expect(await screen.findByTestId('member-month-screen')).toBeTruthy();
    expect(api.calls.find((c) => c.op === 'getMemberMonth')?.args[0]).toMatchObject({
      membershipId: 'mem-maria',
      month: '2026-09',
    });
    await fireEvent.press(await screen.findByTestId('cell-2026-09-17'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await waitFor(() => expect(ranges(api)).toContain('2026-09-17..2026-09-17 mem-maria'));
  });

  it('the header opens New job for the person, on today (CHQ-185)', async () => {
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="month" />, { api: personApi() });
    await fireEvent.press(await screen.findByTestId('person-new-job'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-maria', date: '2026-09-25', mode: 'full' },
    });
  });

  it('opens on a given view and date', async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="day" initialDate="2026-09-22" />, {
      api,
    });
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await waitFor(() => expect(ranges(api)).toContain('2026-09-22..2026-09-22 mem-maria'));
  });

  // CHQ-191 item 5: the People list and the Employees list open a person on the month.
  it('opens on the month when no view is given', async () => {
    routerState.params = { membershipId: 'mem-maria' };
    await renderApp(<MemberRoute />, { api: personApi() });
    expect(await screen.findByTestId('member-month-screen')).toBeTruthy();
    expect(screen.getByTestId('view-month').props.accessibilityState).toEqual({ checked: true });
  });

  it('keeps a view given to the route', async () => {
    routerState.params = { membershipId: 'mem-maria', view: 'week' };
    await renderApp(<MemberRoute />, { api: personApi() });
    expect(await screen.findByTestId('person-week')).toBeTruthy();
  });
});

// CHQ-191 item 4: Back from a day returns to the view the date was tapped in, not out of the person.
describe('PersonScreen: Back from a day', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    routerState.pushes.length = 0;
    routerState.backs = 0;
    routerState.dispatches.length = 0;
    routerState.preventRemove = null;
  });
  afterEach(() => jest.useRealTimers());

  it("a month date's day goes Back to the month, on the header button and the phone's gesture alike", async () => {
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="month" />, { api: personApi() });
    await fireEvent.press(await screen.findByTestId('cell-2026-09-17'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    // The header's back button: router.back() asks the stack, the guard answers.
    await fireEvent.press(screen.getByTestId('header-back'));
    expect(await screen.findByTestId('member-month-screen')).toBeTruthy();
    expect(routerState.backs).toBe(0);
    expect(routerState.dispatches).toEqual([]);
    // Again, through the phone's back gesture (the stack's remove event).
    await fireEvent.press(await screen.findByTestId('cell-2026-09-17'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await act(() => routerState.preventRemove?.({ data: { action: { type: 'GO_BACK' } } }));
    expect(await screen.findByTestId('member-month-screen')).toBeTruthy();
    // On the month, Back leaves the person.
    expect(routerState.preventRemove).toBeNull();
    await fireEvent.press(screen.getByTestId('header-back'));
    expect(routerState.backs).toBe(1);
  });

  it("a week line's day goes Back to that week", async () => {
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api: personApi() });
    await fireEvent.press(await screen.findByTestId('day-mem-maria-2026-09-23'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('header-back'));
    expect(await screen.findByTestId('person-week')).toBeTruthy();
    expect(screen.getByText('Week 39')).toBeTruthy();
    expect(routerState.backs).toBe(0);
  });

  it('the day after stepping goes Back to the week of the day shown', async () => {
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api: personApi() });
    await fireEvent.press(await screen.findByTestId('day-mem-maria-2026-09-22'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-prev'));
    await fireEvent.press(screen.getByTestId('day-prev'));
    await fireEvent.press(screen.getByTestId('header-back'));
    expect(await screen.findByText('Week 38')).toBeTruthy();
  });

  it('choosing Day in the switch forgets where it came from, so Back leaves', async () => {
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api: personApi() });
    await fireEvent.press(await screen.findByTestId('day-mem-maria-2026-09-23'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('view-week'));
    await fireEvent.press(screen.getByTestId('view-day'));
    await fireEvent.press(screen.getByTestId('header-back'));
    expect(routerState.backs).toBe(1);
  });

  // Review fix: a whole-stack reset (switching workspace dismisses every screen) is not a Back, so it goes through.
  it('a removal that is not a Back passes through the guard', async () => {
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="month" />, { api: personApi() });
    await fireEvent.press(await screen.findByTestId('cell-2026-09-17'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    await act(() => routerState.preventRemove?.({ data: { action: { type: 'POP_TO_TOP' } } }));
    await act(() =>
      routerState.preventRemove?.({ data: { action: { type: 'POP', payload: { count: 2 } } } }),
    );
    expect(routerState.dispatches).toEqual([{ type: 'POP_TO_TOP' }, { type: 'POP', payload: { count: 2 } }]);
    expect(screen.getByTestId('day-screen')).toBeTruthy();
    // Positive control: a one-screen POP is a Back and returns to the month.
    await act(() =>
      routerState.preventRemove?.({ data: { action: { type: 'POP', payload: { count: 1 } } } }),
    );
    expect(await screen.findByTestId('member-month-screen')).toBeTruthy();
    expect(routerState.dispatches).toHaveLength(2);
  });

  it('removing the person from a day opened in the month leaves the person', async () => {
    const api = personApi();
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="month" />, { api });
    await fireEvent.press(await screen.findByTestId('cell-2026-09-17'));
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    expect(routerState.preventRemove).not.toBeNull();
    await fireEvent.press(screen.getByTestId('member-actions'));
    await fireEvent.press(await screen.findByTestId('action-remove'));
    await fireEvent.press(await screen.findByTestId('remove-confirm'));
    await waitFor(() => expect(routerState.dispatches).toEqual([{ type: 'GO_BACK' }]));
    expect(api.calls.some((c) => c.op === 'removeMember')).toBe(true);
  });

  // The positive control: a day the screen was opened on (a team day chip) leaves as before.
  it('opened on a day, Back leaves the person', async () => {
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="day" initialDate="2026-09-22" />, {
      api: personApi(),
    });
    expect(await screen.findByTestId('day-screen')).toBeTruthy();
    expect(routerState.preventRemove).toBeNull();
    await fireEvent.press(screen.getByTestId('header-back'));
    expect(routerState.backs).toBe(1);
    expect(screen.getByTestId('day-screen')).toBeTruthy();
  });
});

// CHQ-191 item 3: a day's line names its jobs by title, else by place.
describe('PersonScreen: job titles in the lines', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
  });
  afterEach(() => jest.useRealTimers());

  const titled = [
    jobFixture('job-w', 3, { title: 'Window cleaning', location: cafeLocation }),
    jobFixture('job-c', 2, { location: cafeLocation }),
  ];

  it('the week line', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      getMember: membersFixture[0],
      listEntries: [
        entryFixture('mem-maria', '2026-09-22', 3, { jobs: [titled[0] as Job] }),
        entryFixture('mem-maria', '2026-09-23', 5, { jobs: titled }),
      ],
    });
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="week" />, { api });
    expect(await screen.findByText('Window cleaning')).toBeTruthy();
    expect(screen.getByText('2 jobs, Window cleaning, Café Nord')).toBeTruthy();
  });

  it('the month line', async () => {
    const days = memberMonthFixture.days.map((d) =>
      toIsoDate(d.date) === '2026-09-24' ? { ...d, jobs: [titled[0] as Job] } : d,
    );
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      getMember: membersFixture[0],
      getMemberMonth: { ...memberMonthFixture, days },
    });
    await renderApp(<PersonScreen membershipId="mem-maria" initialView="month" />, { api });
    expect(await screen.findByText('Window cleaning')).toBeTruthy();
  });
});
