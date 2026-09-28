import { useT } from '@/i18n/LocaleProvider';
import { EmptyState, Screen } from '@/ui';
import { enterApp } from '@/features/shell/enterApp';

export default function NotFound() {
  const t = useT();
  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <EmptyState title={t('errors.NOT_FOUND')} actionLabel={t('nav.home')} onAction={enterApp} />
    </Screen>
  );
}
