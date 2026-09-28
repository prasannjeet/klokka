import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { type StyleSheet, useColorScheme } from 'react-native';
import type { ThemePreference } from '@klokka/api-client';
import { darkTheme, lightTheme, type Mode, type Theme } from './theme';

// Light and dark follow the device by default, with a manual override (CHQ-139). The override is
// the user's server-side preference (`Preferences.theme`), mirrored in the local store so the very
// first frame after a cold start already has the right mode.

const ThemeContext = createContext<Theme>(darkTheme);

export function resolveMode(
  preference: ThemePreference | undefined,
  device: string | null | undefined,
): Mode {
  if (preference === 'LIGHT') return 'light';
  if (preference === 'DARK') return 'dark';
  return device === 'light' ? 'light' : 'dark';
}

export interface ThemeProviderProps {
  preference?: ThemePreference | undefined;
  children: ReactNode;
}

export function ThemeProvider({ preference, children }: ThemeProviderProps) {
  const device = useColorScheme();
  const mode = resolveMode(preference, device);
  const theme = mode === 'light' ? lightTheme : darkTheme;
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

// `const styles = useThemedStyles(themedStyles)` with `const themedStyles = (t: Theme) => StyleSheet.create({...})`
// memoised per theme object, so a mode flip is the only thing that re-creates a sheet.
const cache = new WeakMap<object, Map<object, unknown>>();

export function themedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): (theme: Theme) => T {
  return (theme) => {
    let perTheme = cache.get(theme);
    if (!perTheme) {
      perTheme = new Map();
      cache.set(theme, perTheme);
    }
    let sheet = perTheme.get(factory) as T | undefined;
    if (!sheet) {
      sheet = factory(theme);
      perTheme.set(factory, sheet);
    }
    return sheet;
  };
}

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => themedStyles(factory)(theme), [factory, theme]);
}
