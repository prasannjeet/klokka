import { StyleSheet, View } from 'react-native';
import type { MyWorkspace } from '@klokka/api-client';
import { formatHours } from '@klokka/core';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { AppText, Avatar, Icon, PressableCard } from '@/ui';

const styles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3] },
    text: { flex: 1, minWidth: 0, gap: 2 },
    active: { borderColor: t.color.primary, borderWidth: 1.5 },
  });

// A workspace in the chooser and in the profile: emoji tile, name, the role line, hours this month.
export function WorkspaceRow({
  workspace,
  active,
  onPress,
  testID,
}: {
  workspace: MyWorkspace;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const theme = useTheme();
  const s = useThemedStyles(styles);
  const roleLine =
    workspace.role === 'EMPLOYER'
      ? t('role.employerPeople', { count: workspace.memberCount ?? 0 })
      : t('role.employeeLogsYourHours', { name: workspace.employerName ?? '' });
  return (
    <PressableCard
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${workspace.name}, ${roleLine}`}
      accessibilityState={{ selected: !!active }}
      style={active ? s.active : undefined}
      testID={testID}
    >
      <View style={s.row}>
        <Avatar name={workspace.name} emoji={workspace.emoji} colour={workspace.colour} size={44} square />
        <View style={s.text}>
          <AppText variant="h3" numberOfLines={1}>
            {workspace.name}
          </AppText>
          <AppText variant="small" tone="muted" numberOfLines={2}>
            {roleLine}
          </AppText>
          <AppText variant="small" tabular>
            <AppText variant="small" weight={700}>
              {formatHours(workspace.hoursThisMonth, locale)}
            </AppText>{' '}
            {t('profile.thisMonth')}
          </AppText>
        </View>
        <Icon
          name={active ? 'check' : 'chevron-right'}
          size={22}
          color={active ? theme.color.accent : theme.color.textMuted}
        />
      </View>
    </PressableCard>
  );
}
