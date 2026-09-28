import { useEffect } from 'react';
import * as SystemUI from 'expo-system-ui';
import { useTheme } from '@/theme';

// Dark mode everywhere (CHQ-139): the root view behind every screen and the Android system bars
// follow the resolved mode, so a transition or a sheet never flashes the other mode's background.
export function useSystemUi(): void {
  const theme = useTheme();
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.color.bg).catch(() => undefined);
  }, [theme.color.bg]);
}
