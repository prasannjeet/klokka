// Conversions between the generated Entry (Dates) and the grid's plain values, and the optimistic cache
// update for a batch: the entries list shows the new values before the API answers (TanStack's cache
// approach, docs/research/web.md section 9), and is put back if it refuses.
import type { Actor, Entry } from '@klokka/api-client';
import type { BatchItemLike, EntryLike } from './week-grid';
import { dateOf, isoOf } from './time';

export function entryLike(entry: Entry): EntryLike {
  return {
    membershipId: entry.membershipId,
    workDate: isoOf(entry.workDate),
    hours: entry.hours,
    note: entry.note ?? null,
  };
}

export function applyBatch(
  entries: readonly Entry[],
  items: readonly BatchItemLike[],
  context: { workspaceId: string; actor: Actor; names: Record<string, string>; now: Date },
): Entry[] {
  const key = (membershipId: string, date: string) => `${membershipId}|${date}`;
  const byKey = new Map(entries.map((e) => [key(e.membershipId, isoOf(e.workDate)), e]));
  for (const item of items) {
    const k = key(item.membershipId, item.workDate);
    const existing = byKey.get(k);
    if (item.hours === null) {
      byKey.delete(k);
    } else if (existing) {
      byKey.set(k, {
        ...existing,
        hours: item.hours,
        note: item.note,
        earnings: null,
        updatedAt: context.now,
        updatedBy: context.actor,
      });
    } else {
      byKey.set(k, {
        id: `optimistic-${k}`,
        workspaceId: context.workspaceId,
        membershipId: item.membershipId,
        memberName: context.names[item.membershipId] ?? '',
        workDate: dateOf(item.workDate),
        hours: item.hours,
        note: item.note,
        earnings: null,
        locked: false,
        createdAt: context.now,
        createdBy: context.actor,
        updatedAt: context.now,
        updatedBy: context.actor,
        changeCount: 0,
      });
    }
  }
  return [...byKey.values()];
}
