import { useRouter } from 'expo-router';
import { useT } from '@/i18n/LocaleProvider';
import { EmptyState, Screen } from '@/ui';

export default function NotFound() {
  const t = useT();
  const router = useRouter();
  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <EmptyState
        title={t('errors.NOT_FOUND')}
        actionLabel={t('nav.home')}
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
