import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { PlatformPressable } from 'expo-router/react-navigation';
import { useTheme } from '@/theme';

// The bottom tab's button: the navigator's own pressable, plus the short primary bar on the tab bar's top edge
// when the tab is selected. It is the same mark as the web tab bar (apps/web globals.css
// `.tab[aria-current='page']::before`), so the active tab reads in light and dark alike, not by colour alone
// (CHQ-167). The bar hangs from the button's top by the tab bar's own top padding, so it sits on the edge on
// both platforms whatever the bar's height.
const BAR = { width: 26, height: 3 };

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    alignSelf: 'center',
    width: BAR.width,
    height: BAR.height,
    borderBottomLeftRadius: BAR.height,
    borderBottomRightRadius: BAR.height,
  },
});

export function TabButton({ children, ...props }: ComponentProps<typeof PlatformPressable>) {
  const theme = useTheme();
  return (
    <PlatformPressable {...props}>
      {props['aria-selected'] === true ? (
        <View
          testID="tab-indicator"
          style={[styles.bar, { top: -theme.space[2], backgroundColor: theme.color.primary }]}
        />
      ) : null}
      {children}
    </PlatformPressable>
  );
}
