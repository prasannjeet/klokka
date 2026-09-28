import { View } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useMe, useSwitchWorkspace } from '@/data/me';
import { useT } from '@/i18n/LocaleProvider';
import { useTheme } from '@/theme';
import { AppText, Screen, Wordmark } from '@/ui';
import { WorkspaceRow } from './WorkspaceRow';

// Shown after sign-in when a person belongs to more than one workspace (mockup "Choose workspace").
export function ChooseWorkspaceScreen({ onChosen }: { onChosen: () => void }) {
  const t = useT();
  const theme = useTheme();
  const { data: me } = useMe();
  const switchTo = useSwitchWorkspace();
  const reduced = useReducedMotion();
  const workspaces = me?.workspaces ?? [];
  return (
    <Screen testID="choose-workspace">
      <Wordmark />
      <View style={{ gap: theme.space[2] }}>
        <AppText variant="h1" accessibilityRole="header">
          {t('nav.chooseWorkspace')}
        </AppText>
        <AppText variant="lead" tone="muted">
          {t('mobile.chooseWorkspace.hint', { count: workspaces.length })}
        </AppText>
      </View>
      <View style={{ gap: theme.space[3] }}>
        {workspaces.map((w, i) => (
          <Animated.View
            key={w.workspaceId}
            entering={
              reduced
                ? undefined
                : FadeInUp.delay(i * theme.motion.duration.stagger).duration(theme.motion.duration.base)
            }
          >
            <WorkspaceRow
              workspace={w}
              onPress={() => {
                switchTo(w.workspaceId);
                onChosen();
              }}
              testID={`workspace-${w.workspaceId}`}
            />
          </Animated.View>
        ))}
      </View>
      <AppText variant="caption" tone="muted" align="center">
        {t('mobile.chooseWorkspace.rolesHint')}
      </AppText>
    </Screen>
  );
}
