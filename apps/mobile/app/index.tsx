import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/auth';
import { useActiveWorkspace } from '@/data/me';
import { useT } from '@/i18n/LocaleProvider';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/theme';
import { AppText, Button, EmptyState, Screen, Wordmark } from '@/ui';
import { useSignOut } from '@/features/shell/useSignOut';

// The first screen after sign-in decides where the app goes: the tabs of the active workspace, the
// chooser when there are several and none is chosen, or the empty state when the user belongs to
// no workspace yet (first invitations are web-first, docs/DECISIONS.md D3).
export default function Index() {
  const t = useT();
  const theme = useTheme();
  const router = useRouter();
  const { status } = useAuth();
  const { workspace, me, isLoading } = useActiveWorkspace();
  const setUserId = useAppStore((s) => s.setUserId);
  const signOut = useSignOut();

  useEffect(() => {
    if (me) setUserId(me.user.id);
  }, [me, setUserId]);

  if (status !== 'signedIn') return null;
  if (workspace) return <Redirect href={workspace.role === 'EMPLOYER' ? '/(tabs)/home' : '/(tabs)/month'} />;
  if (me && me.workspaces.length > 1) return <Redirect href="/choose-workspace" />;
  if (me) {
    return (
      <Screen
        scroll={false}
        contentStyle={{ justifyContent: 'center', gap: theme.space[6], paddingHorizontal: theme.space[5] }}
        testID="no-workspaces"
      >
        <Wordmark />
        <EmptyState icon="mail" title={t('mobile.noWorkspaces.title')} body={t('mobile.noWorkspaces.body')} />
        <Button
          label={t('nav.createWorkspace')}
          variant="secondary"
          icon="plus"
          onPress={() => router.push('/create-workspace')}
        />
        <Button label={t('common.signOut')} variant="ghost" onPress={() => void signOut()} />
      </Screen>
    );
  }
  if (isLoading) {
    return (
      <Screen scroll={false} contentStyle={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.color.primary} />
      </Screen>
    );
  }
  return (
    <Screen
      scroll={false}
      contentStyle={{ justifyContent: 'center', gap: theme.space[4], paddingHorizontal: theme.space[5] }}
    >
      <EmptyState
        icon="alert"
        title={t('errors.NETWORK')}
        actionLabel={t('common.retry')}
        onAction={() => router.replace('/')}
      />
      <View style={{ alignItems: 'center' }}>
        <AppText variant="caption" tone="muted">
          {t('common.appName')}
        </AppText>
      </View>
      <Button label={t('common.signOut')} variant="ghost" onPress={() => void signOut()} />
    </Screen>
  );
}
