import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { loadMe } from '@/lib/me-server';
import { WorkspaceSlug } from '@/lib/workspace';

// A workspace the user is a member of; anything else is a 404, not a hint that it exists.
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const me = await loadMe();
  if (!me.workspaces.some((w) => w.slug === slug)) notFound();
  return (
    <WorkspaceSlug slug={slug}>
      <AppShell>{children}</AppShell>
    </WorkspaceSlug>
  );
}
