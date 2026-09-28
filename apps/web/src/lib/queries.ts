'use client';

// Query keys and hooks over the generated client. One key per contract read model; every write
// invalidates what it changes (entries change the month, the insights and the member figures).
import { keepPreviousData, useQuery, type QueryClient } from '@tanstack/react-query';
import type { FlagStatus } from '@klokka/api-client';
import type { IsoDate, IsoMonth } from '@klokka/core';
import { api } from './api';
import { dateOf } from './time';

export const keys = {
  workspace: (id: string) => ['workspace', id] as const,
  members: (id: string, month: IsoMonth) => ['members', id, month] as const,
  entries: (id: string, from: IsoDate, to: IsoDate) => ['entries', id, from, to] as const,
  month: (id: string, month: IsoMonth) => ['month', id, month] as const,
  monthSummary: (id: string, month: IsoMonth) => ['month-summary', id, month] as const,
  memberMonth: (id: string, membershipId: string, month: IsoMonth) =>
    ['member-month', id, membershipId, month] as const,
  workspaceInsights: (id: string, month: IsoMonth) => ['workspace-insights', id, month] as const,
  memberInsights: (id: string, membershipId: string, month: IsoMonth) =>
    ['member-insights', id, membershipId, month] as const,
  flags: (id: string, status: FlagStatus | 'ALL') => ['flags', id, status] as const,
  flag: (id: string, flagId: string) => ['flags', id, 'one', flagId] as const,
  history: (id: string, entryId: string) => ['history', id, entryId] as const,
  notifications: (workspaceId: string, unreadOnly: boolean) =>
    ['notifications', workspaceId, unreadOnly] as const,
};

const FIGURES = new Set([
  'entries',
  'month',
  'month-summary',
  'member-month',
  'workspace-insights',
  'member-insights',
  'members',
  'flags',
  'history',
]);

// After any write that moves hours: every figure of the workspace is refetched (D9, the API owns them).
export function invalidateFigures(queryClient: QueryClient, workspaceId: string): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (q) => FIGURES.has(String(q.queryKey[0])) && q.queryKey[1] === workspaceId,
  });
}

export function useWorkspaceDetails(workspaceId: string) {
  return useQuery({
    queryKey: keys.workspace(workspaceId),
    queryFn: () => api.workspaces.getWorkspace({ workspaceId }),
  });
}

export function useMembers(workspaceId: string, month: IsoMonth) {
  return useQuery({
    queryKey: keys.members(workspaceId, month),
    queryFn: () => api.members.listMembers({ workspaceId, month }),
    placeholderData: keepPreviousData,
  });
}

export function useEntries(workspaceId: string, from: IsoDate, to: IsoDate) {
  return useQuery({
    queryKey: keys.entries(workspaceId, from, to),
    queryFn: () => api.entries.listEntries({ workspaceId, from: dateOf(from), to: dateOf(to) }),
  });
}

export function useMonthStatus(workspaceId: string, month: IsoMonth) {
  return useQuery({
    queryKey: keys.month(workspaceId, month),
    queryFn: () => api.months.getMonth({ workspaceId, month }),
  });
}

export function useMonthSummary(workspaceId: string, month: IsoMonth, enabled = true) {
  return useQuery({
    queryKey: keys.monthSummary(workspaceId, month),
    queryFn: () => api.months.getMonthSummary({ workspaceId, month }),
    enabled,
  });
}

export function useMemberMonth(workspaceId: string, membershipId: string | null, month: IsoMonth) {
  return useQuery({
    queryKey: keys.memberMonth(workspaceId, membershipId ?? '', month),
    queryFn: () => api.insights.getMemberMonth({ workspaceId, membershipId: membershipId ?? '', month }),
    enabled: membershipId !== null,
    placeholderData: keepPreviousData,
  });
}

export function useWorkspaceInsights(workspaceId: string, month: IsoMonth) {
  return useQuery({
    queryKey: keys.workspaceInsights(workspaceId, month),
    queryFn: () => api.insights.getWorkspaceInsights({ workspaceId, month }),
    placeholderData: keepPreviousData,
  });
}

export function useMemberInsights(workspaceId: string, membershipId: string, month: IsoMonth) {
  return useQuery({
    queryKey: keys.memberInsights(workspaceId, membershipId, month),
    queryFn: () => api.insights.getMemberInsights({ workspaceId, membershipId, month }),
    placeholderData: keepPreviousData,
  });
}

export function useFlags(workspaceId: string, status: FlagStatus | 'ALL') {
  return useQuery({
    queryKey: keys.flags(workspaceId, status),
    queryFn: () => api.flags.listFlags({ workspaceId, ...(status === 'ALL' ? {} : { status }) }),
  });
}

// One flag with its message and when it was raised (the Employee view's day panel, CHQ-145).
export function useFlag(workspaceId: string, flagId: string | null) {
  return useQuery({
    queryKey: keys.flag(workspaceId, flagId ?? ''),
    queryFn: () => api.flags.getFlag({ workspaceId, flagId: flagId ?? '' }),
    enabled: flagId !== null,
  });
}

export function useEntryHistory(workspaceId: string, entryId: string | null) {
  return useQuery({
    queryKey: keys.history(workspaceId, entryId ?? ''),
    queryFn: () => api.entries.getEntryHistory({ workspaceId, entryId: entryId ?? '' }),
    enabled: entryId !== null,
  });
}
