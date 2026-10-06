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
import { mapsMock, routerState } from '@/testing/nativeMocks';
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

  it('employer: a job card shows its place and time, and Edit opens the sheet with the job', async () => {
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
      deleteJob: undefined,
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-09-23" />, { api });
    expect(await screen.findByText('6 h 30 min')).toBeTruthy();
    expect(screen.getByText('2 jobs')).toBeTruthy();
    expect(screen.getByText('1 place')).toBeTruthy();
    expect(screen.getByText('09:00 to 13:30, Kungsgatan 12, Stockholm')).toBeTruthy();
    expect(screen.getByTestId('job-directions-job-1')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('job-edit-job-1'));
    expect(await screen.findByText('Job for Maria Lind')).toBeTruthy();
    expect(screen.getByText('Save job, 4 h 30 min')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('remove-job'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'deleteJob')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        jobId: 'job-1',
      }),
    );
  });

  it('employer: an empty future day offers a job; the sheet sets a start time and a searched place', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      listEntries: [],
      getWorkspace: workspaceFixture,
      getMemberMonth: { ...memberMonthFixture, month: '2026-10', locked: false, days: [] },
      getMember: membersFixture[0],
      listRecentPlaces: [],
      autocompletePlaces: [
        { placeId: 'place-k12', primaryText: 'Kungsgatan 12', secondaryText: 'Stockholm' },
      ],
      getPlace: cafeLocation,
      createJob: () => entryFixture('mem-maria', '2026-10-07', 4),
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-10-07" />, { api });
    expect(await screen.findByText('No jobs on this day')).toBeTruthy();
    await fireEvent.press(await screen.findByTestId('day-add-job'));
    expect(await screen.findByText('New job for Maria Lind')).toBeTruthy();
    expect(screen.getByText('No start time: Maria gets no reminder for this job.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('job-start'));
    await fireEvent.press(screen.getByTestId('wheel-start-hours-9'));
    await fireEvent.press(screen.getByTestId('start-done'));
    await fireEvent.press(screen.getByTestId('job-location'));
    await fireEvent(screen.getByTestId('place-search'), 'focus');
    await fireEvent.changeText(screen.getByTestId('place-search'), 'Kungs');
    await fireEvent.press(await screen.findByTestId('place-place-k12', {}, { timeout: 2000 }));
    expect(await screen.findByTestId('place-picked')).toBeTruthy();
    expect(screen.getByText('Café Nord')).toBeTruthy();
    // The map flew to the place; that landing is not a drag, so the place keeps its name.
    expect(mapsMock.moves.at(-1)).toEqual({
      coordinates: expect.objectContaining({
        latitude: cafeLocation.latitude,
        longitude: cafeLocation.longitude,
      }),
      zoom: 16,
    });
    await fireEvent.press(screen.getByTestId('place-use'));

    await fireEvent.press(await screen.findByTestId('wheel-hours-4'));
    expect(screen.getByText('Runs 09:00 to 13:00. Maria gets a reminder before it starts.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('save-job'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'createJob')).toBe(true));
    expect(api.calls.find((c) => c.op === 'createJob')?.args[0]).toMatchObject({
      workspaceId: 'ws-cafe',
      membershipId: 'mem-maria',
      jobWrite: { hours: 4, startTime: '09:00', note: null, location: cafeLocation },
    });
    const session = (api.calls.find((c) => c.op === 'autocompletePlaces')?.args[0] as { session: string })
      .session;
    expect(api.calls.find((c) => c.op === 'getPlace')?.args[0]).toEqual({
      workspaceId: 'ws-cafe',
      placeId: 'place-k12',
      session,
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
  it('creates only after the required end preview and sends the finite schedule and retry key', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      listEntries: [],
      getWorkspace: workspaceFixture,
      getMemberMonth: { ...memberMonthFixture, month: '2026-10', locked: false, days: [] },
      getMember: membersFixture[0],
      previewJobRecurrence: {
        dates: [{ date: new Date(2026, 9, 7) }],
        occurrenceCount: 4,
        lastDate: new Date(2026, 9, 28),
        endDate: new Date(2026, 10, 3),
      },
      createJob: () => entryFixture('mem-maria', '2026-10-07', 4),
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-10-07" />, { api });
    await fireEvent.press(await screen.findByTestId('day-add-job'));
    await fireEvent.press(screen.getByTestId('wheel-hours-4'));
    await fireEvent.press(screen.getByTestId('job-repeat'));
    await fireEvent.press(screen.getByTestId('repeat-WEEKLY'));
    expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId('repeat-end-mode-count'));
    await fireEvent.changeText(screen.getByTestId('repeat-count'), '4');
    await waitFor(() =>
      expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled === true).toBe(false),
    );
    await fireEvent.press(screen.getByTestId('repeat-done'));
    await fireEvent.press(screen.getByTestId('save-job'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'createJob')).toBe(true));
    expect(api.calls.find((c) => c.op === 'createJob')?.args[0]).toMatchObject({
      jobWrite: {
        hours: 4,
        requestId: expect.any(String),
        recurrence: { frequency: 'WEEKLY', interval: 1, weekdays: new Set(['WEDNESDAY']), periodCount: 4 },
      },
    });
  });
  it('shows the recurring job and sends future scope only after the employer chooses it', async () => {
    const series = {
      id: 'series-1',
      firstDate: new Date(2026, 9, 7),
      endDate: new Date(2026, 10, 3),
      lastDate: new Date(2026, 9, 28),
      occurrenceCount: 4,
      stopped: false,
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
        entryFixture('mem-maria', '2026-10-07', 4, {
          jobs: [jobFixture('job-repeat', 4, { recurrence: series })],
        }),
      ],
      getEntryHistory: [],
      getWorkspace: workspaceFixture,
      getMemberMonth: { ...memberMonthFixture, locked: false },
      deleteJob: undefined,
    });
    await renderApp(<DayScreen membershipId="mem-maria" date="2026-10-07" />, { api });
    expect(await screen.findByText('Every 1 week: Wed')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('job-edit-job-repeat'));
    await fireEvent.press(screen.getByTestId('remove-job'));
    expect(api.calls.some((c) => c.op === 'deleteJob')).toBe(false);
    await fireEvent.press(screen.getByTestId('scope-THIS_AND_FUTURE'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'deleteJob')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        jobId: 'job-repeat',
        scope: 'THIS_AND_FUTURE',
      }),
    );
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
