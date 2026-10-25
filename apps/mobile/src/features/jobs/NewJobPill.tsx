import { StyleSheet } from 'react-native';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppPressable, AppText, Icon } from '@/ui';

const styles = (t: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space[1],
      minHeight: t.tapMin,
      paddingHorizontal: t.space[3],
      borderRadius: t.radius.pill,
      backgroundColor: t.color.primary,
    },
    disabled: { opacity: 0.5 },
  });

// The header's "New job" action (CHQ-185 on a person, CHQ-191 on the team day): one look wherever a job is
// planned from a screen's top. Disabled (a closed month) it stays in place, and the screen says why.
export function NewJobPill({
  onPress,
  disabled = false,
  accessibilityHint,
  testID,
}: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string | undefined;
  testID: string;
}) {
  const t = useT();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={t('jobs.newJob')}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hapticKind="select"
      style={[s.pill, disabled ? s.disabled : null]}
      testID={testID}
    >
      <Icon name="plus" size={18} color={theme.color.onPrimary} />
      <AppText variant="small" weight={600} color={theme.color.onPrimary} numberOfLines={1}>
        {t('jobs.newJob')}
      </AppText>
    </AppPressable>
  );
}
