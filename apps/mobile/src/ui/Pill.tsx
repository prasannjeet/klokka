import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type PillTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';

export interface PillProps {
  label: string;
  tone?: PillTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[1],
      alignSelf: 'flex-start',
      paddingHorizontal: t.space[3],
      paddingVertical: t.space[1],
      borderRadius: t.radius.pill,
      backgroundColor: t.color.surface2,
    },
  });

// A small labelled fact: a status, a delta, a count. Text on a soft tint, per the contrast table.
export function Pill({ label, tone = 'neutral', icon, style, testID }: PillProps) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const bg =
    tone === 'success'
      ? theme.color.successSoft
      : tone === 'warning'
        ? theme.color.warningSoft
        : tone === 'danger'
          ? theme.color.dangerSoft
          : tone === 'primary'
            ? theme.color.primary
            : theme.color.surface2;
  const fg =
    tone === 'success'
      ? theme.color.success
      : tone === 'warning'
        ? theme.color.warning
        : tone === 'danger'
          ? theme.color.danger
          : tone === 'primary'
            ? theme.color.onPrimary
            : tone === 'accent'
              ? theme.color.accent
              : theme.color.text;
  return (
    <View style={[s.pill, { backgroundColor: bg }, style]} testID={testID}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <AppText variant="caption" weight={600} color={fg}>
        {label}
      </AppText>
    </View>
  );
}
