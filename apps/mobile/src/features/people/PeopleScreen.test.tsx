import { fireEvent, screen } from '@testing-library/react-native';
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

  it('names no count while the people are still loading (a cold start said "0 people")', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      listMembers: () => new Promise(() => {}),
      listEntries: entriesFixture,
      listFlags: [],
    });
    await renderApp(<PeopleScreen />, { api });
    expect(await screen.findByText('Café Nord')).toBeTruthy();
    expect(screen.queryByText(/0 people/)).toBeNull();
  });

  it('the plus opens New job for the person on today, also on a day that already has jobs (CHQ-185)', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      listMembers: membersFixture,
      listEntries: [
        entryFixture('mem-jonas', '2026-09-25', 8, {
          jobs: [jobFixture('job-a', 5), jobFixture('job-b', 3)],
        }),
      ],
      listFlags: [],
    });
    await renderApp(<PeopleScreen />, { api });
    await screen.findByText('Jonas');
    await fireEvent.press(screen.getByTestId('add-mem-jonas'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-jonas', date: '2026-09-25', mode: 'full' },
    });
    await fireEvent.press(screen.getByTestId('add-mem-sam'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/job',
      params: { membershipId: 'mem-sam', date: '2026-09-25', mode: 'full' },
    });
    expect(hapticCalls.length).toBeGreaterThan(0);
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
