import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { Translator } from '@klokka/core';
import { useApi } from '@/api/ApiProvider';
import { keys } from '@/data/keys';
import { useActiveWorkspace } from '@/data/me';
import { useT } from '@/i18n/LocaleProvider';
import { useAppStore } from '@/store/appStore';
import { haptic, useToast } from '@/ui';
import { parseNotificationUrl } from './notificationLinks';
import { rememberPushToken, rememberedPushToken, unregisterPushToken } from './pushToken';

// Push (CHQ-130): channels before any prompt, permission asked in context, the token registered
// after sign-in and on rotation, no system banner in the foreground (a haptic, a toast and the
// named queries refreshed instead), and a tap that deep-links through the allowlist.

export const CHANNELS = {
  hours: { id: 'hours', importance: Notifications.AndroidImportance.HIGH },
  flags: { id: 'flags', importance: Notifications.AndroidImportance.HIGH },
  workspace: { id: 'workspace', importance: Notifications.AndroidImportance.DEFAULT },
} as const;

export async function ensureChannels(t: Translator): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNELS.hours.id, {
    name: t('mobile.push.channelHours'),
    importance: CHANNELS.hours.importance,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.flags.id, {
    name: t('mobile.push.channelFlags'),
    importance: CHANNELS.flags.importance,
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.workspace.id, {
    name: t('mobile.push.channelWorkspace'),
    importance: CHANNELS.workspace.importance,
  });
}

// Always set explicitly: SDK 58 flips the default to "show" (docs/research/mobile.md section 3).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export function usePushPreference() {
  const api = useApi();
  const t = useT();
  const setPromptShown = useAppStore((s) => s.setPushPromptShown);

  const register = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) return false;
    await ensureChannels(t);
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    setPromptShown(true);
    if (status !== 'granted') return false;
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await api.me.registerPushToken({
      pushTokenRegistration: {
        token,
        platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
        ...(Device.deviceName ? { deviceName: Device.deviceName } : {}),
      },
    });
    await rememberPushToken(token);
    return true;
  }, [api, setPromptShown, t]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) await register();
      else await unregisterPushToken(api);
    },
    [api, register],
  );

  return { register, setEnabled };
}

// Mounted once inside the signed-in tree: keeps the token registered, handles taps and foreground
// notifications. The permission prompt itself lives on the Home and Month screens (in context).
export function usePushRuntime() {
  const t = useT();
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const { me, workspace } = useActiveWorkspace();
  const setActive = useAppStore((s) => s.setActiveWorkspace);
  const handled = useRef<string | null>(null);

  const follow = useCallback(
    (data: Record<string, unknown> | undefined) => {
      const target = parseNotificationUrl(data?.['url']);
      if (!target) return;
      if (target.workspaceId) setActive(target.workspaceId);
      router.push(target.href as never);
    },
    [router, setActive],
  );

  // Re-register silently when the preference is on and the token is missing or rotated.
  useEffect(() => {
    if (!me?.preferences.pushEnabled || !workspace || !Device.isDevice) return;
    let cancelled = false;
    void (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      await ensureChannels(t);
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      const known = await rememberedPushToken();
      if (known === token && me.pushTokenRegistered) return;
      await api.me.registerPushToken({
        pushTokenRegistration: {
          token,
          platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
          ...(Device.deviceName ? { deviceName: Device.deviceName } : {}),
        },
      });
      await rememberPushToken(token);
    })().catch(() => undefined);
    // The listener hands over the raw FCM/APNs device token, which Expo cannot deliver to (CHQ-145: every
    // such row answered DeviceNotRegistered and was deleted, and sign-out then forgot the real Expo token).
    // It is converted to the Expo token for this install first, and only a new one is registered. Passing the
    // device token skips the native fetch, so the conversion cannot fire this listener again.
    const rotation = Notifications.addPushTokenListener((devicePushToken) => {
      void (async () => {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ devicePushToken });
        if ((await rememberedPushToken()) === token) return;
        await api.me.registerPushToken({
          pushTokenRegistration: { token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' },
        });
        await rememberPushToken(token);
      })().catch(() => undefined);
    });
    return () => {
      cancelled = true;
      rotation.remove();
    };
  }, [api, me?.preferences.pushEnabled, me?.pushTokenRegistered, t, workspace]);

  // Foreground: no banner; a haptic, a toast with the title, and the workspace queries refreshed.
  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      void haptic('confirm');
      const title = notification.request.content.title;
      if (title) toast.show(title, 'neutral');
      void qc.invalidateQueries({ queryKey: ['ws'] });
      void qc.invalidateQueries({ queryKey: ['me'] });
    });
    const response = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      follow(r.notification.request.content.data as Record<string, unknown> | undefined);
    });
    // Cold start from a tap.
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (!r) return;
      const id = r.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;
      follow(r.notification.request.content.data as Record<string, unknown> | undefined);
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, [follow, qc, toast]);

  // Badge: best effort, the server's unread count is the truth.
  useEffect(() => {
    const unread = me?.workspaces.reduce((sum, w) => sum + w.unreadNotifications, 0) ?? 0;
    void Notifications.setBadgeCountAsync(unread).catch(() => undefined);
  }, [me?.workspaces]);

  void keys;
}
