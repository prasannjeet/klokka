import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { fakeApi, fakeOidc, renderApp } from '@/testing/render';
import { employerMeFixture, workspaceFixture } from '@/testing/fixtures';
import { useAppStore } from '@/store/appStore';

// Deleting the account from the employer's Settings (CHQ-157): the owned business is named, the button waits for
// the typed word, DELETE /me runs once and the session ends.
describe('DeleteAccountSheet', () => {
  beforeEach(() => useAppStore.getState().setActiveWorkspace('ws-cafe'));

  it('names the owned business, waits for the word, deletes once and signs out', async () => {
    const api = fakeApi({ getMe: employerMeFixture, getWorkspace: workspaceFixture, deleteMe: undefined });
    const endSession = jest.fn(async () => undefined);
    await renderApp(<SettingsScreen />, { api, oidc: fakeOidc({ endSession }) });
    await fireEvent.press(await screen.findByTestId('delete-account'));
    expect(await screen.findByText(/You own Café Nord\. It is deleted too/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('delete-account-submit'));
    expect(api.calls.some((c) => c.op === 'deleteMe')).toBe(false);

    await fireEvent.changeText(screen.getByTestId('delete-account-word'), 'delete');
    await fireEvent.press(screen.getByTestId('delete-account-submit'));
    await waitFor(() => expect(endSession).toHaveBeenCalledTimes(1));
    expect(api.calls.filter((c) => c.op === 'deleteMe')).toHaveLength(1);
  });
});
