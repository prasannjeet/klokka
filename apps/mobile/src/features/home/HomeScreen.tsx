import { useT } from '@/i18n/LocaleProvider';
import { Header, Screen } from '@/ui';

export function HomeScreen() {
  const t = useT();
  return (
    <Screen testID="home-screen">
      <Header title={t('nav.home')} />
    </Screen>
  );
}
