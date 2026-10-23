import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DayScreen } from './DayScreen';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import {
  cafeLocation,
  employerMeFixture,
  entryFixture,
  flagFixture,
  jobFixture,
  memberMonthFixture,
  membersFixture,
  workspaceFixture,
} from '@/testing/fixtures';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

const entry = entryFixture('mem-maria', '2026-09-23', 6.5, {
  note: 'Delivery day, stayed to unload.',
  changeCount: 2,
});
const history = [
  {
    id: 'c2',
    entryId: entry.id,
    kind: 'UPDATED' as const,
    hoursBefore: 6,
    hoursAfter: 6.5,
    changedBy: { userId: 'usr_nora', name: 'Nora Lind' },
    changedAt: new Date('2026-09-24T06:12:00Z'),
  },
  {
    id: 'c1',
    entryId: entry.id,
    kind: 'CREATED' as const,
    hoursAfter: 6,
    changedBy: { userId: 'usr_nora', name: 'Nora Lind' },
    changedAt: new Date('2026-09-23T16:40:00Z'),
  },
];

describe('DayScreen', () => {
  beforeEach(() => useAppStore.getState().setActiveWorkspace('ws-cafe'));

  it('employee: one number, the note, the history, and the flag sheet that raises a flag', async () => {
    const api = fakeApi({
      getMe: meFixture,
      listEntries: [entry],
      getEntryHistory: history,
      getWorkspace: workspaceFixture,
      getMemberMonth: memberMonthFixture,
      raiseFlag: {},
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-23" />, { api });
    expect((await screen.findAllByText('6 h 30 min')).length).toBe(2);
    expect(screen.getByText('Edited once')).toBeTruthy();
    expect(screen.getByText('My day')).toBeTruthy();
    expect(screen.getByText('"Delivery day, stayed to unload."')).toBeTruthy();
    expect(screen.getByText('Nora Lind changed 6 h to 6.5 h')).toBeTruthy();
    expect(screen.getByText('Nora Lind logged 6 h')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-flag'));
    expect(await screen.findByText('Flag Wednesday 23 September')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('reason-NOT_IN'));
    await fireEvent.changeText(screen.getByTestId('flag-message'), 'I was off on Wednesday.');
    await fireEvent.press(screen.getByTestId('flag-send'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'raiseFlag')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        entryId: entry.id,
        flagCreate: { reason: 'NOT_IN', message: 'I was off on Wednesday.', suggestedHours: 0 },
      }),
    );
  });

  it('employer: a job card shows its place and time, Edit opens that job and Add another a single job (CHQ-185)', async () => {
    routerState.pushes.length = 0;
    const withPlace = entryFixture('mem-maria', '2026-09-23', 6.5, {
      jobs: [
        jobFixture('job-1', 4.5, { startTime: '09:00', location: cafeLocation, note: 'Counter' }),
        jobFixture('job-2', 2),
      ],
    });
    const api = fakeApi({
      getMe: employerMeFixture,
      getMember: membersFixture[0],
      listEntries: [withPlace],
      getEntryHistory: history,
      getWorkspace: workspaceFixture,
      getMemberMonth: memberMonthFixture,
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-23" />, { api });
    expect(await screen.findByText('6 h 30 min')).toBeTruthy();
    expect(screen.getByText('2 jobs')).toBeTruthy();
    expect(screen.getByText('1 place')).toBeTruthy();
    expect(screen.getByText('09:00 to 13:30, Kungsgatan 12, Stockholm')).toBeTruthy();
    expect(screen.getByTestId('job-directions-job-1')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('job-edit-job-1'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-maria', date: '2026-09-23', mode: 'edit', jobId: 'job-1' },
    });
    await fireEvent.press(screen.getByTestId('day-add-another'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-maria', date: '2026-09-23', mode: 'single' },
    });
  });

  it('employer: an empty day offers a single job on it', async () => {
    routerState.pushes.length = 0;
    const api = fakeApi({
      getMe: employerMeFixture,
      listEntries: [],
      getWorkspace: workspaceFixture,
      getMemberMonth: { ...memberMonthFixture, month: '2026-10', locked: false, days: [] },
      getMember: membersFixture[0],
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-10-07" />, { api });
    expect(await screen.findByText('No jobs on this day')).toBeTruthy();
    await fireEvent.press(await screen.findByTestId('day-add-job'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-maria', date: '2026-10-07', mode: 'single' },
    });
  });

  it('employer: a closed month offers no new job', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      listEntries: [],
      getWorkspace: workspaceFixture,
      getMemberMonth: { ...memberMonthFixture, locked: true },
      getMember: membersFixture[0],
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-20" />, { api });
    expect(await screen.findByTestId('day-locked')).toBeTruthy();
    expect(screen.queryByTestId('day-add-job')).toBeNull();
  });

  it('employer: an open flag shows as a card with the reason, the suggestion and the message, and opens the resolve screen (CHQ-145)', async () => {
    routerState.pushes.length = 0;
    const flagged = entryFixture('mem-maria', '2026-09-17', 2, {
      flag: { id: 'flag-1', status: 'OPEN', reason: 'MORE', suggestedHours: 4 },
    });
    const api = fakeApi({
      getMe: employerMeFixture,
      getMember: membersFixture[0],
      listEntries: [flagged],
      getEntryHistory: [],
      getWorkspace: workspaceFixture,
      getMemberMonth: memberMonthFixture,
      getFlag: flagFixture,
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-17" />, { api });
    expect(await screen.findByTestId('day-open-flag')).toBeTruthy();
    expect(screen.getByText('Flag from Maria')).toBeTruthy();
    expect(screen.getByText('Worked more than logged. Maria says 4 h')).toBeTruthy();
    expect(screen.getByText('"I worked 4 h, not 2. I stayed for the delivery after close."')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('day-resolve-flag'));
    expect(routerState.pushes.at(-1)).toEqual({ pathname: '/flag/[flagId]', params: { flagId: 'flag-1' } });
  });
});

describe('recurring jobs', () => {
  beforeEach(() => useAppStore.getState().setActiveWorkspace('ws-cafe'));
  it('a job card says how its series repeats (CHQ-186)', async () => {
    const series = {
      id: 'series-1',
      firstDate: new Date(2026, 8, 2),
      endDate: new Date(2026, 8, 23),
      lastDate: new Date(2026, 8, 23),
      occurrenceCount: 4,
      stopped: false,
      openEnded: false,
      recurrence: {
        frequency: 'WEEKLY' as const,
        interval: 1,
        weekdays: new Set(['WEDNESDAY' as const]),
        periodCount: 4,
      },
    };
    const api = fakeApi({
      getMe: employerMeFixture,
      getMember: membersFixture[0],
      listEntries: [
        entryFixture('mem-maria', '2026-09-23', 4, {
          jobs: [jobFixture('job-repeat', 4, { recurrence: series })],
        }),
      ],
      getEntryHistory: [],
      getWorkspace: workspaceFixture,
      getMemberMonth: memberMonthFixture,
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-23" />, { api });
    expect(await screen.findByText('Every week on Wed, for 4 weeks')).toBeTruthy();
  });
});

describe('day arrows (CHQ-169)', () => {
  beforeEach(() => useAppStore.getState().setActiveWorkspace('ws-cafe'));
  it('tells the stack which way the day moved, so the new day slides in from that side', async () => {
    const api = fakeApi({
      getMe: meFixture,
      listEntries: [entry],
      getEntryHistory: history,
      getWorkspace: workspaceFixture,
      getMemberMonth: memberMonthFixture,
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-23" />, { api });
    await fireEvent.press(await screen.findByTestId('day-prev'));
    expect(routerState.replaces.at(-1)).toEqual({
      pathname: '/day/[membershipId]/[date]',
      params: { membershipId: 'mem-maria', date: '2026-09-22', step: 'back' },
    });
    await fireEvent.press(screen.getByTestId('day-next'));
    expect(routerState.replaces.at(-1)).toEqual({
      pathname: '/day/[membershipId]/[date]',
      params: { membershipId: 'mem-maria', date: '2026-09-24', step: 'forward' },
    });
  });
});
