import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { useT } from '@/i18n/LocaleProvider';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { AppPressable } from './Pressable';

export interface HeaderProps {
  title: string;
  subtitle?: string | undefined;
  // Renders a back button that pops the stack.
  back?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  // Display face (a screen title) or the smaller h3 (a pushed screen).
  large?: boolean;
}

const styles = (t: Theme) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.tapMin },
    text: { flex: 1, minWidth: 0 },
    iconButton: {
      width: t.tapMin,
      height: t.tapMin,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.pill,
      marginLeft: -t.space[2],
    },
  });

// The top of a screen: optional back, the title in Unbounded, an optional action on the right.
export function Header({ title, subtitle, back, leading, trailing, large = true }: HeaderProps) {
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const router = useRouter();
  const t = useT();
  return (
    <View style={s.header}>
      {back ? (
        <AppPressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={s.iconButton}
          testID="header-back"
        >
          <Icon name="chevron-left" size={26} color={theme.color.text} />
        </AppPressable>
      ) : null}
      {leading}
      <View style={s.text}>
        <AppText variant={large ? 'h1' : 'h3'} numberOfLines={2} accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
