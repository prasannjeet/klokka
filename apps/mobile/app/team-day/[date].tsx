import { useLocalSearchParams } from 'expo-router';
import { TeamDayScreen } from '@/features/team/TeamDayScreen';

export default function TeamDayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <TeamDayScreen date={date} />;
}
