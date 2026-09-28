import type { IsoDate, IsoMonth } from '@klokka/core';

// Query keys: `['me', ...]` for the user's own data, `['ws', workspaceId, ...]` for everything inside
// a workspace, so no cache ever mixes across workspaces (docs/research/mobile.md section 6).
export const keys = {
  me: ['me'] as const,
  notifications: (workspaceId: string | null) => ['me', 'notifications', workspaceId ?? 'all'] as const,
  invitation: (token: string) => ['invitation', token] as const,
  ws: (id: string) => ['ws', id] as const,
  workspace: (id: string) => ['ws', id, 'workspace'] as const,
  members: (id: string, month?: string) => ['ws', id, 'members', month ?? 'current'] as const,
  member: (id: string, membershipId: string, month?: string) =>
    ['ws', id, 'member', membershipId, month ?? 'current'] as const,
  entries: (id: string, from: IsoDate, to: IsoDate, membershipId?: string) =>
    ['ws', id, 'entries', from, to, membershipId ?? 'all'] as const,
  entryHistory: (id: string, entryId: string) => ['ws', id, 'history', entryId] as const,
  month: (id: string, month: IsoMonth) => ['ws', id, 'month', month] as const,
  monthSummary: (id: string, month: IsoMonth) => ['ws', id, 'monthSummary', month] as const,
  memberMonth: (id: string, membershipId: string, month: IsoMonth) =>
    ['ws', id, 'memberMonth', membershipId, month] as const,
  insights: (id: string, month?: string) => ['ws', id, 'insights', month ?? 'current'] as const,
  memberInsights: (id: string, membershipId: string, month?: string) =>
    ['ws', id, 'memberInsights', membershipId, month ?? 'current'] as const,
  flags: (id: string, status?: string) => ['ws', id, 'flags', status ?? 'all'] as const,
};
