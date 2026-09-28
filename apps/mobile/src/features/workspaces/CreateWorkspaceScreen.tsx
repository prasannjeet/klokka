import { useT } from '@/i18n/LocaleProvider';
import { Header, Screen } from '@/ui';

export function CreateWorkspaceScreen() {
  const t = useT();
  return (
    <Screen testID="create-workspace">
      <Header title={t('workspace.createTitle')} back />
    </Screen>
  );
}
