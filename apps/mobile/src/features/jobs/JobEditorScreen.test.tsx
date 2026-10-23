import { Alert, type AlertButton } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { JobRecurrence, JobRecurrencePreviewRequest } from '@klokka/api-client';
import { JobEditorScreen } from './JobEditorScreen';
import { fakeApi, renderApp } from '@/testing/render';
import {
  cafeLocation,
  employerMeFixture,
  entryFixture,
  jobFixture,
  membersFixture,
  workspaceFixture,
} from '@/testing/fixtures';
import { mapsMock, routerState } from '@/testing/nativeMocks';
import { fromIsoDate, toIsoDate } from '@/lib/dates';
import { useAppStore } from '@/store/appStore';

// Today is Friday 25 September 2026 in these tests.
function editorApi(answers: Record<string, unknown> = {}) {
  return fakeApi({
    getMe: employerMeFixture,
    getWorkspace: workspaceFixture,
    getMember: membersFixture[0],
    listEntries: [],
    createJob: () => entryFixture('mem-maria', '2026-09-28', 4),
    updateJob: () => entryFixture('mem-maria', '2026-10-07', 4),
    ...answers,
  });
}

let alerts: { title: string; message?: string; buttons: AlertButton[] }[] = [];

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
  useAppStore.getState().setActiveWorkspace('ws-cafe');
  routerState.backs = 0;
  routerState.dispatches.length = 0;
  routerState.preventRemove = null;
  alerts = [];
  jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
    alerts.push({ title, ...(message ? { message } : {}), buttons: buttons ?? [] });
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const press = (label: string) =>
  alerts
    .at(-1)
    ?.buttons.find((b) => b.text === label)
    ?.onPress?.();

describe('JobEditorScreen: modes (CHQ-185)', () => {
  it('a single job: its own title and subtitle, no date and no repeat', async () => {
    await renderApp(<JobEditorScreen membershipId="mem-maria" date="2026-09-28" mode="single" />, {
      api: editorApi(),
    });
    expect(await screen.findByText('New single job for Maria Lind')).toBeTruthy();
    expect(screen.getByText('Monday, 28 September 2026, does not repeat')).toBeTruthy();
    expect(screen.getByTestId('job-location')).toBeTruthy();
    expect(screen.queryByTestId('job-date')).toBeNull();
    expect(screen.queryByTestId('job-repeat')).toBeNull();
  });

  it('New job: a date (today by default) and a repeat, which a past date takes away', async () => {
    await renderApp(<JobEditorScreen membershipId="mem-maria" date="2026-09-25" mode="full" />, {
      api: editorApi(),
    });
    expect(await screen.findByText('New job for Maria Lind')).toBeTruthy();
    expect(screen.getByTestId('job-date')).toBeTruthy();
    expect(screen.getByTestId('job-repeat')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('job-date'));
    await fireEvent.press(screen.getByTestId('job-date-day-24'));
    await fireEvent.press(screen.getByTestId('date-done'));
    expect(screen.getByTestId('job-date')).toHaveTextContent(/Thursday, 24 September 2026/);
    expect(screen.queryByTestId('job-repeat')).toBeNull();
  });

  it('says so when the job to edit is gone', async () => {
    await renderApp(
      <JobEditorScreen membershipId="mem-maria" date="2026-09-28" mode="edit" jobId="job-gone" />,
      { api: editorApi() },
    );
    expect(await screen.findByText('This job no longer exists.')).toBeTruthy();
  });
});

describe('JobEditorScreen: leaving (CHQ-185)', () => {
  it('an untouched form leaves without asking', async () => {
    await renderApp(<JobEditorScreen membershipId="mem-maria" date="2026-09-28" mode="single" />, {
      api: editorApi(),
    });
    await fireEvent.press(await screen.findByTestId('job-cancel'));
    expect(alerts).toEqual([]);
    expect(routerState.backs).toBe(1);
  });

  it('typed changes ask first: Keep editing stays with the text, Discard leaves', async () => {
    await renderApp(<JobEditorScreen membershipId="mem-maria" date="2026-09-28" mode="single" />, {
      api: editorApi(),
    });
    await fireEvent.changeText(await screen.findByTestId('entry-note'), 'Bring the keys');
    await fireEvent.press(screen.getByTestId('job-cancel'));
    expect(alerts.at(-1)).toMatchObject({
      title: 'Discard changes?',
      message: 'What you entered for this job will be lost.',
    });
    expect(routerState.backs).toBe(0);
    press('Keep editing');
    expect(screen.getByTestId('entry-note').props.value).toBe('Bring the keys');
    expect(routerState.backs).toBe(0);
    await fireEvent.press(screen.getByTestId('job-cancel'));
    press('Discard');
    expect(routerState.dispatches).toEqual([{ type: 'GO_BACK' }]);
    expect(routerState.backs).toBe(1);
  });

  it('back on a step returns to the job instead of leaving', async () => {
    await renderApp(<JobEditorScreen membershipId="mem-maria" date="2026-09-28" mode="single" />, {
      api: editorApi(),
    });
    await fireEvent.press(await screen.findByTestId('job-start'));
    expect(screen.getByTestId('wheel-start-hours')).toBeTruthy();
    // The phone's back button: the stack asks the guard.
    routerState.preventRemove?.({ data: { action: { type: 'GO_BACK' } } });
    expect(await screen.findByTestId('job-location')).toBeTruthy();
    expect(alerts).toEqual([]);
    expect(routerState.backs).toBe(0);
  });
});

describe('JobEditorScreen: saving', () => {
  it('a chip and the minutes wheel set the time, Save creates the job and leaves', async () => {
    const api = editorApi();
    await renderApp(<JobEditorScreen membershipId="mem-maria" date="2026-09-28" mode="single" />, { api });
    await screen.findByText('New single job for Maria Lind');
    expect(screen.getByText('Choose the time first')).toBeTruthy();
    expect(screen.getByText('Full day, 7 h 30 min')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chip-4'));
    expect(screen.getByText('Save job, 4 h')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('wheel-minutes-30'));
    expect(screen.getByText('Save job, 4 h 30 min')).toBeTruthy();
    expect(screen.getByText('Saved as 4.5 h')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('save-job'));
    await waitFor(() => expect(routerState.backs).toBe(1));
    expect(api.calls.find((c) => c.op === 'createJob')?.args[0]).toEqual({
      workspaceId: 'ws-cafe',
      membershipId: 'mem-maria',
      date: fromIsoDate('2026-09-28'),
      jobWrite: { hours: 4.5, startTime: null, note: null },
    });
    expect(alerts).toEqual([]);
  });

  it('offers only the minutes the rounding allows, and 24 h has no minutes', async () => {
    const api = editorApi();
    await renderApp(<JobEditorScreen membershipId="mem-maria" date="2026-09-28" mode="single" />, { api });
    await screen.findByText('New single job for Maria Lind');
    // Half-hour rounding: the minutes wheel is 00 and 30, nothing in between.
    expect(screen.queryByTestId('wheel-minutes-15')).toBeNull();
    await fireEvent.press(screen.getByTestId('wheel-hours-23'));
    await fireEvent.press(screen.getByTestId('wheel-minutes-30'));
    expect(screen.getByText('Save job, 23 h 30 min')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('wheel-hours-24'));
    expect(screen.queryByTestId('wheel-minutes-30')).toBeNull();
    await fireEvent.press(screen.getByTestId('job-header-save'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'createJob')).toBe(true));
    expect(
      (api.calls.find((c) => c.op === 'createJob')?.args[0] as { jobWrite: { hours: number } }).jobWrite
        .hours,
    ).toBe(24);
  });

  it('sets a start time and a searched place', async () => {
    const api = editorApi({
      listRecentPlaces: [],
      autocompletePlaces: [
        { placeId: 'place-k12', primaryText: 'Kungsgatan 12', secondaryText: 'Stockholm' },
      ],
      getPlace: cafeLocation,
    });
    await renderApp(<JobEditorScreen membershipId="mem-maria" date="2026-10-07" mode="single" />, { api });
    expect(await screen.findByText('No start time: Maria gets no reminder for this job.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('job-start'));
    await fireEvent.press(screen.getByTestId('wheel-start-hours-9'));
    await fireEvent.press(screen.getByTestId('start-done'));
    await fireEvent.press(screen.getByTestId('job-location'));
    await fireEvent(screen.getByTestId('place-search'), 'focus');
    await fireEvent.changeText(screen.getByTestId('place-search'), 'Kungs');
    await fireEvent.press(await screen.findByTestId('place-place-k12', {}, { timeout: 2000 }));
    expect(await screen.findByTestId('place-picked')).toBeTruthy();
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
      jobWrite: { hours: 4, startTime: '09:00', note: null, location: cafeLocation },
    });
  });

  it('New job with a weekly repeat sends the schedule and a retry key, no end date by default', async () => {
    const api = editorApi({
      previewJobRecurrence: {
        dates: [{ date: fromIsoDate('2026-09-30') }],
        occurrenceCount: 52,
        lastDate: fromIsoDate('2027-09-29'),
        endDate: fromIsoDate('2027-09-30'),
      },
    });
    await renderApp(<JobEditorScreen membershipId="mem-maria" date="2026-09-30" mode="full" />, { api });
    await fireEvent.press(await screen.findByTestId('wheel-hours-4'));
    await fireEvent.press(screen.getByTestId('job-repeat'));
    await fireEvent.press(screen.getByTestId('repeat-WEEKLY'));
    await waitFor(() =>
      expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled === true).toBe(false),
    );
    expect(screen.getByText('Every week on Wed, from 30 September 2026, no end date')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('repeat-done'));
    expect(screen.getByText('Every week on Wed, from 30 September 2026, no end date')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('save-job'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'createJob')).toBe(true));
    const body = (
      api.calls.find((c) => c.op === 'createJob')?.args[0] as { jobWrite: Record<string, unknown> }
    ).jobWrite;
    expect(body).toMatchObject({
      hours: 4,
      requestId: expect.any(String),
      recurrence: { frequency: 'WEEKLY', interval: 1, weekdays: new Set(['WEDNESDAY']) },
    });
    expect(body.recurrence).not.toHaveProperty('endDate');
    expect(body.recurrence).not.toHaveProperty('periodCount');
  });
});

const series: JobRecurrence = {
  id: 'series-1',
  firstDate: fromIsoDate('2026-08-07'),
  endDate: fromIsoDate('2027-10-07'),
  lastDate: fromIsoDate('2027-10-07'),
  occurrenceCount: 15,
  stopped: false,
  openEnded: true,
  recurrence: {
    frequency: 'MONTHLY',
    interval: 1,
    monthlyBy: 'DAY_OF_MONTH',
    dayOfMonth: 7,
    lastDayOfMonth: false,
  },
};

function seriesApi(answers: Record<string, unknown> = {}) {
  return editorApi({
    listEntries: [
      entryFixture('mem-maria', '2026-10-07', 4, {
        jobs: [jobFixture('job-repeat', 4, { recurrence: series })],
      }),
    ],
    getJobScopeCounts: {
      onlyThis: { jobs: 1, skippedClosed: 0 },
      thisAndFuture: { jobs: 13, skippedClosed: 0 },
      all: { jobs: 14, skippedClosed: 1 },
    },
    previewJobRecurrence: {
      dates: [{ date: fromIsoDate('2026-10-07') }],
      occurrenceCount: 13,
      lastDate: fromIsoDate('2027-10-06'),
      endDate: fromIsoDate('2027-10-07'),
    },
    deleteJob: undefined,
    ...answers,
  });
}

describe('JobEditorScreen: a recurring job (CHQ-187)', () => {
  const edit = <JobEditorScreen membershipId="mem-maria" date="2026-10-07" mode="edit" jobId="job-repeat" />;

  it('a changed field asks which jobs, with the counts, and saves the chosen range', async () => {
    const api = seriesApi();
    await renderApp(edit, { api });
    expect(await screen.findByText('Job for Maria Lind')).toBeTruthy();
    expect(screen.getByText('Every month on day 7, from 7 August 2026, no end date')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chip-8'));
    await fireEvent.press(screen.getByTestId('save-job'));
    expect(await screen.findByText('Only this job')).toBeTruthy();
    expect(screen.getByText('This and the 12 following jobs')).toBeTruthy();
    expect(screen.getByText('All 14 jobs in the series')).toBeTruthy();
    expect(screen.getByText('1 in a closed month stays unchanged')).toBeTruthy();
    expect(screen.getByText('Save changes to 1 job')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('scope-ALL'));
    expect(screen.getByText('Save changes to 14 jobs')).toBeTruthy();
    expect(api.calls.some((c) => c.op === 'updateJob')).toBe(false);
    await fireEvent.press(screen.getByTestId('scope-confirm'));
    await waitFor(() => expect(routerState.backs).toBe(1));
    expect(api.calls.find((c) => c.op === 'updateJob')?.args[0]).toEqual({
      workspaceId: 'ws-cafe',
      jobId: 'job-repeat',
      scope: 'ALL',
      jobWrite: { hours: 8, startTime: null, note: null },
    });
  });

  it('a changed schedule offers only this and the following jobs, and sends the rule with its retry key', async () => {
    const api = seriesApi();
    await renderApp(edit, { api });
    await fireEvent.press(await screen.findByTestId('job-repeat'));
    expect(screen.queryByTestId('repeat-once')).toBeNull();
    await fireEvent.press(screen.getByTestId('repeat-by-WEEKDAY_OF_MONTH'));
    await waitFor(() =>
      expect(screen.getByTestId('repeat-done').props.accessibilityState.disabled === true).toBe(false),
    );
    await fireEvent.press(screen.getByTestId('repeat-done'));
    expect(
      screen.getByText('Every month on the first Wednesday, from 7 October 2026, no end date'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByTestId('save-job'));
    expect(await screen.findByTestId('scope-THIS_AND_FUTURE')).toBeTruthy();
    expect(screen.queryByTestId('scope-ONLY_THIS')).toBeNull();
    expect(screen.queryByTestId('scope-ALL')).toBeNull();
    expect(screen.getByTestId('scope-schedule-from')).toHaveTextContent(
      'The new schedule starts Wednesday, 7 October 2026. Earlier jobs keep their dates.',
    );
    // The new schedule writes its own jobs, so the old series' count is not shown.
    expect(screen.getByText('This and the following jobs')).toBeTruthy();
    expect(screen.queryByText('This and the 12 following jobs')).toBeNull();
    await fireEvent.press(screen.getByTestId('scope-confirm'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'updateJob')).toBe(true));
    expect(api.calls.find((c) => c.op === 'updateJob')?.args[0]).toEqual({
      workspaceId: 'ws-cafe',
      jobId: 'job-repeat',
      scope: 'THIS_AND_FUTURE',
      jobWrite: {
        hours: 4,
        startTime: null,
        note: null,
        requestId: expect.any(String),
        recurrence: {
          frequency: 'MONTHLY',
          interval: 1,
          monthlyBy: 'WEEKDAY_OF_MONTH',
          weekOfMonth: 'FIRST',
          weekday: 'WEDNESDAY',
        },
      },
    });
  });

  it('a schedule change from a past job previews on its rhythm, with the dates from today', async () => {
    const api = seriesApi({
      listEntries: [
        entryFixture('mem-maria', '2026-09-16', 4, {
          jobs: [jobFixture('job-repeat', 4, { recurrence: series })],
        }),
      ],
    });
    await renderApp(
      <JobEditorScreen membershipId="mem-maria" date="2026-09-16" mode="edit" jobId="job-repeat" />,
      { api },
    );
    await fireEvent.press(await screen.findByTestId('job-repeat'));
    await fireEvent.press(screen.getByTestId('repeat-by-WEEKDAY_OF_MONTH'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'previewJobRecurrence')).toBe(true));
    const call = api.calls.filter((c) => c.op === 'previewJobRecurrence').at(-1);
    const preview = (call?.args[0] as { jobRecurrencePreviewRequest: JobRecurrencePreviewRequest })
      .jobRecurrencePreviewRequest;
    expect(toIsoDate(preview.firstDate)).toBe('2026-09-16');
    expect(preview.fromDate && toIsoDate(preview.fromDate)).toBe('2026-09-25');
  });

  it('removing the whole series asks a second time', async () => {
    const api = seriesApi();
    await renderApp(edit, { api });
    await fireEvent.press(await screen.findByTestId('remove-job'));
    await fireEvent.press(await screen.findByTestId('scope-ALL'));
    expect(screen.getByText('Remove 14 jobs')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('scope-confirm'));
    expect(alerts.at(-1)).toMatchObject({
      title: 'Remove 14 jobs',
      message: 'This also removes past jobs. Their hours leave the totals; the history keeps them.',
    });
    expect(api.calls.some((c) => c.op === 'deleteJob')).toBe(false);
    press('Confirm');
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'deleteJob')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        jobId: 'job-repeat',
        scope: 'ALL',
      }),
    );
    await waitFor(() => expect(routerState.backs).toBe(1));
  });
});
