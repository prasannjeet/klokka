import { useLocalSearchParams } from 'expo-router';
import { InvitationScreen } from '@/features/invitation/InvitationScreen';

export default function InvitationRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <InvitationScreen token={typeof token === 'string' ? token : ''} />;
}
