import { useT } from '@/i18n/LocaleProvider';
import { Header, Screen } from '@/ui';

export function SettingsScreen() {
  const t = useT();
  return (
    <Screen testID="settings-screen">
      <Header title={t('nav.settings')} />
    </Screen>
  );
}
