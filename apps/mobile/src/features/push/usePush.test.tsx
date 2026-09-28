import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, waitFor } from '@testing-library/react-native';
import { PushRuntime } from './PushRuntime';
import { PUSH_TOKEN_KEY } from './pushToken';
import { fakeApi, meFixture, renderApp } from '@/testing/render';
import { notificationState } from '@/testing/nativeMocks';
import { useAppStore } from '@/store/appStore';

describe('push token rotation (CHQ-145)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    notificationState.permission = 'granted';
    notificationState.tokenListeners = [];
    notificationState.expoTokenCalls = [];
    useAppStore.getState().setActiveWorkspace('ws-cafe');
  });

  it('registers the Expo token for a rotated device token, never the raw FCM token, and only once', async () => {
    const api = fakeApi({ getMe: { ...meFixture, pushTokenRegistered: true }, registerPushToken: undefined });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, 'ExponentPushToken[test]');
    await renderApp(<PushRuntime />, { api });
    await waitFor(() => expect(notificationState.tokenListeners).toHaveLength(1));
    const emit = notificationState.tokenListeners[0]!;
    await act(async () => emit({ type: 'android', data: 'raw-fcm-token' }));
    await waitFor(() =>
      expect(api.calls.filter((c) => c.op === 'registerPushToken').map((c) => c.args[0])).toEqual([
        {
          pushTokenRegistration: expect.objectContaining({ token: 'ExponentPushToken[for-raw-fcm-token]' }),
        },
      ]),
    );
    expect(notificationState.expoTokenCalls).toContainEqual({
      devicePushToken: { type: 'android', data: 'raw-fcm-token' },
    });
    expect(await AsyncStorage.getItem(PUSH_TOKEN_KEY)).toBe('ExponentPushToken[for-raw-fcm-token]');
    // The same device token again (the listener also fires when a token is fetched) registers nothing new.
    await act(async () => emit({ type: 'android', data: 'raw-fcm-token' }));
    await act(async () => undefined);
    expect(api.calls.filter((c) => c.op === 'registerPushToken')).toHaveLength(1);
  });
});
