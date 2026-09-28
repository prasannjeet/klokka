import { useCallback } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { haptic, type HapticKind } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface AppPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  // Press feedback: scale 0.985 (DIRECTION.md section 5), respecting reduce motion.
  pressScale?: number;
  hapticKind?: HapticKind | null;
}

// Every tappable thing goes through here so the press scale and the haptic are one behaviour.
export function AppPressable({
  style,
  pressScale = 0.985,
  hapticKind = 'select',
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: AppPressableProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const duration = theme.motion.duration.fast;

  const handleIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!reduced) scale.value = withTiming(pressScale, { duration });
      onPressIn?.(e);
    },
    [duration, onPressIn, pressScale, reduced, scale],
  );
  const handleOut = useCallback(
    (e: GestureResponderEvent) => {
      if (!reduced) scale.value = withTiming(1, { duration });
      onPressOut?.(e);
    },
    [duration, onPressOut, reduced, scale],
  );
  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (hapticKind) void haptic(hapticKind);
      onPress?.(e);
    },
    [hapticKind, onPress],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handleIn}
      onPressOut={handleOut}
      onPress={handlePress}
      style={[animated, style]}
    />
  );
}
