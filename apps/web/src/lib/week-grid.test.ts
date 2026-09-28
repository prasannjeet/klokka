import { describe, expect, it } from 'vitest';
import {
  batchItems,
  cellKey,
  dayTotal,
  dirtyKeys,
  draftDelta,
  effective,
  errorsByCell,
  fillKeys,
  gridReducer,
  hasInvalid,
  initialGrid,
  rowTotal,
  weekTotal,
  yesterdayHours,
  type EntryLike,
  type GridAction,
  type GridState,
} from './week-grid';

const MARIA = 'm-maria';
const JONAS = 'm-jonas';
const WEEK = [
  '2026-09-21',
  '2026-09-22',
  '2026-09-23',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-09-27',
];

function run(...actions: GridAction[]): GridState {
  return actions.reduce(gridReducer, initialGrid);
}

const LOADED: EntryLike[] = [
  { membershipId: MARIA, workDate: '2026-09-21', hours: 4, note: null },
  { membershipId: MARIA, workDate: '2026-09-23', hours: 6.5, note: 'Delivery day' },
  { membershipId: JONAS, workDate: '2026-09-21', hours: 8, note: null },
  { membershipId: JONAS, workDate: '2026-09-20', hours: 5, note: null },
];
const loaded: GridAction = { type: 'load', entries: LOADED };

const k = cellKey;

describe('week grid: loading and totals', () => {
  it('shows the saved values and adds them up per row, day and week', () => {
    const s = run(loaded);
    expect(effective(s, k(MARIA, '2026-09-23'))).toEqual({ hours: 6.5, note: 'Delivery day' });
    expect(rowTotal(s, MARIA, WEEK)).toBe(10.5);
    expect(dayTotal(s, [MARIA, JONAS], '2026-09-21')).toBe(12);
    expect(weekTotal(s, [MARIA, JONAS], WEEK)).toBe(18.5);
    expect(dirtyKeys(s)).toEqual([]);
  });

  it('keeps unsaved edits when the entries are fetched again, and drops those the server now has', () => {
    const s = run(
      loaded,
      { type: 'set', key: k(MARIA, '2026-09-22'), hours: 5, rounding: 'NONE' },
      { type: 'set', key: k(JONAS, '2026-09-22'), hours: 3, rounding: 'NONE' },
      {
        type: 'load',
        entries: [...LOADED, { membershipId: JONAS, workDate: '2026-09-22', hours: 3, note: null }],
      },
    );
    expect(dirtyKeys(s)).toEqual([k(MARIA, '2026-09-22')]);
  });
});

describe('week grid: typing', () => {
  it('accepts "7,5" and "7.5", marks the cell dirty and moves every total at once', () => {
    const s = run(loaded, { type: 'type', key: k(MARIA, '2026-09-22'), text: '7,5' });
    expect(effective(s, k(MARIA, '2026-09-22')).hours).toBe(7.5);
    expect(dirtyKeys(s)).toEqual([k(MARIA, '2026-09-22')]);
    expect(rowTotal(s, MARIA, WEEK)).toBe(18);
    expect(dayTotal(s, [MARIA, JONAS], '2026-09-22')).toBe(7.5);
    expect(weekTotal(s, [MARIA, JONAS], WEEK)).toBe(26);
    expect(draftDelta(s)).toBe(7.5);
  });

  it('holds on to text that is not an hours value without changing the entry, and blocks saving', () => {
    const s = run(loaded, { type: 'type', key: k(MARIA, '2026-09-21'), text: '4x' });
    expect(effective(s, k(MARIA, '2026-09-21')).hours).toBe(4);
    expect(s.text[k(MARIA, '2026-09-21')]).toBe('4x');
    expect(hasInvalid(s)).toBe(true);
    const left = gridReducer(s, { type: 'commit', key: k(MARIA, '2026-09-21'), rounding: 'NONE' });
    expect(hasInvalid(left)).toBe(false);
    expect(effective(left, k(MARIA, '2026-09-21')).hours).toBe(4);
    expect(dirtyKeys(left)).toEqual([]);
  });

  it('rejects more than 24 hours', () => {
    const s = run(loaded, { type: 'type', key: k(MARIA, '2026-09-22'), text: '25' });
    expect(hasInvalid(s)).toBe(true);
    expect(dirtyKeys(s)).toEqual([]);
  });

  it('applies the workspace rounding when the cell is left: 3.8 becomes 3.75 with quarter hours', () => {
    const s = run(
      loaded,
      { type: 'type', key: k(MARIA, '2026-09-22'), text: '3.8' },
      { type: 'commit', key: k(MARIA, '2026-09-22'), rounding: 'QUARTER' },
    );
    expect(effective(s, k(MARIA, '2026-09-22')).hours).toBe(3.75);
    const half = run(
      loaded,
      { type: 'type', key: k(MARIA, '2026-09-22'), text: '3.8' },
      { type: 'commit', key: k(MARIA, '2026-09-22'), rounding: 'HALF' },
    );
    expect(effective(half, k(MARIA, '2026-09-22')).hours).toBe(4);
  });

  it('is not dirty when the typed value equals the saved one', () => {
    const s = run(loaded, { type: 'type', key: k(MARIA, '2026-09-21'), text: '4' });
    expect(dirtyKeys(s)).toEqual([]);
  });

  it('clearing a saved day sends hours null so the API removes the entry', () => {
    const s = run(loaded, { type: 'type', key: k(JONAS, '2026-09-21'), text: '' });
    expect(batchItems(s)).toEqual([{ membershipId: JONAS, workDate: '2026-09-21', hours: null, note: null }]);
    expect(draftDelta(s)).toBe(-8);
  });

  it('Escape puts the saved value back', () => {
    const s = run(
      loaded,
      { type: 'type', key: k(MARIA, '2026-09-23'), text: '2' },
      { type: 'revert', key: k(MARIA, '2026-09-23') },
    );
    expect(effective(s, k(MARIA, '2026-09-23')).hours).toBe(6.5);
    expect(dirtyKeys(s)).toEqual([]);
    expect(s.text).toEqual({});
  });
});

describe('week grid: chips, same as yesterday, fill week, notes', () => {
  it('a chip sets the rounded value', () => {
    const s = run(loaded, { type: 'set', key: k(MARIA, '2026-09-24'), hours: 7.5, rounding: 'HALF' });
    expect(effective(s, k(MARIA, '2026-09-24')).hours).toBe(7.5);
  });

  it('same as yesterday reads the day before, across the week boundary too', () => {
    const s = run(loaded);
    expect(yesterdayHours(s, k(MARIA, '2026-09-22'))).toBe(4);
    expect(yesterdayHours(s, k(JONAS, '2026-09-21'))).toBe(5);
    expect(yesterdayHours(s, k(MARIA, '2026-09-25'))).toBeNull();
  });

  it('fill week fills the empty weekdays only, never the weekend or a logged day', () => {
    const s0 = run(loaded);
    const keys = fillKeys(s0, MARIA, WEEK);
    expect(keys).toEqual([k(MARIA, '2026-09-22'), k(MARIA, '2026-09-24'), k(MARIA, '2026-09-25')]);
    const s = gridReducer(s0, { type: 'fill', keys, hours: 7.5, rounding: 'NONE' });
    expect(rowTotal(s, MARIA, WEEK)).toBe(33);
    expect(effective(s, k(MARIA, '2026-09-26')).hours).toBeNull();
  });

  it('a note alone makes the cell dirty and travels in the batch', () => {
    const s = run(loaded, { type: 'note', key: k(MARIA, '2026-09-21'), note: ' Opened early ' });
    expect(batchItems(s)).toEqual([
      { membershipId: MARIA, workDate: '2026-09-21', hours: 4, note: 'Opened early' },
    ]);
  });
});

describe('week grid: saving as one batch', () => {
  const edited = run(
    loaded,
    { type: 'set', key: k(MARIA, '2026-09-22'), hours: 5, rounding: 'NONE' },
    { type: 'set', key: k(JONAS, '2026-09-21'), hours: null, rounding: 'NONE' },
  );

  it('builds one sorted batch of every edited cell', () => {
    expect(batchItems(edited)).toEqual([
      { membershipId: JONAS, workDate: '2026-09-21', hours: null, note: null },
      { membershipId: MARIA, workDate: '2026-09-22', hours: 5, note: null },
    ]);
  });

  it('a successful save takes the saved and removed rows as the new baseline', () => {
    const s = run(
      loaded,
      { type: 'set', key: k(MARIA, '2026-09-22'), hours: 5, rounding: 'NONE' },
      { type: 'set', key: k(JONAS, '2026-09-21'), hours: null, rounding: 'NONE' },
      { type: 'saving' },
      {
        type: 'saved',
        saved: [{ membershipId: MARIA, workDate: '2026-09-22', hours: 5, note: null }],
        removed: [{ membershipId: JONAS, workDate: '2026-09-21' }],
      },
    );
    expect(dirtyKeys(s)).toEqual([]);
    expect(s.saving).toEqual([]);
    expect(effective(s, k(MARIA, '2026-09-22')).hours).toBe(5);
    expect(effective(s, k(JONAS, '2026-09-21')).hours).toBeNull();
  });

  it('a problem keeps every edit and rings the cells the API named (rollback of the cache is the caller)', () => {
    const saving = gridReducer(edited, { type: 'saving' });
    expect(saving.saving).toHaveLength(2);
    const errors = errorsByCell(batchItems(edited), [
      { field: 'items[1].hours', message: 'Month is locked' },
    ]);
    const s = gridReducer(saving, { type: 'failed', errors });
    expect(dirtyKeys(s)).toHaveLength(2);
    expect(s.errors).toEqual({ [k(MARIA, '2026-09-22')]: 'Month is locked' });
    expect(s.saving).toEqual([]);
  });

  it('keeps every edit while a save is in flight, even when the cache shows the optimistic values', () => {
    const saving = gridReducer(edited, { type: 'saving' });
    const optimistic = gridReducer(saving, {
      type: 'load',
      entries: [
        { membershipId: MARIA, workDate: '2026-09-21', hours: 4, note: null },
        { membershipId: MARIA, workDate: '2026-09-22', hours: 5, note: null },
      ],
    });
    const failed = gridReducer(optimistic, { type: 'failed', errors: {} });
    const rolledBack = gridReducer(failed, loaded);
    expect(dirtyKeys(rolledBack).sort()).toEqual([k(JONAS, '2026-09-21'), k(MARIA, '2026-09-22')]);
    expect(effective(rolledBack, k(MARIA, '2026-09-22')).hours).toBe(5);
  });

  it('discard drops every edit', () => {
    const s = gridReducer(edited, { type: 'discard' });
    expect(dirtyKeys(s)).toEqual([]);
    expect(weekTotal(s, [MARIA, JONAS], WEEK)).toBe(18.5);
  });
});
