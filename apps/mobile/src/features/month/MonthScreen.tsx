import { useT } from '@/i18n/LocaleProvider';
import { Header, Screen } from '@/ui';

export function MonthScreen() {
  const t = useT();
  return (
    <Screen testID="month-screen">
      <Header title={t('nav.month')} />
    </Screen>
  );
}
