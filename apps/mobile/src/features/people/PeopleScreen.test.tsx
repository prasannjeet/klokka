import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { PeopleScreen } from './PeopleScreen';
import { fakeApi, renderApp } from '@/testing/render';
import {
  employerMeFixture,
  entriesFixture,
  entryFixture,
  flagFixture,
  jobFixture,
  membersFixture,
  workspaceFixture,
} from '@/testing/fixtures';
import { hapticCalls, routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

function peopleApi() {
  return fakeApi({
    getMe: employerMeFixture,
    getWorkspace: workspaceFixture,
    listMembers: membersFixture,
    listEntries: entriesFixture,
    listFlags: [flagFixture],
    createJob: (args: { jobWrite: { hours: number } }) =>
      entryFixture('mem-sam', '2026-09-25', args.jobWrite.hours),
  });
}

// The people list moved here from Home (CHQ-171), with its quick add.
describe('PeopleScreen (employer)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    useAppStore.getState().setPushPromptShown(true);
    routerState.pushes.length = 0;
    hapticCalls.length = 0;
  });
  afterEach(() => jest.useRealTimers());

  it("lists every employee with today's and this week's hours, the invited and the open flag", async () => {
    await renderApp(<PeopleScreen />, { api: peopleApi() });
    expect(await screen.findByText('Maria')).toBeTruthy();
    expect(screen.getByText('Jonas')).toBeTruthy();
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Invited')).toBeTruthy();
    expect(screen.getByText('4 h today, 8 h this week')).toBeTruthy();
    expect(screen.getByText('8 h today, 16 h this week')).toBeTruthy();
    expect(screen.getByText('Nothing today, 5 h this week')).toBeTruthy();
    expect(screen.getByText('Nothing today, 4 h this week')).toBeTruthy();
    // Maria's open flag sits on her row.
    expect(screen.getByText('1 open flag')).toBeTruthy();
    expect(screen.getByText('Café Nord, 4 people')).toBeTruthy();
  });

  it('opens the job sheet from the plus, a chip and the minutes wheel set the time, save creates a job', async () => {
    const api = peopleApi();
    await renderApp(<PeopleScreen />, { api });
    await screen.findByText('Sam');
    await fireEvent.press(screen.getByTestId('add-mem-sam'));
    expect(await screen.findByText('New job for Sam Ali')).toBeTruthy();
    expect(screen.getByText('Full day, 7 h 30 min')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chip-4'));
    expect(screen.getByText('Save job, 4 h')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('wheel-minutes-30'));
    expect(screen.getByText('Save job, 4 h 30 min')).toBeTruthy();
    expect(screen.getByText('Saved as 4.5 h')).toBeTruthy();
    expect(hapticCalls.some((c) => c.includes('segment-tick') || c === 'selection')).toBe(true);
    await fireEvent.press(screen.getByTestId('save-job'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'createJob')).toBe(true));
    const call = api.calls.find((c) => c.op === 'createJob')?.args[0] as {
      membershipId: string;
      jobWrite: { hours: number; startTime: string | null };
    };
    expect(call.membershipId).toBe('mem-sam');
    expect(call.jobWrite).toEqual({ hours: 4.5, startTime: null, note: null });
  });

  it('offers only the minutes the rounding allows, and 24 h has no minutes', async () => {
    const api = peopleApi();
    await renderApp(<PeopleScreen />, { api });
    await screen.findByText('Sam');
    await fireEvent.press(screen.getByTestId('add-mem-sam'));
    await screen.findByText('New job for Sam Ali');
    expect(screen.getByText('Choose the time first')).toBeTruthy();
    // Half-hour rounding: the minutes wheel is 00 and 30, nothing in between.
    expect(screen.queryByTestId('wheel-minutes-15')).toBeNull();
    await fireEvent.press(screen.getByTestId('wheel-hours-23'));
    await fireEvent.press(screen.getByTestId('wheel-minutes-30'));
    expect(screen.getByText('Save job, 23 h 30 min')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('wheel-hours-24'));
    expect(screen.queryByTestId('wheel-minutes-30')).toBeNull();
    await fireEvent.press(screen.getByTestId('save-job'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'createJob')).toBe(true));
    const call = api.calls.find((c) => c.op === 'createJob')?.args[0] as { jobWrite: { hours: number } };
    expect(call.jobWrite.hours).toBe(24);
  });

  it("edits the day's one job, and a day with several jobs opens the day page instead of the sheet", async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      listMembers: membersFixture,
      listEntries: [
        entryFixture('mem-maria', '2026-09-25', 4),
        entryFixture('mem-jonas', '2026-09-25', 8, {
          jobs: [jobFixture('job-a', 5), jobFixture('job-b', 3)],
        }),
      ],
      listFlags: [],
      updateJob: () => entryFixture('mem-maria', '2026-09-25', 5),
    });
    await renderApp(<PeopleScreen />, { api });
    await screen.findByText('Jonas');
    await fireEvent.press(screen.getByTestId('add-mem-jonas'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/day/[membershipId]/[date]',
      params: { membershipId: 'mem-jonas', date: '2026-09-25' },
    });
    await fireEvent.press(screen.getByTestId('add-mem-maria'));
    expect(await screen.findByText('Job for Maria Lind')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('wheel-hours-5'));
    await fireEvent.press(screen.getByTestId('save-job'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'updateJob')).toBe(true));
    expect(api.calls.find((c) => c.op === 'updateJob')?.args[0]).toMatchObject({
      workspaceId: 'ws-cafe',
      jobId: 'job-mem-maria-2026-09-25',
      jobWrite: { hours: 5 },
    });
  });

  it('opens a person on their week and the plus in the header to invite', async () => {
    await renderApp(<PeopleScreen />, { api: peopleApi() });
    await screen.findByText('Maria');
    await fireEvent.press(screen.getByTestId('person-mem-maria'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/member/[membershipId]',
      params: { membershipId: 'mem-maria' },
    });
    await fireEvent.press(screen.getByTestId('manage-people'));
    expect(routerState.pushes.at(-1)).toBe('/employees');
  });
});
