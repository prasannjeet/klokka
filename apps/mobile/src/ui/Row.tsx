import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { AppPressable } from './Pressable';

export interface RowProps {
  title: string;
  subtitle?: string | undefined;
  value?: string | undefined;
  leading?: ReactNode;
  trailing?: ReactNode;
  icon?: IconName;
  chevron?: boolean;
  onPress?: (() => void) | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  danger?: boolean;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[3],
      paddingVertical: t.space[3],
    },
    body: { flex: 1, minWidth: 0 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: t.color.border },
  });

// A settings or list row: title, optional subtitle, a value or control on the right, a chevron when
// it navigates. Content sizes it; 56 is only the tap floor.
export function Row({
  title,
  subtitle,
  value,
  leading,
  trailing,
  icon,
  chevron,
  onPress,
  style,
  testID,
  accessibilityLabel,
  danger,
}: RowProps) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const content = (
    <View style={[s.row, style]}>
      {leading ??
        (icon ? (
          <Icon name={icon} size={22} color={danger ? theme.color.danger : theme.color.textMuted} />
        ) : null)}
      <View style={s.body}>
        <AppText weight={500} tone={danger ? 'danger' : 'text'} numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="small" tone="muted" tabular>
          {value}
        </AppText>
      ) : null}
      {trailing}
      {(chevron ?? (onPress && !trailing)) ? (
        <Icon name="chevron-right" size={20} color={theme.color.textMuted} />
      ) : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <AppPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      testID={testID}
      pressScale={0.995}
    >
      {content}
    </AppPressable>
  );
}

export function Separator() {
  const s = useThemedStyles(styles);
  return <View style={s.separator} />;
}
