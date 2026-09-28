import { useRouter } from 'expo-router';
import { ChooseWorkspaceScreen } from '@/features/workspaces/ChooseWorkspaceScreen';

export default function ChooseWorkspaceRoute() {
  const router = useRouter();
  return <ChooseWorkspaceScreen onChosen={() => router.replace('/')} />;
}
