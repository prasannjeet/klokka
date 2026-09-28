import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { AppPressable } from './Pressable';
import { AppSheet, type SheetHandle } from './Sheet';

export interface Option<V extends string> {
  value: V;
  label: string;
  hint?: string | undefined;
}

export interface OptionSheetProps<V extends string> {
  title: string;
  subtitle?: string | undefined;
  closeLabel: string;
  options: readonly Option<V>[];
  value: V;
  onChange: (value: V) => void;
  testID?: string;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      paddingVertical: t.space[2],
    },
    selected: {
      backgroundColor: t.color.surface2,
      marginHorizontal: -t.space[3],
      paddingHorizontal: t.space[3],
      borderRadius: t.radius.md,
    },
  });

function OptionSheetInner<V extends string>(
  { title, subtitle, closeLabel, options, value, onChange, testID }: OptionSheetProps<V>,
  ref: React.Ref<SheetHandle>,
) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const sheet = useRef<SheetHandle>(null);
  useImperativeHandle(ref, () => ({
    present: () => sheet.current?.present(),
    dismiss: () => sheet.current?.dismiss(),
  }));
  return (
    <AppSheet ref={sheet} title={title} subtitle={subtitle} closeLabel={closeLabel} testID={testID}>
      <View>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <AppPressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => {
                onChange(option.value);
                sheet.current?.dismiss();
              }}
              hapticKind="tick"
              style={[s.row, selected ? s.selected : null]}
              testID={`option-${option.value}`}
            >
              <View style={{ flex: 1 }}>
                <AppText weight={selected ? 700 : 500}>{option.label}</AppText>
                {option.hint ? (
                  <AppText variant="small" tone="muted">
                    {option.hint}
                  </AppText>
                ) : null}
              </View>
              {selected ? <Icon name="check" size={20} color={theme.color.accent} /> : null}
            </AppPressable>
          );
        })}
      </View>
    </AppSheet>
  );
}

// A single-choice picker in a sheet (language, appearance, rounding, week start).
export const OptionSheet = forwardRef(OptionSheetInner) as <V extends string>(
  props: OptionSheetProps<V> & { ref?: React.Ref<SheetHandle> },
) => React.ReactElement;
