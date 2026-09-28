import { useLocalSearchParams } from 'expo-router';
import { ShareScreen } from '@/features/share/ShareScreen';

export default function ShareRoute() {
  const { month } = useLocalSearchParams<{ month?: string }>();
  return <ShareScreen month={typeof month === 'string' ? month : undefined} />;
}
