import { useLocalSearchParams } from 'expo-router';
import { ResolveFlagScreen } from '@/features/flags/ResolveFlagScreen';

export default function FlagRoute() {
  const { flagId } = useLocalSearchParams<{ flagId: string }>();
  return <ResolveFlagScreen flagId={flagId} />;
}
