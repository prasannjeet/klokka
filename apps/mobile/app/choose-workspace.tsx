import { enterApp } from '@/features/shell/enterApp';
import { ChooseWorkspaceScreen } from '@/features/workspaces/ChooseWorkspaceScreen';

export default function ChooseWorkspaceRoute() {
  return <ChooseWorkspaceScreen onChosen={enterApp} />;
}
