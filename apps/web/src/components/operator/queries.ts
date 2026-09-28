'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { InvitationStatus, OperatorListWorkspacesSortEnum, Role } from '@klokka/api-client';
import { api } from '@/lib/api';

// Every operator read is aggregate data behind the platform-admin role; the server does sorting, filtering
// and paging, so each parameter is part of the key.
export const operatorKeys = {
  workspaces: (p: object) => ['operator', 'workspaces', p] as const,
  users: (p: object) => ['operator', 'users', p] as const,
  invitations: (p: object) => ['operator', 'invitations', p] as const,
  pending: ['operator', 'pending'] as const,
  volume: (month: string | null) => ['operator', 'volume', month ?? 'current'] as const,
  health: ['operator', 'health'] as const,
};

export const PAGE_SIZE = 12;

export function useOperatorWorkspaces(params: {
  q: string;
  pay: boolean | null;
  page: number;
  sort: OperatorListWorkspacesSortEnum;
}) {
  return useQuery({
    queryKey: operatorKeys.workspaces(params),
    queryFn: () =>
      api.operator.operatorListWorkspaces({
        page: params.page,
        pageSize: PAGE_SIZE,
        sort: params.sort,
        ...(params.q ? { q: params.q } : {}),
        ...(params.pay === null ? {} : { pay: params.pay }),
      }),
    placeholderData: keepPreviousData,
  });
}

export function useOperatorUsers(params: { q: string; role: Role | null; page: number }) {
  return useQuery({
    queryKey: operatorKeys.users(params),
    queryFn: () =>
      api.operator.operatorListUsers({
        page: params.page,
        pageSize: PAGE_SIZE,
        ...(params.q ? { q: params.q } : {}),
        ...(params.role ? { role: params.role } : {}),
      }),
    placeholderData: keepPreviousData,
  });
}

export function useOperatorInvitations(params: { status: InvitationStatus | null; page: number }) {
  return useQuery({
    queryKey: operatorKeys.invitations(params),
    queryFn: () =>
      api.operator.operatorListInvitations({
        page: params.page,
        pageSize: PAGE_SIZE,
        ...(params.status ? { status: params.status } : {}),
      }),
    placeholderData: keepPreviousData,
  });
}

// The nav badge: pending invitations across the instance.
export function usePendingInvitations() {
  return useQuery({
    queryKey: operatorKeys.pending,
    queryFn: () => api.operator.operatorListInvitations({ page: 1, pageSize: 1 }),
    select: (page) => page.summary.pending,
    refetchInterval: 120_000,
  });
}

export function useOperatorVolume(month: string | null) {
  return useQuery({
    queryKey: operatorKeys.volume(month),
    queryFn: () => api.operator.operatorVolume(month ? { month } : {}),
    placeholderData: keepPreviousData,
  });
}

export function useOperatorHealth() {
  return useQuery({
    queryKey: operatorKeys.health,
    queryFn: () => api.operator.operatorHealth(),
    refetchInterval: 60_000,
  });
}
