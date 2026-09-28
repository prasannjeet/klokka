import { Suspense } from 'react';
import { WorkspaceHome } from './workspace-home';

export default function WorkspaceHomePage() {
  return (
    <Suspense>
      <WorkspaceHome />
    </Suspense>
  );
}
