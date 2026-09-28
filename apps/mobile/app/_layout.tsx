import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth';
import { AuthGate } from '@/features/shell/AuthGate';
import { useSystemUi } from '@/features/shell/useSystemUi';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { useAppStore } from '@/store/appStore';
import { ThemeProvider, useTheme } from '@/theme';
import { ToastProvider } from '@/ui';

// Hold the splash until the persisted store has rehydrated and the session is restored, so the
// first frame is already in the user's mode and language rather than flashing the defaults.
void SplashScreen.preventAutoHideAsync();

function Navigator() {
  const theme = useTheme();
  const userId = useAppStore((s) => s.userId);
  useSystemUi();
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <AuthGate userId={userId}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.bg } }} />
      </AuthGate>
    </>
  );
}

export default function RootLayout() {
  const themePreference = useAppStore((s) => s.themePreference);
  const localePreference = useAppStore((s) => s.localePreference);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Edge-to-edge Android does not resize the window for the IME; the provider publishes the inset
          the screens with inputs consume. Both translucency flags are load-bearing (Kulram KUL-152). */}
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <SafeAreaProvider>
          <ThemeProvider preference={themePreference}>
            <LocaleProvider preference={localePreference ?? undefined}>
              <ToastProvider>
                <AuthProvider>
                  <Navigator />
                </AuthProvider>
              </ToastProvider>
            </LocaleProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
