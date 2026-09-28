'use client';

// The week grid (CHQ-117 grid and keyboard, CHQ-118 chips, fill week, notes and the one Save): every
// employee's week like a spreadsheet. Edits collect as drafts, Save sends ONE batch (D8), the entries
// cache is updated optimistically and put back when the API answers with a problem.
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Entry, EntryBatchResult } from '@klokka/api-client';
import {
  QUICK_CHIPS,
  addDays,
  formatDate,
  formatHours,
  formatHoursDelta,
  formatMonthName,
  intlLocale,
  isoWeek,
  monthOf,
  weekOf,
  type IsoDate,
} from '@klokka/core';
import { CsvButton } from '@/components/csv-button';
import { Icon } from '@/components/icons';
import { MonthLockButton, UnlockButton } from '@/components/month-lock';
import { Money } from '@/components/money';
import { BodyPortal } from '@/components/portal';
import { useToast } from '@/components/toast';
import { ViewHeader } from '@/components/view-header';
import { api } from '@/lib/api';
import { applyBatch, entryLike } from '@/lib/entries';
import { useLocale, useT } from '@/lib/i18n';
import { useMe } from '@/lib/me';
import { problemMessage, toProblem } from '@/lib/problem';
import {
  invalidateFigures,
  keys,
  useEntries,
  useMembers,
  useMonthStatus,
  useWorkspaceDetails,
} from '@/lib/queries';
import { dateOf, isoOf, todayIn } from '@/lib/time';
import { firstName } from '@/lib/visual';
import {
  batchItems,
  cellKey,
  dirtyKeys,
  draftDelta,
  effective,
  errorsByCell,
  fillKeys,
  gridReducer,
  hasInvalid,
  initialGrid,
  rowTotal,
  splitKey,
  weekTotal,
  yesterdayHours,
  type BatchItemLike,
} from '@/lib/week-grid';
import { useWorkspace } from '@/lib/workspace';
import { WeekGrid, type GridRow } from './week-grid';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function WeekView() {
  const t = useT();
  const locale = useLocale();
  const ws = useWorkspace();
  const me = useMe();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const queryClient = useQueryClient();

  const details = useWorkspaceDetails(ws.id);
  const rounding = details.data?.rounding ?? 'NONE';
  const dayHours = details.data?.defaultDayHours ?? 8;
  const weekStart = details.data?.weekStart ?? ws.my.weekStart;
  const today = todayIn(ws.timezone);
  const param = search.get('d');
  const anchor: IsoDate = param && DATE_RE.test(param) ? param : today;
  const dates = useMemo(() => weekOf(anchor, weekStart), [anchor, weekStart]);
  const from = dates[0] as IsoDate;
  const to = dates[6] as IsoDate;
  const fetchFrom = addDays(from, -1);
  const months = [...new Set([monthOf(from), monthOf(to)])];

  const members = useMembers(ws.id, monthOf(anchor));
  const entries = useEntries(ws.id, fetchFrom, to);
  const statusA = useMonthStatus(ws.id, monthOf(from));
  const statusB = useMonthStatus(ws.id, monthOf(to));
  const lockedMonths = useMemo(
    () => new Set([statusA.data, statusB.data].filter((s) => s?.locked).map((s) => s?.month as string)),
    [statusA.data, statusB.data],
  );

  const [state, dispatch] = useReducer(gridReducer, initialGrid);
  const [selected, setSelected] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [popped, setPopped] = useState<ReadonlySet<string>>(new Set());
  const inputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (entries.data) dispatch({ type: 'load', entries: entries.data.map(entryLike) });
  }, [entries.data]);

  const rows: GridRow[] = useMemo(
    () =>
      (members.data ?? [])
        .filter((m) => m.role === 'EMPLOYEE' && (m.status === 'ACTIVE' || m.status === 'INVITED'))
        .map((m) => ({
          id: m.id,
          name: m.displayName,
          emoji: m.avatarEmoji ?? null,
          rate: m.hourlyRate ?? null,
        })),
    [members.data],
  );
  const names = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r.name])), [rows]);
  const entryByKey = useMemo(
    () => new Map((entries.data ?? []).map((e) => [cellKey(e.membershipId, isoOf(e.workDate)), e])),
    [entries.data],
  );

  const dirty = dirtyKeys(state);
  const isLocked = useCallback(
    (key: string) => lockedMonths.has(monthOf(splitKey(key).date)) || entryByKey.get(key)?.locked === true,
    [lockedMonths, entryByKey],
  );

  // Leaving the page with unsaved edits asks first (the browser's own dialog).
  useEffect(() => {
    if (dirty.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty.length]);

  const listNames = (ids: readonly string[]) =>
    new Intl.ListFormat(intlLocale(locale), { type: 'conjunction' }).format(
      ids.map((id) => firstName(names[id] ?? '')),
    );

  const entriesKey = keys.entries(ws.id, fetchFrom, to);
  const save = useMutation({
    mutationFn: (items: BatchItemLike[]) =>
      api.entries.batchUpsertEntries({
        workspaceId: ws.id,
        entryBatchRequest: {
          items: items.map((i) => ({
            membershipId: i.membershipId,
            workDate: dateOf(i.workDate),
            hours: i.hours,
            note: i.note,
          })),
        },
      }),
    onMutate: async (items) => {
      dispatch({ type: 'saving' });
      await queryClient.cancelQueries({ queryKey: entriesKey });
      const before = queryClient.getQueryData<Entry[]>(entriesKey);
      queryClient.setQueryData<Entry[]>(entriesKey, (list) =>
        applyBatch(list ?? [], items, {
          workspaceId: ws.id,
          actor: { userId: me.user.id, name: me.user.name },
          names,
          now: new Date(),
        }),
      );
      return { before };
    },
    onError: async (error, items, context) => {
      if (context?.before) queryClient.setQueryData(entriesKey, context.before);
      const problem = await toProblem(error);
      const byCell = errorsByCell(items, problem.errors);
      const message = problemMessage(t, problem);
      const errors =
        Object.keys(byCell).length > 0
          ? byCell
          : Object.fromEntries(items.map((i) => [cellKey(i.membershipId, i.workDate), message]));
      dispatch({ type: 'failed', errors });
      toast({ title: message, body: t('web.week.failed'), tone: 'error' });
    },
    onSuccess: (result: EntryBatchResult, items) => {
      dispatch({
        type: 'saved',
        saved: result.saved.map(entryLike),
        removed: result.removed.map((r) => ({ membershipId: r.membershipId, workDate: isoOf(r.workDate) })),
      });
      const keysSaved = new Set(items.map((i) => cellKey(i.membershipId, i.workDate)));
      setPopped(keysSaved);
      window.setTimeout(() => setPopped(new Set()), 700);
      const people = [...new Set(items.map((i) => i.membershipId))];
      toast({
        title: t('web.week.saved'),
        body: t('web.week.savedBody', { count: people.length, names: listNames(people) }),
      });
    },
    onSettled: () => invalidateFigures(queryClient, ws.id),
  });

  function goTo(date: IsoDate | null) {
    if (dirty.length > 0) {
      toast({ title: t('web.week.unsavedTitle'), body: t('web.week.unsavedBody'), icon: 'alert' });
      return;
    }
    router.replace(date ? `${pathname}?d=${date}` : pathname, { scroll: false });
  }

  function focusCell(key: string) {
    const el = inputs.current.get(key);
    if (el) {
      el.focus();
      el.select();
    }
  }

  function needSelection(): string | null {
    if (!selected) {
      toast({ title: t('web.week.selectFirst'), body: t('web.week.selectFirstBody'), icon: 'info' });
      return null;
    }
    if (isLocked(selected)) return null;
    return selected;
  }

  function chip(hours: number) {
    const key = needSelection();
    if (!key) return;
    dispatch({ type: 'set', key, hours, rounding });
    focusCell(key);
  }

  function sameAsYesterday() {
    const key = needSelection();
    if (!key) return;
    const hours = yesterdayHours(state, key);
    if (hours === null) {
      toast({ title: t('week.sameAsYesterday'), body: t('web.week.nothingYesterday'), icon: 'info' });
    } else {
      dispatch({ type: 'set', key, hours, rounding });
    }
    focusCell(key);
  }

  function fillWeek() {
    const key = needSelection();
    if (!key) return;
    const targets = fillKeys(state, splitKey(key).membershipId, dates).filter((k) => !isLocked(k));
    if (targets.length === 0) {
      toast({ title: t('week.fillWeek'), body: t('web.week.nothingToFill'), icon: 'info' });
    } else {
      dispatch({ type: 'fill', keys: targets, hours: dayHours, rounding });
    }
    focusCell(key);
  }

  function openNote() {
    const key = needSelection();
    if (!key) return;
    setNoteText(effective(state, key).note ?? '');
    setNoteOpen(true);
  }

  function keepNote() {
    if (selected) dispatch({ type: 'note', key: selected, note: noteText });
    setNoteOpen(false);
    if (selected) focusCell(selected);
  }

  const memberIds = rows.map((r) => r.id);
  const total = weekTotal(state, memberIds, dates);
  const cost = rows.reduce((sum, r) => sum + (r.rate ?? 0) * rowTotal(state, r.id, dates), 0);
  const selectedInfo = selected ? splitKey(selected) : null;
  const selectedNote = selected ? effective(state, selected).note : null;
  const lockedMonth = months.find((m) => lockedMonths.has(m));
  const allLocked = dates.every((d) => lockedMonths.has(monthOf(d)));
  const chipsDisabled = allLocked || (selected !== null && isLocked(selected));
  const invalid = hasInvalid(state);
  const week = isoWeek(dates[weekStart === 'MONDAY' ? 0 : 1] as IsoDate).week;
  const dirtyPeople = [...new Set(dirty.map((k) => splitKey(k).membershipId))];

  return (
    <section className="view" aria-labelledby="h-week">
      <ViewHeader
        id="h-week"
        title={t('week.title', { week })}
        sub={`${t('week.range', { from: formatDate(from, locale, 'dayMonth'), to: formatDate(to, locale, 'dayMonth') }).replace(/\.$/, '')}. ${t('week.subtitle')}`}
        actions={
          <>
            <div className="mnav" role="group" aria-label={t('nav.week')}>
              <button
                type="button"
                aria-label={t('week.previousWeek')}
                onClick={() => goTo(addDays(from, -7))}
              >
                <Icon name="chev-left" />
              </button>
              <span className="lbl" aria-live="polite">
                {t('week.title', { week })}
              </span>
              <button type="button" aria-label={t('week.nextWeek')} onClick={() => goTo(addDays(from, 7))}>
                <Icon name="chev-right" />
              </button>
              <button
                type="button"
                className="today"
                disabled={dates.includes(today)}
                onClick={() => goTo(null)}
              >
                {t('week.thisWeek')}
              </button>
            </div>
            <div className="seg" role="group" aria-label={t('week.layout')}>
              <button type="button" aria-pressed="true">
                {t('nav.week')}
              </button>
              <Link href={`/w/${ws.slug}/month`} className="seg-link">
                {t('nav.month')}
              </Link>
            </div>
          </>
        }
      />

      <div className="card wg-card">
        {lockedMonth ? (
          <div className="lockbar" role="status">
            <Icon name="lock" />
            <span>{t('week.monthClosedHint', { month: formatMonthName(lockedMonth, locale) })}</span>
            <UnlockButton ws={ws} month={lockedMonth} />
          </div>
        ) : null}
        <div className="wg-bar">
          <div className="chips" role="toolbar" aria-label={t('week.quickHours')}>
            {QUICK_CHIPS.map((h) => (
              <button
                key={h}
                className="chip"
                type="button"
                disabled={chipsDisabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chip(h)}
              >
                {formatHours(h, locale, { unit: false })}
              </button>
            ))}
            <button
              className="chip"
              type="button"
              disabled={chipsDisabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => chip(dayHours)}
              aria-label={t('week.fullDayWithHours', { hours: formatHours(dayHours, locale) })}
            >
              {t('week.fullDay')} <small>{formatHours(dayHours, locale, { unit: false })}</small>
            </button>
            <button
              className="chip ghost"
              type="button"
              disabled={chipsDisabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={sameAsYesterday}
            >
              <Icon name="copy" />
              {t('week.sameAsYesterday')}
            </button>
            <button
              className="chip ghost"
              type="button"
              disabled={chipsDisabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={fillWeek}
            >
              <Icon name="zap" />
              {t('week.fillWeek')}
            </button>
            <button className="chip ghost" type="button" disabled={chipsDisabled} onClick={openNote}>
              <Icon name="note" />
              {t('week.note')}
            </button>
          </div>
          <span className="sel" aria-live="polite">
            {selectedInfo ? (
              <>
                <b>
                  {t('web.week.cellLabel', {
                    name: firstName(names[selectedInfo.membershipId] ?? ''),
                    date: formatDate(selectedInfo.date, locale, 'weekdayDay'),
                  })}
                </b>{' '}
                {selectedNote ? <span>{t('web.week.noteLabel', { note: selectedNote })}</span> : null}
              </>
            ) : (
              t('week.selectCellHint')
            )}
          </span>
        </div>

        {rows.length === 0 && members.isSuccess ? (
          <div className="empty-state">
            <Icon name="users" />
            <b>{t('web.week.emptyTitle')}</b>
            <p>{t('web.week.emptyBody')}</p>
            <Link className="btn btn-secondary btn-sm" href={`/w/${ws.slug}/employees`}>
              {t('employees.addEmployee')}
            </Link>
          </div>
        ) : (
          <WeekGrid
            rows={rows}
            dates={dates}
            today={today}
            anchorMonth={monthOf(anchor)}
            state={state}
            showPay={ws.showPay}
            currency={ws.currency}
            isLocked={isLocked}
            flagged={(key) => entryByKey.get(key)?.flag?.status === 'OPEN'}
            popped={popped}
            inputs={inputs}
            onSelect={setSelected}
            dispatch={dispatch}
            rounding={rounding}
          />
        )}

        {noteOpen && selectedInfo ? (
          <div className="notebox">
            <label className="l" htmlFor="wg-note">
              {t('week.noteFor', {
                name: firstName(names[selectedInfo.membershipId] ?? ''),
                date: formatDate(selectedInfo.date, locale, 'weekdayDay'),
              })}{' '}
              <span>{t('week.noteKept')}</span>
            </label>
            <div className="row">
              <input
                className="input"
                id="wg-note"
                autoFocus
                maxLength={140}
                value={noteText}
                placeholder={t('week.notePlaceholder')}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    keepNote();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setNoteOpen(false);
                    if (selected) focusCell(selected);
                  }
                }}
              />
              <button className="btn btn-sm btn-secondary" type="button" onClick={keepNote}>
                {t('common.keep')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="wg-foot">
          <div>
            <div className="big">
              <span className="num">{formatHours(total, locale, { unit: false })}</span>
              <small>{t('common.hourUnit')}</small>
              <Money
                amount={rows.some((r) => r.rate !== null) ? cost : null}
                currency={ws.currency}
                showPay={ws.showPay}
              />
            </div>
            <div className="sub">
              {t('week.weekTotalPeople', { people: t('common.people', { count: rows.length }) })}
            </div>
          </div>
          <div className="acts">
            <MonthLockButton ws={ws} month={monthOf(anchor)} blocked={dirty.length > 0} />
            <CsvButton workspaceId={ws.id} slug={ws.slug} month={monthOf(anchor)} />
          </div>
        </div>
      </div>

      <div className="wg-help" aria-label={t('week.keyboard')}>
        <span>
          <kbd>Tab</kbd> {t('week.keyNextCell')}
        </span>
        <span>
          <kbd aria-hidden="true">&uarr;</kbd>
          <kbd aria-hidden="true">&darr;</kbd>
          <kbd aria-hidden="true">&larr;</kbd>
          <kbd aria-hidden="true">&rarr;</kbd> {t('week.keyMove')}
        </span>
        <span>
          <kbd>Enter</kbd> {t('week.keyDown')}
        </span>
        <span>
          <kbd>Backspace</kbd> {t('week.keyClear')}
        </span>
        <span>
          <kbd>Esc</kbd> {t('week.keyUndo')}
        </span>
        <span>{t('week.savedAsBatch')}</span>
      </div>

      {dirty.length > 0 ? (
        <BodyPortal>
          <div className="savebar" role="status">
            <div className="txt">
              <b>
                {t('web.week.unsaved', { count: dirty.length })}
                {draftDelta(state) !== 0 ? `, ${formatHoursDelta(draftDelta(state), locale)}` : ''}
              </b>
              <span>
                {t('web.week.notify', { count: dirtyPeople.length, names: listNames(dirtyPeople) })}
              </span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={save.isPending}
              onClick={() => dispatch({ type: 'discard' })}
            >
              {t('web.week.discard')}
            </button>
            <button
              className="btn btn-primary btn-sm"
              type="button"
              disabled={save.isPending || invalid}
              onClick={() => save.mutate(batchItems(state))}
            >
              {save.isPending ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </BodyPortal>
      ) : null}
    </section>
  );
}
