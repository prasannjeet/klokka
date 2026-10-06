import { useState, type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

// The Nightshift mesh (DIRECTION.md 4.2): three tinted gradients over the page colour. Only the sign-in
// screen draws it; app screens are flat (CHQ-162). Cheap Views and two LinearGradients, no blur.
export function Mesh() {
  const theme = useTheme();
  const { mesh1, mesh2, mesh3 } = theme.color;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={[mesh1, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.7 }}
        style={{ position: 'absolute', top: -80, right: -120, width: 420, height: 420, borderRadius: 210 }}
      />
      <LinearGradient
        colors={[mesh2, 'transparent']}
        start={{ x: 0, y: 1 }}
        end={{ x: 0.8, y: 0.2 }}
        style={{ position: 'absolute', bottom: -140, left: -140, width: 420, height: 420, borderRadius: 210 }}
      />
      <LinearGradient
        colors={[mesh3, 'transparent']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={{ position: 'absolute', bottom: -60, right: -40, width: 320, height: 320, borderRadius: 160 }}
      />
    </View>
  );
}

const styles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.color.bg },
    content: { paddingHorizontal: t.space[4], gap: t.space[4] },
  });

export interface ScreenProps extends Omit<ScrollViewProps, 'style' | 'contentContainerStyle'> {
  children: ReactNode;
  // A scrolling screen (default) or a fixed one that lays out its own list.
  scroll?: boolean;
  // Extra bottom space so a floating action or the tab bar never covers the last row.
  bottomInset?: number;
  padTop?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  // Pull to refresh: return the refetch, and the spinner shows until it settles. The screen owns the spinner, so a
  // background refetch never starts the native control: on iOS that moved the scroll view down, and on a tab not on
  // screen the offset stayed, so the tab opened half empty (CHQ-170).
  onRefresh?: () => Promise<unknown>;
  testID?: string;
}

export function Screen({
  children,
  scroll = true,
  bottomInset = 0,
  padTop = true,
  style,
  contentStyle,
  onRefresh,
  testID,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const insets = useSafeAreaInsets();
  const [pulling, setPulling] = useState(false);
  const pull = () => {
    if (!onRefresh) return;
    setPulling(true);
    void onRefresh()
      .catch(() => undefined)
      .finally(() => setPulling(false));
  };
  const padding = {
    paddingTop: (padTop ? insets.top : 0) + theme.space[4],
    paddingBottom: insets.bottom + theme.space[6] + bottomInset,
  };
  if (!scroll) {
    return (
      <View style={[s.root, style]} testID={testID}>
        <View style={[{ flex: 1 }, padding, contentStyle]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={[s.root, style]} testID={testID}>
      <ScrollView
        {...rest}
        contentContainerStyle={[s.content, padding, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={pulling} onRefresh={pull} tintColor={theme.color.primary} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}
