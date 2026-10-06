import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { AppPressable } from './Pressable';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    chip: {
      minHeight: CHIP,
      paddingHorizontal: t.space[3],
      borderRadius: t.radius.chip,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.color.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.space[1],
    },
    selected: { backgroundColor: t.color.secondary, borderColor: t.color.secondary },
  });

const CHIP = 32;

// A quick-hour chip or a reason chip: selected is a secondary fill, a tick haptic on every tap. No entering
// animation: a translating one left chips 25 px off their slot on Android (CHQ-162, ui/motion.test.ts).
// The chip draws at 32 px; hitSlop keeps the 44 px tap floor.
export function Chip({ label, selected, onPress, icon, style, testID, accessibilityLabel }: ChipProps) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const fg = selected ? theme.color.onSecondary : theme.color.text;
  return (
    <View style={style}>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected: !!selected }}
        onPress={onPress}
        hapticKind="tick"
        pressScale={0.95}
        hitSlop={(theme.tapMin - CHIP) / 2}
        style={[s.chip, selected ? s.selected : null]}
        testID={testID}
      >
        {icon ? <Icon name={icon} size={16} color={fg} /> : null}
        <AppText variant="small" weight={600} color={fg} tabular>
          {label}
        </AppText>
      </AppPressable>
    </View>
  );
}
