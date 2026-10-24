import { waitFor } from '@testing-library/react-native';
import type { Me } from '@klokka/api-client';
import TabsLayout from '../../../app/(tabs)/_layout';
import { keys } from '@/data/keys';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { employerMeFixture } from '@/testing/fixtures';
import { routerState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

// CHQ-190: Expo Router keeps the navigation state while AuthGate shows the sign-in screen, so signing out as an
// employer and in as an employee (without restarting the app) reopened the employer's Home tab under the
// employee's tab bar. The tabs layout sends a tab that is not the role's to the role's first tab.
async function openTab(me: Me, segments: string[]) {
  routerState.segments = segments;
  const { client } = await renderApp(<TabsLayout />, { api: fakeApi({ getMe: me }) });
  await waitFor(() => expect(client.getQueryData(keys.me)).toBeDefined());
}

describe('the tabs layout keeps each role on its own tabs (CHQ-190)', () => {
  beforeEach(() => {
    routerState.replaces.length = 0;
    routerState.segments = [];
    useAppStore.getState().setActiveWorkspace('ws-cafe');
  });

  it("sends an employee left on the employer's Home to My month", async () => {
    await openTab(meFixture, ['(tabs)', 'home']);
    await waitFor(() => expect(routerState.replaces).toContain('/(tabs)/month'));
  });

  it("sends an employer left on the employee's Week to Home", async () => {
    await openTab(employerMeFixture, ['(tabs)', 'week']);
    await waitFor(() => expect(routerState.replaces).toContain('/(tabs)/home'));
  });

  it("sends an employer opened on the employee's Notifications tab (a push link) to the employer's list", async () => {
    await openTab(employerMeFixture, ['(tabs)', 'notifications']);
    await waitFor(() => expect(routerState.replaces).toContain('/notifications-list'));
    expect(routerState.replaces).not.toContain('/(tabs)/home');
  });

  it('leaves an employee on their own Notifications tab (positive control)', async () => {
    await openTab(meFixture, ['(tabs)', 'notifications']);
    expect(routerState.replaces).toEqual([]);
  });

  it('leaves an employee on their own tab (positive control)', async () => {
    await openTab(meFixture, ['(tabs)', 'week']);
    expect(routerState.replaces).toEqual([]);
  });

  it('leaves an employer on their own tab (positive control)', async () => {
    await openTab(employerMeFixture, ['(tabs)', 'people']);
    expect(routerState.replaces).toEqual([]);
  });

  it('leaves a screen pushed over the tabs alone', async () => {
    await openTab(meFixture, ['job']);
    expect(routerState.replaces).toEqual([]);
  });
});
