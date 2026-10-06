import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { Icon } from './Icon';
import { AppPressable } from './Pressable';

export interface StepperProps {
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  canDecrement?: boolean;
  canIncrement?: boolean;
  // The value shown between minus and plus.
  children?: ReactNode;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
    button: {
      width: STEP,
      height: STEP,
      borderRadius: t.radius.chip,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.color.border,
    },
    disabled: { opacity: 0.4 },
  });

const STEP = 36;

// A minus/plus pair, optionally around the value it changes. Buttons draw at 36 px; hitSlop keeps the tap floor.
export function Stepper({
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  canDecrement = true,
  canIncrement = true,
  children,
}: StepperProps) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  return (
    <View style={s.row}>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        disabled={!canDecrement}
        onPress={onDecrement}
        hapticKind="tick"
        hitSlop={(theme.tapMin - STEP) / 2}
        style={[s.button, canDecrement ? null : s.disabled]}
        testID="stepper-minus"
      >
        <Icon name="minus" size={18} color={theme.color.text} />
      </AppPressable>
      {children}
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        disabled={!canIncrement}
        onPress={onIncrement}
        hapticKind="tick"
        hitSlop={(theme.tapMin - STEP) / 2}
        style={[s.button, canIncrement ? null : s.disabled]}
        testID="stepper-plus"
      >
        <Icon name="plus" size={18} color={theme.color.text} />
      </AppPressable>
    </View>
  );
}
