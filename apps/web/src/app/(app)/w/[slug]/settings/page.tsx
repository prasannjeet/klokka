import { WorkspaceSettings } from '@/components/settings/workspace-settings';
import { requireEmployer } from '@/lib/me-server';

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireEmployer((await params).slug);
  return <WorkspaceSettings />;
}
