import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { HomeScreen } from './HomeScreen';
import { fakeApi, renderApp } from '@/testing/render';
import {
  employerMeFixture,
  entriesFixture,
  entryFixture,
  flagFixture,
  insightsFixture,
  membersFixture,
  workspaceFixture,
} from '@/testing/fixtures';
import { hapticCalls, routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

function homeApi() {
  return fakeApi({
    getMe: employerMeFixture,
    getWorkspace: workspaceFixture,
    listMembers: membersFixture,
    listEntries: entriesFixture,
    getWorkspaceInsights: insightsFixture,
    listFlags: [flagFixture],
    upsertEntry: (args: { hours: number }) => entryFixture('mem-sam', '2026-09-25', args.hours),
  });
}

describe('HomeScreen (employer, today)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    useAppStore.getState().setPushPromptShown(true);
    routerState.pushes.length = 0;
    hapticCalls.length = 0;
  });
  afterEach(() => jest.useRealTimers());

  it('lists every employee with today, the week strip and the open flag', async () => {
    await renderApp(<HomeScreen />, { api: homeApi() });
    expect(await screen.findByText('Maria')).toBeTruthy();
    expect(screen.getByText('Jonas')).toBeTruthy();
    expect(screen.getByText('Sam')).toBeTruthy();
    expect(screen.getByText('Invited')).toBeTruthy();
    // Sam and Ayla have nothing today; Maria and Jonas do.
    expect(screen.getAllByText('Nothing yet')).toHaveLength(2);
    expect(screen.getByText('Week 39, 101 h so far.')).toBeTruthy();
    expect(screen.getByText(/3 of 4 logged today\./)).toBeTruthy();
    expect(screen.getByText('1 open flag')).toBeTruthy();
    expect(screen.getByText('Café Nord')).toBeTruthy();
  });

  it('opens the quick-add sheet from the plus, a chip and the minutes wheel set the time, save sends decimal hours', async () => {
    const api = homeApi();
    await renderApp(<HomeScreen />, { api });
    await screen.findByText('Sam');
    await fireEvent.press(screen.getByTestId('add-mem-sam'));
    expect(await screen.findByText('Sam Ali, today')).toBeTruthy();
    expect(screen.getByText('Full day, 7 h 30 min')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chip-4'));
    expect(screen.getByText('Save 4 h for Sam Ali')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('wheel-minutes-30'));
    expect(screen.getByText('Save 4 h 30 min for Sam Ali')).toBeTruthy();
    expect(screen.getByText('Saved as 4.5 h')).toBeTruthy();
    expect(hapticCalls.some((c) => c.includes('segment-tick') || c === 'selection')).toBe(true);
    await fireEvent.press(screen.getByTestId('save-hours'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'upsertEntry')).toBe(true));
    const call = api.calls.find((c) => c.op === 'upsertEntry')?.args[0] as {
      membershipId: string;
      entryUpsert: { hours: number };
    };
    expect(call.membershipId).toBe('mem-sam');
    expect(call.entryUpsert.hours).toBe(4.5);
  });

  it('offers only the minutes the rounding allows, and 24 h has no minutes', async () => {
    const api = homeApi();
    await renderApp(<HomeScreen />, { api });
    await screen.findByText('Sam');
    await fireEvent.press(screen.getByTestId('add-mem-sam'));
    await screen.findByText('Sam Ali, today');
    expect(screen.getByText('Save 0 h for Sam Ali')).toBeTruthy();
    // Half-hour rounding: the minutes wheel is 00 and 30, nothing in between.
    expect(screen.queryByTestId('wheel-minutes-15')).toBeNull();
    await fireEvent.press(screen.getByTestId('wheel-hours-23'));
    await fireEvent.press(screen.getByTestId('wheel-minutes-30'));
    expect(screen.getByText('Save 23 h 30 min for Sam Ali')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('wheel-hours-24'));
    expect(screen.queryByTestId('wheel-minutes-30')).toBeNull();
    await fireEvent.press(screen.getByTestId('save-hours'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'upsertEntry')).toBe(true));
    const call = api.calls.find((c) => c.op === 'upsertEntry')?.args[0] as { entryUpsert: { hours: number } };
    expect(call.entryUpsert.hours).toBe(24);
  });

  it('routes the flag row to the resolve screen and the person card to their month', async () => {
    await renderApp(<HomeScreen />, { api: homeApi() });
    await screen.findByText('Maria');
    await fireEvent.press(screen.getByTestId('flag-flag-1'));
    expect(routerState.pushes.at(-1)).toEqual({ pathname: '/flag/[flagId]', params: { flagId: 'flag-1' } });
    await fireEvent.press(screen.getByTestId('person-mem-maria'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/member/[membershipId]',
      params: { membershipId: 'mem-maria' },
    });
  });
});
