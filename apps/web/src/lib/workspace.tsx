'use client';

// The workspace in the URL (/w/[slug]) as the signed-in user sees it: role, pay switch, currency, zone.
// Everything comes from /me (docs/DECISIONS.md D1: membership decided by the API), kept live by useMe.
import { createContext, useContext, type ReactNode } from 'react';
import type { MyWorkspace } from '@klokka/api-client';
import { useMyWorkspace } from './me';

export interface WorkspaceView {
  my: MyWorkspace;
  id: string;
  slug: string;
  membershipId: string;
  isEmployer: boolean;
  // The pay switch: when false no money figure is rendered anywhere (CHQ-128).
  showPay: boolean;
  currency: string;
  timezone: string;
}

const SlugContext = createContext<string | null>(null);

export function WorkspaceSlug({ slug, children }: { slug: string; children: ReactNode }) {
  return <SlugContext.Provider value={slug}>{children}</SlugContext.Provider>;
}

export function useWorkspaceSlug(): string {
  const slug = useContext(SlugContext);
  if (!slug) throw new Error('useWorkspaceSlug outside /w/[slug]');
  return slug;
}

export function viewOf(my: MyWorkspace): WorkspaceView {
  return {
    my,
    id: my.workspaceId,
    slug: my.slug,
    membershipId: my.membershipId,
    isEmployer: my.role === 'EMPLOYER',
    showPay: my.showPay,
    currency: my.currency,
    timezone: my.timezone,
  };
}

// Null only in the moment after the user lost access (removed from the workspace); pages render nothing then.
export function useWorkspaceView(): WorkspaceView | null {
  const my = useMyWorkspace(useWorkspaceSlug());
  return my ? viewOf(my) : null;
}

export function useWorkspace(): WorkspaceView {
  const view = useWorkspaceView();
  if (!view) throw new Error('workspace not in /me');
  return view;
}
