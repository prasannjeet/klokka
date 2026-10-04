import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SettingsScreen, cityOf } from './SettingsScreen';
import { fakeApi, renderApp } from '@/testing/render';
import { employerMeFixture, workspaceFixture } from '@/testing/fixtures';
import { useAppStore } from '@/store/appStore';

describe('SettingsScreen (employer)', () => {
  beforeEach(() => useAppStore.getState().setActiveWorkspace('ws-cafe'));

  it('shows the workspace summary and saves the pay switch as it flips', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      updateWorkspace: { ...workspaceFixture, showPay: false },
    });
    await renderApp(<SettingsScreen />, { api });
    expect(await screen.findByText('Stockholm, SEK, week starts Monday')).toBeTruthy();
    expect(screen.getByText('Nearest 0.5 h')).toBeTruthy();
    expect(screen.getByText('7.5 h')).toBeTruthy();
    await fireEvent(screen.getByTestId('show-pay'), 'valueChange', false);
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'updateWorkspace')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        workspaceUpdate: { showPay: false },
      }),
    );
    expect(await screen.findByText('Saved.')).toBeTruthy();
  });

  it('saves the rounding rule from the option sheet and a preference from the app rows', async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      updateWorkspace: { ...workspaceFixture, rounding: 'QUARTER' },
      updateMyPreferences: { ...employerMeFixture.preferences, theme: 'DARK' },
    });
    await renderApp(<SettingsScreen />, { api });
    await screen.findByText('Nearest 0.5 h');
    await fireEvent.press(screen.getByTestId('rounding'));
    await fireEvent.press(await screen.findByTestId('option-QUARTER'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'updateWorkspace')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        workspaceUpdate: { rounding: 'QUARTER' },
      }),
    );
    await fireEvent.press(screen.getByTestId('pref-appearance'));
    await fireEvent.press(await screen.findByTestId('option-DARK'));
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'updateMyPreferences')?.args[0]).toEqual({
        preferencesUpdate: { theme: 'DARK' },
      }),
    );
    expect(useAppStore.getState().themePreference).toBe('DARK');
  });
});

describe('SettingsScreen employees section (CHQ-156)', () => {
  beforeEach(() => useAppStore.getState().setActiveWorkspace('ws-cafe'));

  it("saves the decline notice and the employees' analysis switches, each with its hint", async () => {
    const api = fakeApi({
      getMe: employerMeFixture,
      getWorkspace: workspaceFixture,
      updateWorkspace: { ...workspaceFixture, notifyFlagDeclined: false },
    });
    await renderApp(<SettingsScreen />, { api });
    expect(await screen.findByText('Tell employees when you decline a flag')).toBeTruthy();
    expect(
      screen.getByText('They get a notification with your reply. An approved change is always shared.'),
    ).toBeTruthy();
    await fireEvent(screen.getByTestId('notify-declined'), 'valueChange', false);
    await waitFor(() =>
      expect(api.calls.find((c) => c.op === 'updateWorkspace')?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        workspaceUpdate: { notifyFlagDeclined: false },
      }),
    );
    await fireEvent(screen.getByTestId('employees-see-insights'), 'valueChange', false);
    await waitFor(() =>
      expect(api.calls.filter((c) => c.op === 'updateWorkspace').at(-1)?.args[0]).toEqual({
        workspaceId: 'ws-cafe',
        workspaceUpdate: { employeesSeeInsights: false },
      }),
    );
  });
});

describe('cityOf', () => {
  it('reads the city from an IANA zone', () => {
    expect(cityOf('Europe/Stockholm')).toBe('Stockholm');
    expect(cityOf('America/New_York')).toBe('New York');
  });
});
