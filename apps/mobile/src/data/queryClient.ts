import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
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
  return createAsyncStoragePersister({ storage: AsyncStorage, key: cacheKeyFor(userId), throttleTime: 1000 });
}

// A cache written by another app version or another contract must not be read back.
export function cacheBuster(): string {
  const version = Constants.expoConfig?.version ?? '0';
  return `${version}`;
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
