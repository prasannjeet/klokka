import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemePreference } from '@klokka/api-client';
import type { Locale } from '@klokka/core';

// UI state only (docs/research/mobile.md section 6): the active workspace, the theme and language
// mirrors used before /me answers, and whether the push explanation was shown. Server data never
// lives here; that is TanStack Query's job. Every store registers with one sign-out reset.

export interface AppState {
  // The signed-in user's Logto id, kept so the persisted query cache is keyed per user from the first
  // frame of the next cold start.
  userId: string | null;
  activeWorkspaceId: string | null;
  themePreference: ThemePreference;
  localePreference: Locale | null;
  pushPromptShown: boolean;
  hydrated: boolean;
  setUserId: (id: string | null) => void;
  setActiveWorkspace: (id: string | null) => void;
  setThemePreference: (theme: ThemePreference) => void;
  setLocalePreference: (locale: Locale | null) => void;
  setPushPromptShown: (shown: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  reset: () => void;
}

export const APP_STORE_KEY = 'klokka.app.v1';

const initial = {
  userId: null,
  activeWorkspaceId: null,
  themePreference: 'SYSTEM' as ThemePreference,
  localePreference: null,
  pushPromptShown: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initial,
      hydrated: false,
      setUserId: (userId) => set({ userId }),
      setActiveWorkspace: (activeWorkspaceId) => set({ activeWorkspaceId }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setLocalePreference: (localePreference) => set({ localePreference }),
      setPushPromptShown: (pushPromptShown) => set({ pushPromptShown }),
      setHydrated: (hydrated) => set({ hydrated }),
      reset: () => set({ ...initial }),
    }),
    {
      name: APP_STORE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        userId: s.userId,
        activeWorkspaceId: s.activeWorkspaceId,
        themePreference: s.themePreference,
        localePreference: s.localePreference,
        pushPromptShown: s.pushPromptShown,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

// Sign-out wipes everything a previous user could be recognised by (Kulram's privacy lesson).
export async function resetAppStore(): Promise<void> {
  useAppStore.getState().reset();
  await AsyncStorage.removeItem(APP_STORE_KEY);
}
