import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { useAppStore } from '@/store/appStore';
import { ThemeProvider, useTheme } from '@/theme';
import { ToastProvider } from '@/ui';

// Hold the splash until the persisted store has rehydrated, so the first frame is already in the
// user's mode and language rather than flashing the defaults.
void SplashScreen.preventAutoHideAsync();

function Navigator() {
  const theme = useTheme();
  const hydrated = useAppStore((s) => s.hydrated);
  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);
  if (!hydrated) return null;
  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.bg } }} />
    </>
  );
}

export default function RootLayout() {
  const themePreference = useAppStore((s) => s.themePreference);
  const localePreference = useAppStore((s) => s.localePreference);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <SafeAreaProvider>
          <ThemeProvider preference={themePreference}>
            <LocaleProvider preference={localePreference ?? undefined}>
              <ToastProvider>
                <Navigator />
              </ToastProvider>
            </LocaleProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
