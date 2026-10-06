import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { MonthSummary } from '@klokka/api-client';
import { TeamCalendarScreen } from './TeamCalendarScreen';
import { TeamDayScreen } from './TeamDayScreen';
import { fakeApi, renderApp } from '@/testing/render';
import { employerMeFixture, entryFixture, jobFixture, workspaceFixture } from '@/testing/fixtures';
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
    return fakeApi({ getMe: employerMeFixture, getWorkspace: workspaceFixture, listEntries: day });
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

  it('edits a job in the job sheet', async () => {
    await renderApp(<TeamDayScreen date="2026-09-24" />, { api: dayApi() });
    await screen.findByText('Maria, 4 h');
    await fireEvent.press(screen.getByTestId('job-edit-job-m'));
    expect(await screen.findByText('Job for Maria Lind')).toBeTruthy();
  });

  it('says so on a day without jobs', async () => {
    const api = fakeApi({ getMe: employerMeFixture, getWorkspace: workspaceFixture, listEntries: [] });
    await renderApp(<TeamDayScreen date="2026-09-27" />, { api });
    expect(await screen.findByText('No jobs on this day.')).toBeTruthy();
  });
});
