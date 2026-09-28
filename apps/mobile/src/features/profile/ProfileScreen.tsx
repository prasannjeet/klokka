import { useT } from '@/i18n/LocaleProvider';
import { Header, Screen } from '@/ui';

export function ProfileScreen() {
  const t = useT();
  return (
    <Screen testID="profile-screen">
      <Header title={t('nav.profile')} />
    </Screen>
  );
}
