import { useLocalSearchParams } from 'expo-router';
import { MemberMonthScreen } from '@/features/member/MemberMonthScreen';

export default function MemberRoute() {
  const { membershipId, month } = useLocalSearchParams<{ membershipId: string; month?: string }>();
  return (
    <MemberMonthScreen
      membershipId={membershipId}
      initialMonth={typeof month === 'string' ? month : undefined}
    />
  );
}
