import type { ComponentType } from 'react';
import { ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useActiveWorkspace } from '@/data/me';
import { useTheme } from '@/theme';
import { Screen } from '@/ui';

// Every workspace screen needs the active workspace before its first render (its queries take the
// id). While /me is still loading the screen shows a spinner; when the user has no workspace the
// index route takes over. Inside the wrapped screen `useWorkspaceOrThrow()` is then guaranteed.
export function withWorkspace<P extends object>(Inner: ComponentType<P>): ComponentType<P> {
  function WithWorkspace(props: P) {
    const theme = useTheme();
    const { workspace, me } = useActiveWorkspace();
    if (workspace) return <Inner {...props} />;
    if (me) return <Redirect href="/" />;
    return (
      <Screen
        scroll={false}
        contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
        testID="workspace-loading"
      >
        <ActivityIndicator color={theme.color.primary} />
      </Screen>
    );
  }
  WithWorkspace.displayName = `withWorkspace(${Inner.displayName ?? Inner.name})`;
  return WithWorkspace;
}
