import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import * as Network from 'expo-network';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { ResponseError } from '@klokka/api-client';
import { NotAuthenticatedError } from '@/auth';

// TanStack Query for everything from the API (docs/research/mobile.md section 6): keys per user and
// per workspace, refetch on focus, a persisted read cache in AsyncStorage so a cold start shows the
// last month while the network answers. Writes need a connection in v1.

const DAY_MS = 24 * 60 * 60 * 1000;
export const CACHE_MAX_AGE_MS = 7 * DAY_MS;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // The docs require gcTime to be at least maxAge for a persisted cache.
        gcTime: CACHE_MAX_AGE_MS,
        retry: (count, error) => {
          if (error instanceof NotAuthenticatedError) return false;
          if (error instanceof ResponseError && error.response.status < 500) return false;
          return count < 2;
        },
      },
      mutations: { retry: 0 },
    },
  });
}

// Storage key per user, removed on sign-out, so a second account on the phone never sees the first.
export function cacheKeyFor(userId: string): string {
  return `klokka.qc.${userId}`;
}

export function createPersister(userId: string) {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: cacheKeyFor(userId),
    throttleTime: 1000,
    serialize: serializeCache,
    deserialize: deserializeCache,
  });
}

// The generated client hands the screens real Dates (work dates, timestamps). Plain JSON writes a Date
// as a string and never turns it back, so a restored cache fed strings to code calling getFullYear()
// and every cold start crashed until the app was reinstalled (CHQ-145). Dates are tagged on the way
// out and revived on the way in, so a restored query is indistinguishable from a fetched one.
const DATE_TAG = '$klokkaDate';

export function serializeCache(client: PersistedClient): string {
  return JSON.stringify(client, function (this: Record<string, unknown>, key: string, value: unknown) {
    const raw = this[key];
    return raw instanceof Date ? { [DATE_TAG]: raw.getTime() } : value;
  });
}

export function deserializeCache(text: string): PersistedClient {
  return JSON.parse(text, (_key: string, value: unknown) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const tagged = (value as Record<string, unknown>)[DATE_TAG];
      if (typeof tagged === 'number' && Object.keys(value).length === 1) return new Date(tagged);
    }
    return value;
  }) as PersistedClient;
}

// Bumped whenever the persisted shape changes; 2 = dates tagged. A cache written by another app
// version, another contract or the untagged serializer is dropped instead of read back.
const CACHE_SCHEMA = 2;

export function cacheBuster(): string {
  const version = Constants.expoConfig?.version ?? '0';
  return `${version}-${CACHE_SCHEMA}`;
}

export async function clearPersistedCache(userId: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKeyFor(userId));
}

// React Native has no window focus event: wire AppState in, and expo-network for online state.
export function wireManagers(): () => void {
  const onAppState = (status: AppStateStatus) => {
    if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
  };
  const appState = AppState.addEventListener('change', onAppState);
  const network = Network.addNetworkStateListener((state) => {
    onlineManager.setOnline(state.isConnected !== false && state.isInternetReachable !== false);
  });
  return () => {
    appState.remove();
    network.remove();
  };
}
