import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth';
import { clearPersistedCache } from '@/data/queryClient';
import { resetAppStore, useAppStore } from '@/store/appStore';
import { unregisterPushToken } from '@/features/push/pushToken';
import { useApi } from '@/api/ApiProvider';

// Sign-out clears the broker, the secure store, the persisted query cache and every store, and
// unregisters the push token, then ends the Logto session in the Custom Tab (Kulram's privacy lesson).
export function useSignOut(): () => Promise<void> {
  const { signOut } = useAuth();
  const api = useApi();
  const qc = useQueryClient();
  return useCallback(async () => {
    const userId = useAppStore.getState().userId;
    await signOut(async () => {
      await unregisterPushToken(api).catch(() => undefined);
      qc.clear();
      if (userId) await clearPersistedCache(userId);
      await resetAppStore();
    });
  }, [api, qc, signOut]);
}
