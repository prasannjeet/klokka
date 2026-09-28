// The week grid's state (CHQ-117/118): the saved values from the API, the edits made since, the raw text
// being typed, and per-cell problems from the last save. Pure, so the whole editing model is unit tested;
// the component only renders it and sends `batchItems` as ONE batch (docs/DECISIONS.md D8).
import {
  addDays,
  isWeekend,
  parseHours,
  roundHours,
  sumHours,
  type IsoDate,
  type Rounding,
} from '@klokka/core';

export interface CellValue {
  hours: number | null;
  note: string | null;
}

// What the grid needs of an Entry (the generated type has Dates; the component converts).
export interface EntryLike {
  membershipId: string;
  workDate: IsoDate;
  hours: number;
  note: string | null;
}

export interface GridState {
  base: Record<string, CellValue>;
  draft: Record<string, CellValue>;
  text: Record<string, string>;
  invalid: Record<string, true>;
  errors: Record<string, string>;
  saving: string[];
}

export const EMPTY: CellValue = { hours: null, note: null };

export function cellKey(membershipId: string, date: IsoDate): string {
  return `${membershipId}|${date}`;
}

export function splitKey(key: string): { membershipId: string; date: IsoDate } {
  const i = key.lastIndexOf('|');
  return { membershipId: key.slice(0, i), date: key.slice(i + 1) };
}

export const initialGrid: GridState = { base: {}, draft: {}, text: {}, invalid: {}, errors: {}, saving: [] };

export type GridAction =
  | { type: 'load'; entries: readonly EntryLike[] }
  | { type: 'type'; key: string; text: string }
  | { type: 'commit'; key: string; rounding: Rounding }
  | { type: 'set'; key: string; hours: number | null; rounding: Rounding }
  | { type: 'note'; key: string; note: string }
  | { type: 'revert'; key: string }
  | { type: 'fill'; keys: readonly string[]; hours: number; rounding: Rounding }
  | { type: 'discard' }
  | { type: 'saving' }
  | {
      type: 'saved';
      saved: readonly EntryLike[];
      removed: readonly { membershipId: string; workDate: IsoDate }[];
    }
  | { type: 'failed'; errors: Record<string, string> };

export function effective(state: GridState, key: string): CellValue {
  return state.draft[key] ?? state.base[key] ?? EMPTY;
}

function same(a: CellValue, b: CellValue): boolean {
  return a.hours === b.hours && (a.note ?? '') === (b.note ?? '');
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

// Put a value into the drafts, or drop the draft when it equals what is saved.
function withDraft(state: GridState, key: string, value: CellValue): GridState {
  const base = state.base[key] ?? EMPTY;
  const draft = same(value, base) ? without(state.draft, key) : { ...state.draft, [key]: value };
  return { ...state, draft, errors: without(state.errors, key) };
}

export function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'load': {
      const base: Record<string, CellValue> = {};
      for (const e of action.entries)
        base[cellKey(e.membershipId, e.workDate)] = { hours: e.hours, note: e.note };
      // Edits survive a refetch; one that now matches the server is done. While a save is in flight the
      // cache holds the optimistic values, so every edit is kept until the save answers (rollback safety).
      if (state.saving.length > 0) return { ...state, base };
      const draft: Record<string, CellValue> = {};
      for (const [key, value] of Object.entries(state.draft)) {
        if (!same(value, base[key] ?? EMPTY)) draft[key] = value;
      }
      return { ...state, base, draft };
    }
    case 'type': {
      const trimmed = action.text.trim();
      const text = { ...state.text, [action.key]: action.text };
      if (trimmed === '') {
        const next = withDraft({ ...state, text }, action.key, {
          ...effective(state, action.key),
          hours: null,
        });
        return { ...next, invalid: without(next.invalid, action.key) };
      }
      const hours = parseHours(trimmed);
      if (hours === null) return { ...state, text, invalid: { ...state.invalid, [action.key]: true } };
      const next = withDraft({ ...state, text }, action.key, { ...effective(state, action.key), hours });
      return { ...next, invalid: without(next.invalid, action.key) };
    }
    case 'commit': {
      // Leaving a cell: a bad value falls back to the last good one, a good one gets the workspace rounding.
      const current = effective(state, action.key);
      const rounded = current.hours === null ? null : roundHours(current.hours, action.rounding);
      const next = withDraft(state, action.key, { ...current, hours: rounded });
      return { ...next, text: without(next.text, action.key), invalid: without(next.invalid, action.key) };
    }
    case 'set': {
      const hours = action.hours === null ? null : roundHours(action.hours, action.rounding);
      const next = withDraft(state, action.key, { ...effective(state, action.key), hours });
      return { ...next, text: without(next.text, action.key), invalid: without(next.invalid, action.key) };
    }
    case 'note': {
      const note = action.note.trim() === '' ? null : action.note.trim();
      return withDraft(state, action.key, { ...effective(state, action.key), note });
    }
    case 'revert':
      return {
        ...state,
        draft: without(state.draft, action.key),
        text: without(state.text, action.key),
        invalid: without(state.invalid, action.key),
        errors: without(state.errors, action.key),
      };
    case 'fill': {
      let next = state;
      for (const key of action.keys) {
        if (effective(next, key).hours === null) {
          next = withDraft(next, key, {
            ...effective(next, key),
            hours: roundHours(action.hours, action.rounding),
          });
        }
      }
      return next;
    }
    case 'discard':
      return { ...state, draft: {}, text: {}, invalid: {}, errors: {}, saving: [] };
    case 'saving':
      return { ...state, saving: dirtyKeys(state), errors: {} };
    case 'saved': {
      const base = { ...state.base };
      let draft = { ...state.draft };
      for (const e of action.saved) {
        const key = cellKey(e.membershipId, e.workDate);
        base[key] = { hours: e.hours, note: e.note };
        draft = without(draft, key);
      }
      for (const r of action.removed) {
        const key = cellKey(r.membershipId, r.workDate);
        delete base[key];
        draft = without(draft, key);
      }
      // Anything sent but not echoed back is considered written as sent.
      for (const key of state.saving) {
        const sent = draft[key];
        if (sent) {
          if (sent.hours === null) delete base[key];
          else base[key] = sent;
          draft = without(draft, key);
        }
      }
      return { ...state, base, draft, text: {}, invalid: {}, errors: {}, saving: [] };
    }
    case 'failed':
      return { ...state, errors: action.errors, saving: [] };
  }
}

export function dirtyKeys(state: GridState): string[] {
  return Object.keys(state.draft).filter(
    (key) => !same(state.draft[key] as CellValue, state.base[key] ?? EMPTY),
  );
}

export function isDirty(state: GridState, key: string): boolean {
  return key in state.draft;
}

export function hasInvalid(state: GridState): boolean {
  return Object.keys(state.invalid).length > 0;
}

export function rowTotal(state: GridState, membershipId: string, dates: readonly IsoDate[]): number {
  return sumHours(dates.map((d) => effective(state, cellKey(membershipId, d)).hours ?? 0));
}

export function dayTotal(state: GridState, membershipIds: readonly string[], date: IsoDate): number {
  return sumHours(membershipIds.map((m) => effective(state, cellKey(m, date)).hours ?? 0));
}

export function weekTotal(
  state: GridState,
  membershipIds: readonly string[],
  dates: readonly IsoDate[],
): number {
  return sumHours(membershipIds.map((m) => rowTotal(state, m, dates)));
}

// The change the unsaved edits make to the week, for the save bar ("+4 h").
export function draftDelta(state: GridState): number {
  return sumHours(
    dirtyKeys(state).map((key) => (effective(state, key).hours ?? 0) - (state.base[key]?.hours ?? 0)),
  );
}

export interface BatchItemLike {
  membershipId: string;
  workDate: IsoDate;
  hours: number | null;
  note: string | null;
}

// The one batch for Save: every edited cell, hours null for a cleared day (the API removes the entry).
export function batchItems(state: GridState): BatchItemLike[] {
  return dirtyKeys(state)
    .sort()
    .map((key) => {
      const { membershipId, date } = splitKey(key);
      const value = effective(state, key);
      return { membershipId, workDate: date, hours: value.hours, note: value.note };
    });
}

// A problem's field errors (`items[3].hours`) back onto the cells that caused them.
export function errorsByCell(
  items: readonly BatchItemLike[],
  fieldErrors: readonly { field: string; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of fieldErrors) {
    const m = /^items\[(\d+)\]/.exec(e.field);
    const item = m ? items[Number(m[1])] : undefined;
    if (item) out[cellKey(item.membershipId, item.workDate)] = e.message;
  }
  return out;
}

// "Same as yesterday": the value of the day before for the same person, or null.
export function yesterdayHours(state: GridState, key: string): number | null {
  const { membershipId, date } = splitKey(key);
  return effective(state, cellKey(membershipId, addDays(date, -1))).hours;
}

// "Fill week": the person's empty working days (Monday to Friday) in the shown week.
export function fillKeys(state: GridState, membershipId: string, dates: readonly IsoDate[]): string[] {
  return dates
    .filter((d) => !isWeekend(d))
    .map((d) => cellKey(membershipId, d))
    .filter((key) => effective(state, key).hours === null);
}
