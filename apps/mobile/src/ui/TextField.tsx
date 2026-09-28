import { forwardRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';

export interface FieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    field: { gap: t.space[2] },
    input: {
      minHeight: 52,
      borderRadius: t.radius.md,
      borderWidth: 1.5,
      borderColor: t.color.border,
      backgroundColor: t.color.surface2,
      paddingHorizontal: t.space[4],
      paddingVertical: t.space[3],
      color: t.color.text,
      ...t.text('body', 500),
    },
    focused: { borderColor: t.color.focus },
    errored: { borderColor: t.color.danger },
    row: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
    suffix: { position: 'absolute', right: t.space[4] },
  });

export function Field({ label, hint, error, children, style }: FieldProps) {
  const s = useThemedStyles(styles);
  return (
    <View style={[s.field, style]}>
      <AppText variant="small" weight={600}>
        {label}
      </AppText>
      {children}
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  suffix?: string | undefined;
  containerStyle?: StyleProp<ViewStyle>;
}

// A labelled input on a tinted surface; the focus ring is the theme's focus colour.
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, suffix, containerStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} hint={hint} error={error} style={containerStyle}>
      <View style={s.row}>
        <TextInput
          ref={ref}
          {...rest}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          placeholderTextColor={theme.color.textMuted}
          selectionColor={theme.color.primary}
          cursorColor={theme.color.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            s.input,
            { flex: 1 },
            focused ? s.focused : null,
            error ? s.errored : null,
            suffix ? { paddingRight: theme.space[9] } : null,
            style,
          ]}
        />
        {suffix ? (
          <AppText variant="small" tone="muted" style={s.suffix}>
            {suffix}
          </AppText>
        ) : null}
      </View>
    </Field>
  );
});
