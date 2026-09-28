import { useEffect, type ReactNode } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ApiProvider } from '@/api/ApiProvider';
import { useAuth } from '@/auth';
import { DataProvider } from '@/data/DataProvider';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { PushRuntime } from '@/features/push/PushRuntime';
import { useAppStore } from '@/store/appStore';

// Authentication is a RENDERING branch, not a route: a signed-out user has no app to navigate and
// the sign-in screen is deliberately not deep-linkable. The splash is held across the whole decision
// (store rehydration, then the secure-store session restore), so the first frame the user sees is
// either the sign-in screen or their workspace, never a flash of the wrong one.
export function AuthGate({ children, userId }: { children: ReactNode; userId: string | null }) {
  const { status } = useAuth();
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    if (status !== 'restoring' && hydrated) void SplashScreen.hideAsync();
  }, [hydrated, status]);

  if (status === 'restoring' || !hydrated) return null;
  if (status === 'signedOut') return <SignInScreen />;
  return (
    <ApiProvider>
      <DataProvider userId={userId}>
        <PushRuntime />
        {children}
      </DataProvider>
    </ApiProvider>
  );
}
