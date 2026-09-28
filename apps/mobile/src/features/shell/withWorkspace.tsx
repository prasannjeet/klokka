import type { ComponentType } from 'react';
import { ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import type { MyWorkspace } from '@klokka/api-client';
import { useActiveWorkspace } from '@/data/me';
import { useTheme } from '@/theme';
import { Screen } from '@/ui';

export interface WorkspaceProps {
  workspace: MyWorkspace;
}

// Every workspace screen needs the active workspace before its first render (its queries take the
// id), so the guard hands it in as a prop and nothing below can meet a missing one. While /me is
// still loading the screen shows a spinner; when the workspace is gone (left, removed, a stale id
// restored from storage) the start route decides again instead of the screen throwing.
export function withWorkspace<P extends object>(Inner: ComponentType<P & WorkspaceProps>): ComponentType<P> {
  function WithWorkspace(props: P) {
    const theme = useTheme();
    const { workspace, me } = useActiveWorkspace();
    if (workspace) return <Inner {...props} workspace={workspace} />;
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
