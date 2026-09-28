import { useLocalSearchParams } from 'expo-router';
import { DayScreen } from '@/features/day/DayScreen';

export default function DayRoute() {
  const { membershipId, date } = useLocalSearchParams<{ membershipId: string; date: string }>();
  return <DayScreen membershipId={membershipId} date={date} />;
}
