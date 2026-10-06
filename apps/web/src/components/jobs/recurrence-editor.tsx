'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { JobRecurrenceRuleToJSON, Weekday, type JobRecurrenceRule } from '@klokka/api-client';
import { formatDate, formatWeekday, type IsoDate } from '@klokka/core';
import { api } from '@/lib/api';
import { useLocale, useT } from '@/lib/i18n';
import { dateOf, isoOf } from '@/lib/time';
import { problemMessage, toProblem } from '@/lib/problem';

const DAYS = Object.values(Weekday);

export function RecurrenceEditor({
  workspaceId,
  date,
  value,
  onChange,
  onReady,
}: {
  workspaceId: string;
  date: IsoDate;
  value: JobRecurrenceRule | undefined;
  onChange: (value: JobRecurrenceRule | undefined) => void;
  onReady: (ready: boolean) => void;
}) {
  const t = useT();
  const locale = useLocale();
  // The message is read from the response asynchronously, so it is kept with the error it belongs to: a new
  // preview (pending, then failing differently) never shows the previous failure's text.
  const [failure, setFailure] = useState<{ source: Error; message: string } | null>(null);
  const [endMode, setEndMode] = useState<'date' | 'count'>('date');
  const valid =
    !!value &&
    Number.isInteger(value.interval) &&
    value.interval >= 1 &&
    value.interval <= 12 &&
    (value.frequency !== 'WEEKLY' || !!value.weekdays?.size) &&
    (!!value.endDate ||
      (value.periodCount != null &&
        Number.isInteger(value.periodCount) &&
        value.periodCount >= 1 &&
        value.periodCount <= 120));
  const preview = useQuery({
    queryKey: ['job-recurrence-preview', workspaceId, date, value ? JobRecurrenceRuleToJSON(value) : null],
    enabled: valid,
    retry: false,
    queryFn: () =>
      api.jobs.previewJobRecurrence({
        workspaceId,
        jobRecurrencePreviewRequest: { firstDate: dateOf(date), recurrence: value! },
      }),
  });
  // Report readiness when the authoritative API preview changes, rather than guessing dates in the client.
  const ready = value === undefined || (valid && preview.isSuccess && !preview.isFetching);
  // The parent only uses readiness to enable Save; state is synchronized in an effect.
  useEffect(() => onReady(ready), [ready, onReady]);
  useEffect(() => {
    const source = preview.error;
    if (source) void toProblem(source).then((p) => setFailure({ source, message: problemMessage(t, p) }));
  }, [preview.error, t]);
  const error = failure && failure.source === preview.error ? failure.message : null;
  const weekly = value?.frequency === 'WEEKLY';
  const set = (next: JobRecurrenceRule) => onChange(next);
  const choose = (frequency: JobRecurrenceRule['frequency'] | undefined) => {
    if (!frequency) {
      onChange(undefined);
      return;
    }
    if (frequency === value?.frequency) return;
    const weekday = DAYS[(dateOf(date).getDay() + 6) % 7]!;
    // A count of weeks is not a count of months: switching frequency asks for the end again.
    const { weekdays: _days, lastDayOfMonth: _last, periodCount: _count, ...rest } = value ?? { interval: 1 };
    if (endMode === 'count') setEndMode('date');
    set({ ...rest, frequency, ...(frequency === 'WEEKLY' ? { weekdays: new Set([weekday]) } : {}) });
  };
  return (
    <section className="recurrence-editor" aria-label={t('recurrence.title')}>
      <span className="lbl">{t('recurrence.title')}</span>
      <div className="chips" role="group" aria-label={t('recurrence.title')}>
        {([undefined, 'WEEKLY', 'MONTHLY'] as const).map((f) => (
          <button
            key={f ?? 'once'}
            type="button"
            className="chip"
            aria-pressed={value?.frequency === f}
            onClick={() => choose(f)}
          >
            {t(
              f === undefined
                ? 'recurrence.once'
                : f === 'WEEKLY'
                  ? 'recurrence.weekly'
                  : 'recurrence.monthly',
            )}
          </button>
        ))}
      </div>
      {value ? (
        <>
          <div className="field">
            <label htmlFor="repeat-interval">{t('recurrence.every')}</label>
            <input
              id="repeat-interval"
              className="input short"
              type="number"
              min={1}
              max={12}
              required
              value={value.interval || ''}
              onChange={(e) => set({ ...value, interval: Number(e.target.value) })}
            />
            <span className="hint">
              {t(weekly ? 'recurrence.weeks' : 'recurrence.months', { count: value.interval })}.{' '}
              {t('recurrence.intervalHint')}
            </span>
          </div>
          {weekly ? (
            <div className="field">
              <span className="lbl">{t('recurrence.weekdays')}</span>
              <div className="chips" role="group" aria-label={t('recurrence.weekdays')}>
                {DAYS.map((d, i) => (
                  <button
                    type="button"
                    className="chip"
                    key={d}
                    aria-pressed={value.weekdays?.has(d) ?? false}
                    onClick={() =>
                      set({
                        ...value,
                        weekdays: value.weekdays?.has(d)
                          ? new Set([...value.weekdays].filter((x) => x !== d))
                          : new Set([...(value.weekdays ?? []), d]),
                      })
                    }
                  >
                    {formatWeekday(i, locale, 'short')}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="repeat-month-day">{t('recurrence.monthlyDay')}</label>
              <select
                id="repeat-month-day"
                className="input"
                value={value.lastDayOfMonth ? 'last' : 'same'}
                onChange={(e) => set({ ...value, lastDayOfMonth: e.target.value === 'last' })}
              >
                <option value="same">{t('recurrence.sameDate')}</option>
                <option value="last">{t('recurrence.lastDay')}</option>
              </select>
              <span className="hint">{t('recurrence.shortMonths')}</span>
            </div>
          )}
          <div className="field">
            <label htmlFor="repeat-end-mode">{t('recurrence.ends')}</label>
            <select
              id="repeat-end-mode"
              className="input"
              value={endMode}
              onChange={(e) => {
                const mode = e.target.value as 'date' | 'count';
                setEndMode(mode);
                const { endDate: _end, periodCount: _count, ...rest } = value;
                set(rest);
              }}
            >
              <option value="date">{t('recurrence.endDate')}</option>
              <option value="count">{t(weekly ? 'recurrence.weeksCount' : 'recurrence.monthsCount')}</option>
            </select>
          </div>
          {endMode === 'date' ? (
            <div className="field">
              <label htmlFor="repeat-end-date">{t('recurrence.endDate')}</label>
              <input
                id="repeat-end-date"
                data-testid="repeat-end-date"
                className="input"
                type="date"
                min={date}
                required
                value={value.endDate ? isoOf(value.endDate) : ''}
                onChange={(e) => {
                  const { endDate: _date, ...rest } = value;
                  set(e.target.value ? { ...rest, endDate: dateOf(e.target.value as IsoDate) } : rest);
                }}
              />
            </div>
          ) : (
            <div className="field">
              <label htmlFor="repeat-count">
                {t(weekly ? 'recurrence.weeksCount' : 'recurrence.monthsCount')}
              </label>
              <input
                id="repeat-count"
                data-testid="repeat-count"
                className="input"
                type="number"
                min={1}
                max={120}
                required
                value={value.periodCount ?? ''}
                onChange={(e) => {
                  const { periodCount: _count, ...rest } = value;
                  set(e.target.value ? { ...rest, periodCount: Number(e.target.value) } : rest);
                }}
              />
              <span className="hint">{t('recurrence.periodHint')}</span>
            </div>
          )}
          <div className="recurrence-preview" aria-live="polite">
            {!valid ? (
              <p>{t('recurrence.requiredEnd')}</p>
            ) : preview.isError ? (
              <p className="error">{error ?? t('errors.VALIDATION')}</p>
            ) : preview.data ? (
              <>
                <b>{t('recurrence.preview')}</b>
                <div className="chips">
                  {preview.data.dates.map(({ date: d }) => (
                    <span className="tag" key={isoOf(d)}>
                      {formatDate(isoOf(d), locale, 'dayMonth')}
                    </span>
                  ))}
                </div>
                <p>
                  {t('recurrence.previewTotal', {
                    count: preview.data.occurrenceCount,
                    date: formatDate(isoOf(preview.data.lastDate), locale, 'long'),
                  })}
                </p>
              </>
            ) : (
              <p>{t('common.loading')}</p>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
