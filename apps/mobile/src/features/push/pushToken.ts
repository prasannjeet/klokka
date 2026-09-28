import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KlokkaApi } from '@klokka/api-client';

// The push token last registered with the API on this phone, so sign-out can delete exactly it
// (the next user on the phone must never receive the previous user's pushes).
export const PUSH_TOKEN_KEY = 'klokka.push.token';

export async function rememberPushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
}

export async function rememberedPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export async function unregisterPushToken(api: KlokkaApi): Promise<void> {
  const token = await rememberedPushToken();
  if (!token) return;
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  await api.me.deletePushToken({ token });
}
