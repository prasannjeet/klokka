import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme, type FontWeight, type TypeRole } from '@/theme';

export type TextTone =
  'text' | 'muted' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'onPrimary' | 'inherit';

export interface AppTextProps extends TextProps {
  variant?: TypeRole;
  weight?: FontWeight;
  tone?: TextTone;
  // Tabular figures for columns of numbers (DIRECTION.md section 8).
  tabular?: boolean;
  align?: TextStyle['textAlign'];
  color?: string;
}

// The one Text: role picks the family, size and leading from the theme, tone the colour.
export function AppText({
  variant: role = 'body',
  weight,
  tone = 'text',
  tabular,
  align,
  color,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const toneColor =
    color ??
    (tone === 'inherit'
      ? undefined
      : tone === 'muted'
        ? theme.color.textMuted
        : tone === 'text'
          ? theme.color.text
          : theme.color[tone]);
  return (
    <Text
      {...rest}
      style={[
        theme.text(role, weight),
        toneColor ? { color: toneColor } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}
