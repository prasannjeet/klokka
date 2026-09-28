import { useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Me, MyWorkspace, PreferencesUpdate, UserProfileUpdate } from '@klokka/api-client';
import { isLocale } from '@klokka/core';
import { useApi } from '@/api/ApiProvider';
import { useAppStore } from '@/store/appStore';
import { keys } from './keys';

export function useMe() {
  const api = useApi();
  const setTheme = useAppStore((s) => s.setThemePreference);
  const setLocale = useAppStore((s) => s.setLocalePreference);
  // Polled while the app is in the foreground (TanStack pauses the interval in the background), so the
  // unread badge and the notification centre catch up without a push (CHQ-145), like the web.
  const query = useQuery({ queryKey: keys.me, queryFn: () => api.me.getMe(), refetchInterval: 60_000 });
  // Mirror the server-side preferences into the local store so the next cold start is right at once.
  useEffect(() => {
    const prefs = query.data?.preferences;
    if (!prefs) return;
    setTheme(prefs.theme);
    if (isLocale(prefs.language)) setLocale(prefs.language);
  }, [query.data?.preferences, setLocale, setTheme]);
  return query;
}

// The workspace the app is showing: the stored choice when it is still one of mine, else the only
// one, else none (the chooser decides). Also repairs the store when the stored id is stale.
export function pickActiveWorkspace(me: Me | undefined, storedId: string | null): MyWorkspace | null {
  if (!me) return null;
  const stored = storedId ? me.workspaces.find((w) => w.workspaceId === storedId) : undefined;
  if (stored) return stored;
  if (me.workspaces.length === 1) return me.workspaces[0] as MyWorkspace;
  return null;
}

export function useActiveWorkspace(): {
  workspace: MyWorkspace | null;
  me: Me | undefined;
  isLoading: boolean;
} {
  const { data: me, isLoading } = useMe();
  const storedId = useAppStore((s) => s.activeWorkspaceId);
  const setActive = useAppStore((s) => s.setActiveWorkspace);
  const workspace = pickActiveWorkspace(me, storedId);
  useEffect(() => {
    if (workspace && workspace.workspaceId !== storedId) setActive(workspace.workspaceId);
    if (!workspace && me && storedId && !me.workspaces.some((w) => w.workspaceId === storedId))
      setActive(null);
  }, [me, setActive, storedId, workspace]);
  return { workspace, me, isLoading };
}

export function useSwitchWorkspace() {
  const setActive = useAppStore((s) => s.setActiveWorkspace);
  return useCallback((workspaceId: string) => setActive(workspaceId), [setActive]);
}

export function useUpdatePreferences() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (preferencesUpdate: PreferencesUpdate) => api.me.updateMyPreferences({ preferencesUpdate }),
    onMutate: async (update) => {
      await qc.cancelQueries({ queryKey: keys.me });
      const previous = qc.getQueryData<Me>(keys.me);
      if (previous)
        qc.setQueryData<Me>(keys.me, {
          ...previous,
          preferences: { ...previous.preferences, ...stripUndefined(update) },
        });
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) qc.setQueryData(keys.me, context.previous);
    },
    onSuccess: (preferences) => {
      const previous = qc.getQueryData<Me>(keys.me);
      if (previous) qc.setQueryData<Me>(keys.me, { ...previous, preferences });
    },
  });
}

export function useUpdateMe() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userProfileUpdate: UserProfileUpdate) => api.me.updateMe({ userProfileUpdate }),
    onSuccess: (me) => qc.setQueryData(keys.me, me),
  });
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(value)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}
