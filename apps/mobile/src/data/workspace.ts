import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Entry,
  EntryUpsert,
  FlagCreate,
  FlagResolve,
  FlagStatus,
  JobWrite,
  JobChangeScope,
  MemberInvite,
  MemberUpdate,
  WorkspaceCreate,
  WorkspaceUpdate,
} from '@klokka/api-client';
import type { IsoDate, IsoMonth } from '@klokka/core';
import { useApi } from '@/api/ApiProvider';
import { fromIsoDate } from '@/lib/dates';
import { keys } from './keys';

// Every read model the workspace screens show, straight from the API (docs/DECISIONS.md D9), and
// the writes with the invalidations they cause. Nothing here recomputes a total.

export function useWorkspace(workspaceId: string) {
  const api = useApi();
  return useQuery({
    queryKey: keys.workspace(workspaceId),
    queryFn: () => api.workspaces.getWorkspace({ workspaceId }),
  });
}

export function useMembers(workspaceId: string, month?: IsoMonth) {
  const api = useApi();
  return useQuery({
    queryKey: keys.members(workspaceId, month),
    queryFn: () => api.members.listMembers(month ? { workspaceId, month } : { workspaceId }),
  });
}

export function useMember(workspaceId: string, membershipId: string, month?: IsoMonth, enabled = true) {
  const api = useApi();
  return useQuery({
    enabled,
    queryKey: keys.member(workspaceId, membershipId, month),
    queryFn: () =>
      api.members.getMember(month ? { workspaceId, membershipId, month } : { workspaceId, membershipId }),
  });
}

export function useEntries(
  workspaceId: string,
  from: IsoDate,
  to: IsoDate,
  membershipId?: string,
  enabled = true,
) {
  const api = useApi();
  return useQuery({
    enabled,
    queryKey: keys.entries(workspaceId, from, to, membershipId),
    queryFn: () =>
      api.entries.listEntries({
        workspaceId,
        from: fromIsoDate(from),
        to: fromIsoDate(to),
        ...(membershipId ? { membershipId } : {}),
      }),
  });
}

export function useEntryHistory(workspaceId: string, entryId: string | null | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: keys.entryHistory(workspaceId, entryId ?? ''),
    queryFn: () => api.entries.getEntryHistory({ workspaceId, entryId: entryId as string }),
    enabled: !!entryId,
  });
}

export function useMonthStatus(workspaceId: string, month: IsoMonth) {
  const api = useApi();
  return useQuery({
    queryKey: keys.month(workspaceId, month),
    queryFn: () => api.months.getMonth({ workspaceId, month }),
  });
}

export function useMonthSummary(workspaceId: string, month: IsoMonth, enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: keys.monthSummary(workspaceId, month),
    queryFn: () => api.months.getMonthSummary({ workspaceId, month }),
    enabled,
  });
}

export function useMemberMonth(workspaceId: string, membershipId: string, month: IsoMonth) {
  const api = useApi();
  return useQuery({
    queryKey: keys.memberMonth(workspaceId, membershipId, month),
    queryFn: () => api.insights.getMemberMonth({ workspaceId, membershipId, month }),
  });
}

export function useWorkspaceInsights(workspaceId: string, month?: IsoMonth) {
  const api = useApi();
  return useQuery({
    queryKey: keys.insights(workspaceId, month),
    queryFn: () => api.insights.getWorkspaceInsights(month ? { workspaceId, month } : { workspaceId }),
  });
}

// `enabled` false when the employer has turned analysis off for employees (the API answers 403 then).
export function useMemberInsights(
  workspaceId: string,
  membershipId: string,
  month?: IsoMonth,
  enabled = true,
) {
  const api = useApi();
  return useQuery({
    enabled,
    queryKey: keys.memberInsights(workspaceId, membershipId, month),
    queryFn: () =>
      api.insights.getMemberInsights(
        month ? { workspaceId, membershipId, month } : { workspaceId, membershipId },
      ),
  });
}

export function useFlags(workspaceId: string, status?: FlagStatus) {
  const api = useApi();
  return useQuery({
    queryKey: keys.flags(workspaceId, status),
    queryFn: () => api.flags.listFlags(status ? { workspaceId, status } : { workspaceId }),
  });
}

// One flag by id (the resolve screen opened from a push, a notification row or the Home card).
export function useFlag(workspaceId: string, flagId: string) {
  const api = useApi();
  return useQuery({
    queryKey: keys.flag(workspaceId, flagId),
    queryFn: () => api.flags.getFlag({ workspaceId, flagId }),
  });
}

export function useNotifications(workspaceId: string | null, unreadOnly: boolean) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: [...keys.notifications(workspaceId), unreadOnly ? 'unread' : 'all'],
    queryFn: ({ pageParam }) =>
      api.notifications.listNotifications({
        ...(workspaceId ? { workspaceId } : {}),
        unreadOnly,
        limit: 30,
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 60_000,
  });
}

// ---- writes ----

function useInvalidateWorkspace(workspaceId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.ws(workspaceId) }),
      qc.invalidateQueries({ queryKey: keys.me }),
    ]);
}

export function useCreateWorkspace() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceCreate: WorkspaceCreate) => api.workspaces.createWorkspace({ workspaceCreate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function useUpdateWorkspace(workspaceId: string) {
  const api = useApi();
  const qc = useQueryClient();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: (workspaceUpdate: WorkspaceUpdate) =>
      api.workspaces.updateWorkspace({ workspaceId, workspaceUpdate }),
    onSuccess: (workspace) => {
      qc.setQueryData(keys.workspace(workspaceId), workspace);
      void invalidate();
    },
  });
}

export function useInviteMember(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: (memberInvite: MemberInvite) => api.members.inviteMember({ workspaceId, memberInvite }),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateMember(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: ({ membershipId, update }: { membershipId: string; update: MemberUpdate }) =>
      api.members.updateMember({ workspaceId, membershipId, memberUpdate: update }),
    onSuccess: () => void invalidate(),
  });
}

export function useRemoveMember(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: (membershipId: string) => api.members.removeMember({ workspaceId, membershipId }),
    onSuccess: () => void invalidate(),
  });
}

export function useResendInvitation(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: (membershipId: string) => api.members.resendInvitation({ workspaceId, membershipId }),
    onSuccess: () => void invalidate(),
  });
}

export interface UpsertEntryInput {
  membershipId: string;
  date: IsoDate;
  entry: EntryUpsert;
}

// The quick add: optimistic on every entries list that contains the date, rolled back on error.
export function useUpsertEntry(workspaceId: string) {
  const api = useApi();
  const qc = useQueryClient();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: ({ membershipId, date, entry }: UpsertEntryInput) =>
      api.entries.upsertEntry({ workspaceId, membershipId, date: fromIsoDate(date), entryUpsert: entry }),
    onMutate: async ({ membershipId, date, entry }) => {
      await qc.cancelQueries({ queryKey: ['ws', workspaceId, 'entries'] });
      const snapshots = qc.getQueriesData<Entry[]>({ queryKey: ['ws', workspaceId, 'entries'] });
      for (const [key, list] of snapshots) {
        if (!list) continue;
        const [, , , from, to, member] = key as ReturnType<typeof keys.entries>;
        if (date < from || date > to || (member !== 'all' && member !== membershipId)) continue;
        const existing = list.find((e) => e.membershipId === membershipId && sameDate(e.workDate, date));
        const next = existing
          ? list.map((e) => (e === existing ? { ...e, hours: entry.hours, note: entry.note ?? null } : e))
          : list;
        qc.setQueryData(key, next);
      }
      return { snapshots };
    },
    onError: (_e, _v, context) => {
      for (const [key, list] of context?.snapshots ?? []) qc.setQueryData(key, list);
    },
    onSettled: () => void invalidate(),
  });
}

export function useDeleteEntry(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: ({ membershipId, date }: { membershipId: string; date: IsoDate }) =>
      api.entries.deleteEntry({ workspaceId, membershipId, date: fromIsoDate(date) }),
    onSettled: () => void invalidate(),
  });
}

// Jobs (CHQ-156): the day's entry is the sum of its jobs, so every write refreshes the workspace.
export function useCreateJob(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: ({ membershipId, date, job }: { membershipId: string; date: IsoDate; job: JobWrite }) =>
      api.jobs.createJob({ workspaceId, membershipId, date: fromIsoDate(date), jobWrite: job }),
    onSettled: () => void invalidate(),
  });
}

export function useUpdateJob(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: ({ jobId, job, scope }: { jobId: string; job: JobWrite; scope?: JobChangeScope }) =>
      api.jobs.updateJob({ workspaceId, jobId, jobWrite: job, scope }),
    onSettled: () => void invalidate(),
  });
}

export function useDeleteJob(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: (target: string | { jobId: string; scope: JobChangeScope }) =>
      api.jobs.deleteJob({ workspaceId, ...(typeof target === 'string' ? { jobId: target } : target) }),
    onSettled: () => void invalidate(),
  });
}

// Places go through the API, which holds the Maps key (CHQ-156). `session` ties one search together.
export function usePlaceSearch(workspaceId: string, input: string, session: string) {
  const api = useApi();
  const query = input.trim();
  return useQuery({
    queryKey: ['ws', workspaceId, 'places', 'search', query],
    queryFn: () => api.places.autocompletePlaces({ workspaceId, input: query, session }),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

export function useRecentPlaces(workspaceId: string, enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: ['ws', workspaceId, 'places', 'recent'],
    queryFn: () => api.places.listRecentPlaces({ workspaceId }),
    enabled,
  });
}

export function useLockMonth(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: ({ month, lock }: { month: IsoMonth; lock: boolean }) =>
      lock ? api.months.lockMonth({ workspaceId, month }) : api.months.unlockMonth({ workspaceId, month }),
    onSettled: () => void invalidate(),
  });
}

export function useExportMonthCsv(workspaceId: string) {
  const api = useApi();
  return useMutation({
    mutationFn: ({ month, membershipId }: { month: IsoMonth; membershipId?: string }) =>
      api.months.exportMonthCsv(membershipId ? { workspaceId, month, membershipId } : { workspaceId, month }),
  });
}

export function useRaiseFlag(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: ({ entryId, flag }: { entryId: string; flag: FlagCreate }) =>
      api.flags.raiseFlag({ workspaceId, entryId, flagCreate: flag }),
    onSettled: () => void invalidate(),
  });
}

export function useResolveFlag(workspaceId: string) {
  const api = useApi();
  const invalidate = useInvalidateWorkspace(workspaceId);
  return useMutation({
    mutationFn: ({ flagId, resolve }: { flagId: string; resolve: FlagResolve }) =>
      api.flags.resolveFlag({ workspaceId, flagId, flagResolve: resolve }),
    onSettled: () => void invalidate(),
  });
}

export function useMarkNotificationRead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => api.notifications.markNotificationRead({ notificationId }),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['me', 'notifications'] }),
        qc.invalidateQueries({ queryKey: keys.me }),
      ]),
  });
}

export function useMarkAllNotificationsRead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string | null) =>
      api.notifications.markAllNotificationsRead(workspaceId ? { workspaceId } : {}),
    onSettled: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['me', 'notifications'] }),
        qc.invalidateQueries({ queryKey: keys.me }),
      ]),
  });
}

export function useAcceptInvitation() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => api.invitations.acceptInvitation({ token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

export function sameDate(date: Date, iso: IsoDate): boolean {
  return (
    date.getFullYear() === Number(iso.slice(0, 4)) &&
    date.getMonth() + 1 === Number(iso.slice(5, 7)) &&
    date.getDate() === Number(iso.slice(8, 10))
  );
}
