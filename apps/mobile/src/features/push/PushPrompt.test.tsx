import { Linking } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { deviceState, notificationState } from '@/testing/nativeMocks';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { useAppStore } from '@/store/appStore';
import { PushPrompt } from './PushPrompt';

describe('Turn on notifications never fails silently (CHQ-167)', () => {
  beforeEach(() => {
    useAppStore.getState().setPushPromptShown(false);
    deviceState.isDevice = true;
    notificationState.permission = 'undetermined';
    notificationState.canAskAgain = true;
  });
  afterEach(() => {
    deviceState.isDevice = true;
    notificationState.canAskAgain = true;
    // React Native's jest setup already mocks Linking.openSettings, so spyOn returns that same function and its
    // calls outlive restoreAllMocks.
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('says push needs a real phone on a simulator, and registers nothing', async () => {
    deviceState.isDevice = false;
    const api = fakeApi({ getMe: meFixture });
    await renderApp(<PushPrompt employer />, { api });
    await fireEvent.press(await screen.findByTestId('push-enable'));
    expect(
      await screen.findByText('Notifications need a real phone. They do not work in a simulator.'),
    ).toBeTruthy();
    expect(api.calls.filter((c) => c.op === 'registerPushToken')).toHaveLength(0);
  });

  it("opens the phone's settings when the OS will not ask again", async () => {
    notificationState.permission = 'denied';
    notificationState.canAskAgain = false;
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await renderApp(<PushPrompt employer />, { api: fakeApi({ getMe: meFixture }) });
    await fireEvent.press(await screen.findByTestId('push-enable'));
    await waitFor(() => expect(openSettings).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText("Notifications are off for Klokka. Turn them on in your phone's settings."),
    ).toBeTruthy();
  });

  it('registers the token when the user allows notifications (positive control)', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const api = fakeApi({ getMe: meFixture });
    await renderApp(<PushPrompt employer />, { api });
    await fireEvent.press(await screen.findByTestId('push-enable'));
    await waitFor(() => expect(api.calls.filter((c) => c.op === 'registerPushToken')).toHaveLength(1));
    expect(openSettings).not.toHaveBeenCalled();
  });
});
