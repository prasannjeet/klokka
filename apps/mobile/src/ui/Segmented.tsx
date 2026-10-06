import { StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { AppPressable } from './Pressable';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  testID?: string;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      gap: t.space[1],
      padding: t.space[1],
      borderRadius: t.radius.control,
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.border,
    },
    segment: {
      flex: 1,
      minHeight: 36,
      paddingHorizontal: t.space[2],
      borderRadius: t.radius.chip,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selected: { backgroundColor: t.color.border },
  });

// One choice out of two or three (repeat frequency, how a series ends): a track with the chosen segment
// raised. Labels may wrap to two lines on a narrow phone; the segment grows with them.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedProps<T>) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  return (
    <View style={s.track} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <AppPressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: on }}
            onPress={() => onChange(option.value)}
            hapticKind="tick"
            pressScale={0.98}
            hitSlop={{ top: 4, bottom: 4 }}
            style={[s.segment, on ? s.selected : null]}
            testID={option.testID}
          >
            <AppText
              variant="small"
              weight={600}
              color={on ? theme.color.text : theme.color.textMuted}
              align="center"
              numberOfLines={2}
            >
              {option.label}
            </AppText>
          </AppPressable>
        );
      })}
    </View>
  );
}
