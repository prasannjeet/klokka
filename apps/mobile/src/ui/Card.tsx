import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useThemedStyles, type Theme } from '@/theme';
import { AppPressable, type AppPressableProps } from './Pressable';

// DIRECTION.md section 8: surface, hairline border, card radius, a soft elevation.
const styles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.color.surface,
      borderColor: t.color.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: t.radius.card,
      padding: t.space[4],
    },
    tint: { backgroundColor: t.color.surface2 },
  });

export interface CardProps extends ViewProps {
  tint?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ tint, style, ...rest }: CardProps) {
  const s = useThemedStyles(styles);
  return <View {...rest} style={[s.card, tint ? s.tint : null, style]} />;
}

export function PressableCard({ style, ...rest }: AppPressableProps) {
  const s = useThemedStyles(styles);
  return <AppPressable {...rest} style={[s.card, style]} />;
}
