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
}

const styles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: t.space[2] },
    button: {
      width: t.tapMin + 4,
      height: t.tapMin + 4,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.surface2,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    disabled: { opacity: 0.4 },
  });

// The minus/plus pair next to the hours numeral in the add-hours sheet.
export function Stepper({
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  canDecrement = true,
  canIncrement = true,
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
        style={[s.button, canDecrement ? null : s.disabled]}
        testID="stepper-minus"
      >
        <Icon name="minus" size={22} color={theme.color.text} />
      </AppPressable>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        disabled={!canIncrement}
        onPress={onIncrement}
        hapticKind="tick"
        style={[s.button, canIncrement ? null : s.disabled]}
        testID="stepper-plus"
      >
        <Icon name="plus" size={22} color={theme.color.text} />
      </AppPressable>
    </View>
  );
}
