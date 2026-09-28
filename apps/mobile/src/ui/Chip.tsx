import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { AppPressable } from './Pressable';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  // Stagger index for the pop-in when a row of chips appears (DIRECTION.md: Pop).
  index?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    chip: {
      minHeight: t.tapMin,
      paddingHorizontal: t.space[4],
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
      borderWidth: 1,
      borderColor: t.color.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.space[1],
    },
    selected: { backgroundColor: t.color.primary, borderColor: t.color.primary },
  });

// A quick-hour chip or a reason chip: selected is a primary fill, a tick haptic on every tap.
export function Chip({
  label,
  selected,
  onPress,
  icon,
  index = 0,
  style,
  testID,
  accessibilityLabel,
}: ChipProps) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const reduced = useReducedMotion();
  const fg = selected ? theme.color.onPrimary : theme.color.text;
  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(index * 40).duration(theme.motion.duration.base)}
      style={style}
    >
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected: !!selected }}
        onPress={onPress}
        hapticKind="tick"
        pressScale={0.95}
        style={[s.chip, selected ? s.selected : null]}
        testID={testID}
      >
        {icon ? <Icon name={icon} size={16} color={fg} /> : null}
        <AppText variant="small" weight={600} color={fg} tabular>
          {label}
        </AppText>
      </AppPressable>
    </Animated.View>
  );
}
