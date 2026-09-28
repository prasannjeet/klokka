'use client';

// One field at a time (settings.savesPerField): every change is sent on its own, shown at once through the
// caches that the whole UI reads (/me and the workspace details), put back with a message if the API
// refuses, and confirmed with a small "Saved" next to the row.
import { useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Me,
  MyWorkspace,
  PreferencesUpdate,
  UserProfileUpdate,
  Workspace,
  WorkspaceUpdate,
} from '@klokka/api-client';
import { api } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { meKey } from '@/lib/me';
import { problemMessage, toProblem } from '@/lib/problem';
import { invalidateFigures, keys } from '@/lib/queries';
import { useToast } from '../toast';

const SAVED_MS = 2200;

// Which row saved last, for the "Saved" pop; cleared after a moment.
export function useSavedRow(): [string | null, (row: string) => void] {
  const [row, setRow] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const mark = useCallback((next: string) => {
    window.clearTimeout(timer.current);
    setRow(next);
    timer.current = window.setTimeout(() => setRow(null), SAVED_MS);
  }, []);
  return [row, mark];
}

function useProblemToast() {
  const t = useT();
  const toast = useToast();
  return async (error: unknown) => toast({ title: problemMessage(t, await toProblem(error)), tone: 'error' });
}

type MyWorkspacePart = Partial<
  Pick<MyWorkspace, 'name' | 'colour' | 'emoji' | 'showPay' | 'currency' | 'timezone' | 'weekStart'>
>;

function myPart(update: WorkspaceUpdate): MyWorkspacePart {
  const part: MyWorkspacePart = {};
  if (update.name !== undefined) part.name = update.name;
  if (update.colour !== undefined) part.colour = update.colour;
  if (update.emoji !== undefined) part.emoji = update.emoji;
  if (update.showPay !== undefined) part.showPay = update.showPay;
  if (update.currency !== undefined) part.currency = update.currency;
  if (update.timezone !== undefined) part.timezone = update.timezone;
  if (update.weekStart !== undefined) part.weekStart = update.weekStart;
  return part;
}

interface WorkspaceSaveOptions {
  row: string;
  onSuccess?: () => void;
}

// PATCH /workspaces/{id} for one field, optimistic in the workspace details and in /me.
export function useWorkspaceSave(workspaceId: string, markSaved: (row: string) => void) {
  const queryClient = useQueryClient();
  const onProblem = useProblemToast();
  const mutation = useMutation({
    mutationFn: (update: WorkspaceUpdate) =>
      api.workspaces.updateWorkspace({ workspaceId, workspaceUpdate: update }),
  });

  return useCallback(
    async (update: WorkspaceUpdate, options: WorkspaceSaveOptions) => {
      const wsKey = keys.workspace(workspaceId);
      // A refetch still in flight would overwrite the optimistic values when it lands (or when its
      // cancellation reverts it), so it is cancelled first.
      await Promise.all([
        queryClient.cancelQueries({ queryKey: wsKey }),
        queryClient.cancelQueries({ queryKey: meKey }),
      ]);
      const beforeWs = queryClient.getQueryData<Workspace>(wsKey);
      const beforeMe = queryClient.getQueryData<Me>(meKey);
      queryClient.setQueryData<Workspace>(wsKey, (ws) => (ws ? { ...ws, ...update } : ws));
      const part = myPart(update);
      queryClient.setQueryData<Me>(meKey, (me) =>
        me
          ? {
              ...me,
              workspaces: me.workspaces.map((w) => (w.workspaceId === workspaceId ? { ...w, ...part } : w)),
            }
          : me,
      );
      mutation.mutate(update, {
        onSuccess: () => {
          markSaved(options.row);
          options.onSuccess?.();
        },
        onError: (error) => {
          if (beforeWs) queryClient.setQueryData(wsKey, beforeWs);
          if (beforeMe) queryClient.setQueryData(meKey, beforeMe);
          void onProblem(error);
        },
        onSettled: () => {
          void queryClient.invalidateQueries({ queryKey: wsKey });
          void queryClient.invalidateQueries({ queryKey: meKey });
          // Rounding, pay and currency change how every figure reads.
          if (update.showPay !== undefined || update.currency !== undefined)
            void invalidateFigures(queryClient, workspaceId);
        },
      });
    },
    [workspaceId, queryClient, mutation, markSaved, onProblem],
  );
}

// PATCH /me/preferences for one preference, optimistic in /me (PreferenceSync in lib/me.tsx follows it).
// `apply` runs in the same tick as the cache write (the locale, the mode), so PreferenceSync never sees the
// two disagree; `rollback` undoes it when the API refuses.
export function usePreferenceSave(markSaved: (row: string) => void) {
  const queryClient = useQueryClient();
  const onProblem = useProblemToast();
  const mutation = useMutation({
    mutationFn: (update: PreferencesUpdate) => api.me.updateMyPreferences({ preferencesUpdate: update }),
  });
  return useCallback(
    async (
      update: PreferencesUpdate,
      row: string,
      effects: { apply?: () => void; rollback?: () => void } = {},
    ) => {
      await queryClient.cancelQueries({ queryKey: meKey });
      const before = queryClient.getQueryData<Me>(meKey);
      queryClient.setQueryData<Me>(meKey, (me) =>
        me ? { ...me, preferences: { ...me.preferences, ...update } } : me,
      );
      effects.apply?.();
      mutation.mutate(update, {
        onSuccess: () => markSaved(row),
        onError: (error) => {
          if (before) queryClient.setQueryData(meKey, before);
          effects.rollback?.();
          void onProblem(error);
        },
        onSettled: () => void queryClient.invalidateQueries({ queryKey: meKey }),
      });
    },
    [queryClient, mutation, markSaved, onProblem],
  );
}

// PATCH /me for the name or the emoji avatar, optimistic in /me.
export function useProfileSave(markSaved: (row: string) => void) {
  const queryClient = useQueryClient();
  const onProblem = useProblemToast();
  const mutation = useMutation({
    mutationFn: (update: UserProfileUpdate) => api.me.updateMe({ userProfileUpdate: update }),
  });
  return useCallback(
    async (update: UserProfileUpdate, row: string) => {
      await queryClient.cancelQueries({ queryKey: meKey });
      const before = queryClient.getQueryData<Me>(meKey);
      queryClient.setQueryData<Me>(meKey, (me) => (me ? { ...me, user: { ...me.user, ...update } } : me));
      mutation.mutate(update, {
        onSuccess: () => markSaved(row),
        onError: (error) => {
          if (before) queryClient.setQueryData(meKey, before);
          void onProblem(error);
        },
        onSettled: () => void queryClient.invalidateQueries({ queryKey: meKey }),
      });
    },
    [queryClient, mutation, markSaved, onProblem],
  );
}
