import { useT } from '@/i18n/LocaleProvider';
import { Header, Screen } from '@/ui';

export function NotificationsScreen() {
  const t = useT();
  return (
    <Screen testID="notifications-screen">
      <Header title={t('nav.notifications')} />
    </Screen>
  );
}
