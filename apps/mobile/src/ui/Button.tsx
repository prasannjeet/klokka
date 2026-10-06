import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { AppPressable } from './Pressable';
import type { HapticKind } from './haptics';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  hapticKind?: HapticKind | null;
  testID?: string;
  accessibilityLabel?: string;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 48,
      borderRadius: t.radius.control,
      paddingHorizontal: t.space[6],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.space[2],
    },
    compact: { minHeight: 36, paddingHorizontal: t.space[4], borderRadius: t.radius.chip },
    primary: { backgroundColor: t.color.primary },
    secondary: { backgroundColor: t.color.secondary },
    outline: { borderWidth: 1, borderColor: t.color.border, backgroundColor: 'transparent' },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: t.color.dangerSoft },
    disabled: { opacity: 0.5 },
  });

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  disabled,
  loading,
  compact,
  style,
  hapticKind = 'confirm',
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const textColor =
    variant === 'primary'
      ? theme.color.onPrimary
      : variant === 'secondary'
        ? theme.color.onSecondary
        : variant === 'danger'
          ? theme.color.danger
          : theme.color.text;
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      hapticKind={hapticKind}
      testID={testID}
      hitSlop={compact ? (theme.tapMin - 36) / 2 : undefined}
      style={[s.base, s[variant], compact ? s.compact : null, disabled || loading ? s.disabled : null, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space[2] }}>
          {icon ? <Icon name={icon} size={20} color={textColor} /> : null}
          <AppText variant={compact ? 'small' : 'body'} weight={600} color={textColor}>
            {label}
          </AppText>
          {iconRight ? <Icon name={iconRight} size={20} color={textColor} /> : null}
        </View>
      )}
    </AppPressable>
  );
}
