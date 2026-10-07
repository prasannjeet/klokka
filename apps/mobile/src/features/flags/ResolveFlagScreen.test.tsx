import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ResolveFlagScreen } from './ResolveFlagScreen';
import { fakeApi, renderApp } from '@/testing/render';
import { employerMeFixture, entryFixture, flagFixture, jobFixture } from '@/testing/fixtures';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

const history = [
  {
    id: 'c2',
    entryId: flagFixture.entryId,
    kind: 'FLAGGED' as const,
    flagId: 'flag-1',
    changedBy: { userId: 'usr_maria', name: 'Maria Lind' },
    changedAt: new Date('2026-09-25T05:15:00Z'),
  },
  {
    id: 'c1',
    entryId: flagFixture.entryId,
    kind: 'CREATED' as const,
    hoursAfter: 2,
    changedBy: { userId: 'usr_nora', name: 'Nora Lind' },
    changedAt: new Date('2026-09-17T16:02:00Z'),
  },
];

describe('ResolveFlagScreen (employer)', () => {
  beforeEach(() => {
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    routerState.backs = 0;
  });

  it('faces the two numbers, shows the history, and fixes with the suggested hours', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getFlag: flagFixture,
      getEntryHistory: history,
      listEntries: [],
      resolveFlag: { ...flagFixture, status: 'FIXED' },
    });
    await renderApp(<ResolveFlagScreen flagId="flag-1" />, { api });
    expect(await screen.findByText('Flag from Maria')).toBeTruthy();
    expect(screen.getByText('You logged')).toBeTruthy();
    expect(screen.getByText('Maria says')).toBeTruthy();
    // The history is its own query and may land after the flag: wait for it (CI load made a sync read flaky).
    expect(await screen.findByText('Maria Lind flagged the entry')).toBeTruthy();
    expect(screen.getByText('Nora Lind logged 2 h')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('flag-fix'));
    await waitFor(() => expect(api.calls.some((c) => c.op === 'resolveFlag')).toBe(true));
    expect(api.calls.find((c) => c.op === 'resolveFlag')?.args[0]).toEqual({
      workspaceId: 'ws-cafe',
      flagId: 'flag-1',
      flagResolve: { action: 'FIX', hours: 4 },
    });
    await waitFor(() => expect(routerState.backs).toBe(1));
  });

  it('dismisses by keeping the logged hours', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getFlag: flagFixture,
      getEntryHistory: history,
      listEntries: [],
      resolveFlag: { ...flagFixture, status: 'DISMISSED' },
    });
    await renderApp(<ResolveFlagScreen flagId="flag-1" />, { api });
    await screen.findByText('Flag from Maria');
    await fireEvent.press(screen.getByTestId('flag-dismiss'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'resolveFlag')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        flagId: 'flag-1',
        flagResolve: { action: 'DISMISS' },
      }),
    );
  });
});

describe('ResolveFlagScreen without a suggestion (CHQ-145)', () => {
  const bare = {
    ...flagFixture,
    suggestedHours: null,
    reason: 'LESS' as const,
    message: 'That was not right.',
  };

  beforeEach(() => {
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    routerState.backs = 0;
  });

  it('proposes the logged hours, never 0, and fixes with what the employer typed', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getFlag: bare,
      getEntryHistory: history,
      listEntries: [],
      resolveFlag: { ...bare, status: 'FIXED' },
    });
    await renderApp(<ResolveFlagScreen flagId="flag-1" />, { api });
    expect(await screen.findByText('Flag from Maria')).toBeTruthy();
    // No "Maria says 0 h" tile; the field starts at the logged 2 h.
    expect(screen.queryByText('Maria says')).toBeNull();
    expect(screen.getByTestId('flag-hours').props.value).toBe('2');
    expect(screen.getByText('Change to 2 h')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('flag-hours'), '');
    expect(screen.getByText('Enter hours between 0 and 24, like 2.5 or 7,5.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('flag-fix'));
    expect(api.calls.some((c) => c.op === 'resolveFlag')).toBe(false);
    await fireEvent.changeText(screen.getByTestId('flag-hours'), '1,5');
    await fireEvent.press(screen.getByTestId('flag-fix'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'resolveFlag')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        flagId: 'flag-1',
        flagResolve: { action: 'FIX', hours: 1.5 },
      }),
    );
  });

  it('writes 0 h only when the employer typed 0', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getFlag: bare,
      getEntryHistory: history,
      listEntries: [],
      resolveFlag: { ...bare, status: 'FIXED' },
    });
    await renderApp(<ResolveFlagScreen flagId="flag-1" />, { api });
    await screen.findByText('Flag from Maria');
    await fireEvent.changeText(screen.getByTestId('flag-hours'), '0');
    await fireEvent.press(screen.getByTestId('flag-fix'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'resolveFlag')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        flagId: 'flag-1',
        flagResolve: { action: 'FIX', hours: 0 },
      }),
    );
  });
});

describe('ResolveFlagScreen on a day with several jobs (CHQ-156)', () => {
  beforeEach(() => {
    useAppStore.getState().setActiveWorkspace('ws-cafe');
    routerState.backs = 0;
    routerState.pushes.length = 0;
  });

  it('opens the day to change the right job and approves the day as it stands; a quiet decline says so', async () => {
    const api = fakeApi({
      getMe: {
        ...employerMeFixture,
        workspaces: employerMeFixture.workspaces.map((w) => ({ ...w, notifyFlagDeclined: false })),
      },
      getFlag: flagFixture,
      getEntryHistory: history,
      listEntries: [
        entryFixture('mem-maria', '2026-09-17', 5, { jobs: [jobFixture('j1', 3), jobFixture('j2', 2)] }),
      ],
      resolveFlag: { ...flagFixture, status: 'FIXED' },
    });
    await renderApp(<ResolveFlagScreen flagId="flag-1" />, { api });
    expect(await screen.findByTestId('flag-several-jobs')).toBeTruthy();
    expect(screen.queryByTestId('flag-hours')).toBeNull();
    expect(
      screen.getByText('Maria is not told when you decline. Change this in Settings, Employees.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByTestId('flag-change-jobs'));
    expect(routerState.pushes.at(-1)).toEqual({
      pathname: '/day/[membershipId]/[date]',
      params: { membershipId: 'mem-maria', date: '2026-09-17' },
    });
    await fireEvent.press(screen.getByTestId('flag-approve-as-is'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'resolveFlag')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        flagId: 'flag-1',
        flagResolve: { action: 'FIX', hours: 5 },
      }),
    );
  });
});
