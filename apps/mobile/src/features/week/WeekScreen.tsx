import { useT } from '@/i18n/LocaleProvider';
import { Header, Screen } from '@/ui';

export function WeekScreen() {
  const t = useT();
  return (
    <Screen testID="week-screen">
      <Header title={t('nav.week')} />
    </Screen>
  );
}
