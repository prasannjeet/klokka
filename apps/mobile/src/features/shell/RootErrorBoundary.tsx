import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';
import { clearPersistedCache } from '@/data/queryClient';
import { useT } from '@/i18n/LocaleProvider';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';
import { Button, EmptyState, Screen } from '@/ui';
import { enterApp } from './enterApp';

// Everything a bad state could survive a restart in: the persisted query cache and the stored
// workspace choice. Navigation state is not persisted (expo-router keeps it in memory only).
export async function clearRecoverableState(): Promise<void> {
  const userId = useAppStore.getState().userId;
  useAppStore.getState().setActiveWorkspace(null);
  if (userId) await clearPersistedCache(userId);
}

// A crash that escapes React (an event handler, a promise) ends the process in a release build. The
// wrapped global handler clears the same state first, bounded so a hung storage never keeps a dead
// app alive, so the next start begins clean instead of crashing again (CHQ-145).
const CLEAR_TIMEOUT_MS = 750;
let installed = false;

export function installCrashGuard(): void {
  if (installed || typeof ErrorUtils === 'undefined') return;
  installed = true;
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    if (!isFatal) {
      previous(error, isFatal);
      return;
    }
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, CLEAR_TIMEOUT_MS));
    void Promise.race([clearRecoverableState().catch(() => undefined), timeout]).finally(() =>
      previous(error, isFatal),
    );
  });
}

// Recovers at most this often automatically; a second crash inside the window shows the fallback so a
// screen that fails on every render cannot loop.
const LOOP_WINDOW_MS = 10_000;

interface State {
  failed: boolean;
  attempt: number;
}

// The root error boundary: a render crash clears the recoverable state, remounts the whole signed-in
// tree (a fresh query client restoring nothing) and sends the app to the start route.
export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false, attempt: 0 };
  private lastRecovery = 0;
  private recovering = false;

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Klokka recovered from a crash', error, info.componentStack);
    const now = Date.now();
    const looping = now - this.lastRecovery < LOOP_WINDOW_MS;
    void clearRecoverableState()
      .catch(() => undefined)
      .finally(() => {
        if (!looping) this.restart();
      });
  }

  componentDidUpdate(_prev: unknown, prevState: State): void {
    if (this.recovering && prevState.failed && !this.state.failed) {
      this.recovering = false;
      enterApp();
    }
  }

  restart = (): void => {
    this.lastRecovery = Date.now();
    this.recovering = true;
    this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
  };

  render(): ReactNode {
    if (this.state.failed) return <CrashScreen onRestart={this.restart} />;
    return (
      <View style={{ flex: 1 }} key={this.state.attempt}>
        {this.props.children}
      </View>
    );
  }
}

function CrashScreen({ onRestart }: { onRestart: () => void }) {
  const t = useT();
  const theme = useTheme();
  return (
    <Screen
      scroll={false}
      contentStyle={{ justifyContent: 'center', gap: theme.space[4], paddingHorizontal: theme.space[5] }}
      testID="crash-screen"
    >
      <EmptyState icon="alert" title={t('mobile.crash.title')} body={t('mobile.crash.body')} />
      <Button label={t('mobile.crash.restart')} onPress={onRestart} testID="crash-restart" />
    </Screen>
  );
}
