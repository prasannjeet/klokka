import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { HomeScreen } from '@/features/home/HomeScreen';
import { MonthScreen } from '@/features/month/MonthScreen';
import { cacheKeyFor } from '@/data/queryClient';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { employerMeFixture } from '@/testing/fixtures';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';
import { RootErrorBoundary } from './RootErrorBoundary';

function resetRouter() {
  routerState.pushes.length = 0;
  routerState.replaces.length = 0;
  routerState.dismissAlls = 0;
}

describe('the workspace guard (CHQ-145)', () => {
  beforeEach(() => {
    resetRouter();
    useAppStore.getState().setPushPromptShown(true);
  });

  it('sends Home back to the start route instead of throwing when the user has no workspace', async () => {
    useAppStore.getState().setActiveWorkspace('ws-gone');
    const api = fakeApi({ getMe: { ...employerMeFixture, workspaces: [] } });
    await renderApp(<HomeScreen />, { api });
    // Waits for the redirect: one tick was not enough under the full suite's load (CI failed on it).
    await waitFor(() => expect(routerState.replaces).toContain('/'));
    expect(screen.queryByTestId('home-screen')).toBeNull();
    // The stale id is repaired, so the next start does not meet it again.
    expect(useAppStore.getState().activeWorkspaceId).toBeNull();
  });

  it('sends My month back to the start route when the stored workspace is not one of several', async () => {
    useAppStore.getState().setActiveWorkspace('ws-gone');
    const [first] = meFixture.workspaces;
    const second = { ...first, workspaceId: 'ws-two', membershipId: 'mem-two' } as typeof first;
    const api = fakeApi({ getMe: { ...meFixture, workspaces: [first, second] } });
    await renderApp(<MonthScreen />, { api });
    await waitFor(() => expect(routerState.replaces).toContain('/'));
    expect(screen.queryByTestId('month-screen')).toBeNull();
  });

  it('shows a spinner, not the screen, while /me is still loading', async () => {
    const api = fakeApi({ getMe: () => new Promise(() => undefined) });
    await renderApp(<HomeScreen />, { api });
    expect(screen.getByTestId('workspace-loading')).toBeTruthy();
    expect(routerState.replaces).toHaveLength(0);
  });
});

function Bomb({ explode }: { explode: () => boolean }) {
  if (explode()) throw new Error('boom');
  return <Text>alive</Text>;
}

describe('RootErrorBoundary (CHQ-145)', () => {
  let consoleError: jest.SpyInstance;
  beforeEach(async () => {
    resetRouter();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.clear();
    useAppStore.getState().setUserId('usr_maria');
    useAppStore.getState().setActiveWorkspace('ws-cafe');
  });
  afterEach(() => consoleError.mockRestore());

  it('clears the persisted cache and the stored workspace, remounts and restarts from the start route', async () => {
    await AsyncStorage.setItem(cacheKeyFor('usr_maria'), '{"broken":true}');
    // The bad state is the stored workspace: the tree crashes for as long as it is there.
    await renderApp(
      <RootErrorBoundary>
        <Bomb explode={() => useAppStore.getState().activeWorkspaceId !== null} />
      </RootErrorBoundary>,
    );
    expect(await screen.findByText('alive')).toBeTruthy();
    expect(await AsyncStorage.getItem(cacheKeyFor('usr_maria'))).toBeNull();
    expect(useAppStore.getState().activeWorkspaceId).toBeNull();
    expect(routerState.dismissAlls).toBe(1);
    expect(routerState.replaces).toEqual(['/']);
  });

  it('stops at the fallback when the tree crashes again right after a recovery, and restarts on request', async () => {
    let explode = true;
    function Toggle() {
      const [, force] = useState(0);
      return (
        <>
          <Bomb explode={() => explode} />
          <Text onPress={() => force((n) => n + 1)}>poke</Text>
        </>
      );
    }
    await renderApp(
      <RootErrorBoundary>
        <Toggle />
      </RootErrorBoundary>,
    );
    expect(await screen.findByTestId('crash-screen')).toBeTruthy();
    expect(screen.getByText('Klokka had to start again')).toBeTruthy();
    explode = false;
    await fireEvent.press(screen.getByTestId('crash-restart'));
    expect(await screen.findByText('alive')).toBeTruthy();
  });
});
