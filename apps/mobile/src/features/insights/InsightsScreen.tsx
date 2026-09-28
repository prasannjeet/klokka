import { useT } from '@/i18n/LocaleProvider';
import { Header, Screen } from '@/ui';

export function InsightsScreen() {
  const t = useT();
  return (
    <Screen testID="insights-screen">
      <Header title={t('nav.insights')} />
    </Screen>
  );
}
