'use client';

// How often a job repeats (CHQ-156, monthly modes and "No end date" in CHQ-186): weekly on chosen weekdays, or
// monthly on a day or the nth weekday, every 1 to 12 weeks/months, ending never, on a date or after a count. The
// API's preview says which dates that gives; the editor is ready only once it has.
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { JobRecurrenceRuleToJSON, type JobRecurrence, type JobRecurrenceRule } from '@klokka/api-client';
import {
  LAST_DAY_OF_MONTH,
  RECURRENCE_HORIZON_MONTHS,
  WEEKDAYS,
  defaultMonthly,
  describeRecurrence,
  formatDate,
  formatWeekday,
  weekdayOf,
  type IsoDate,
} from '@klokka/core';
import { api } from '@/lib/api';
import { useLocale, useT } from '@/lib/i18n';
import { dateOf, isoOf } from '@/lib/time';
import { problemMessage, toProblem } from '@/lib/problem';
import { ChoiceGroup } from '../choice-group';
import { MonthlyRule } from './monthly-rule';

const MAX_INTERVAL = 12;
const INTERVALS = Array.from({ length: MAX_INTERVAL }, (_, i) => i + 1);
const MAX_PERIODS = 120;
// A series ended by a count starts at four weeks or months.
const FIRST_COUNT = 4;

type EndMode = 'never' | 'date' | 'count';
type Frequency = JobRecurrenceRule['frequency'] | 'ONCE';

export function endModeOf(rule: JobRecurrenceRule | undefined): EndMode {
  if (rule?.periodCount != null) return 'count';
  return rule?.endDate ? 'date' : 'never';
}

// A stable text for a rule, so "did the schedule change" ignores the order weekdays were picked in.
export function ruleKey(rule: JobRecurrenceRule | undefined): string {
  if (!rule) return '';
  const json: Record<string, unknown> = { ...JobRecurrenceRuleToJSON(rule) };
  if (rule.weekdays) json.weekdays = WEEKDAYS.filter((d) => rule.weekdays?.has(d));
  return JSON.stringify(json, Object.keys(json).sort());
}

// An existing series' rule, ready to edit (CHQ-187): the monthly mode spelled out (older series only say
// lastDayOfMonth), and a count of weeks/months turned into the date it ends on, since a new schedule starts later
// than the series did and the end should stay where it was.
export function editableRule(series: JobRecurrence): JobRecurrenceRule {
  const { lastDayOfMonth, periodCount, ...rule } = series.recurrence;
  const ended = periodCount != null ? { endDate: series.endDate } : {};
  if (rule.frequency !== 'MONTHLY') return { ...rule, ...ended };
  const monthlyBy = rule.monthlyBy ?? 'DAY_OF_MONTH';
  if (monthlyBy === 'WEEKDAY_OF_MONTH') return { ...rule, monthlyBy, ...ended };
  const dayOfMonth = rule.dayOfMonth ?? (lastDayOfMonth ? LAST_DAY_OF_MONTH : series.firstDate.getDate());
  return { ...rule, monthlyBy, dayOfMonth, ...ended };
}

function isValid(rule: JobRecurrenceRule | undefined, endMode: EndMode, date: IsoDate): boolean {
  if (!rule) return false;
  if (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > MAX_INTERVAL) return false;
  if (rule.frequency === 'WEEKLY' && !rule.weekdays?.size) return false;
  if (
    rule.frequency === 'MONTHLY' &&
    rule.monthlyBy === 'WEEKDAY_OF_MONTH' &&
    (!rule.weekOfMonth || !rule.weekday)
  ) {
    return false;
  }
  if (endMode === 'never') return rule.endDate === undefined && rule.periodCount === undefined;
  if (endMode === 'date') return !!rule.endDate && isoOf(rule.endDate) >= date;
  const count = rule.periodCount;
  return count != null && Number.isInteger(count) && count >= 1 && count <= MAX_PERIODS;
}

export function RecurrenceEditor({
  workspaceId,
  date,
  anchor,
  value,
  onChange,
  onReady,
  allowOnce = true,
}: {
  workspaceId: string;
  // The first date of the schedule: the job's date, or where a changed schedule starts.
  date: IsoDate;
  // A changed schedule's rhythm: the selected job's date, which the interval counts from (the API does the same).
  anchor?: IsoDate | undefined;
  value: JobRecurrenceRule | undefined;
  onChange: (value: JobRecurrenceRule | undefined) => void;
  onReady: (ready: boolean) => void;
  // False when editing a series: it can change, not stop repeating.
  allowOnce?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const ids = useId();
  const [endMode, setEndMode] = useState<EndMode>(() => endModeOf(value));
  // The message is read from the response asynchronously, so it is kept with the error it belongs to: a new
  // preview (pending, then failing differently) never shows the previous failure's text.
  const [failure, setFailure] = useState<{ source: Error; message: string } | null>(null);
  const valid = isValid(value, endMode, date);
  const preview = useQuery({
    queryKey: ['job-recurrence-preview', workspaceId, anchor ?? null, date, value ? ruleKey(value) : null],
    enabled: valid,
    retry: false,
    queryFn: () =>
      api.jobs.previewJobRecurrence({
        workspaceId,
        jobRecurrencePreviewRequest: anchor
          ? { firstDate: dateOf(anchor), fromDate: dateOf(date), recurrence: value! }
          : { firstDate: dateOf(date), recurrence: value! },
      }),
  });
  // Ready when the authoritative API preview agrees, rather than guessing dates in the client.
  const ready = value === undefined || (valid && preview.isSuccess && !preview.isFetching);
  useEffect(() => onReady(ready), [ready, onReady]);
  useEffect(() => {
    const source = preview.error;
    if (source) void toProblem(source).then((p) => setFailure({ source, message: problemMessage(t, p) }));
  }, [preview.error, t]);
  const error = failure && failure.source === preview.error ? failure.message : null;
  const weekly = value?.frequency === 'WEEKLY';

  const choose = (frequency: Frequency) => {
    if (frequency === 'ONCE') {
      onChange(undefined);
      return;
    }
    if (frequency === value?.frequency) return;
    // A count of weeks is not a count of months: switching frequency asks for the end again. No end date and an
    // end date carry over.
    const mode: EndMode = !value ? 'never' : endMode === 'count' ? 'date' : endMode;
    setEndMode(mode);
    const base = {
      interval: value?.interval ?? 1,
      ...(mode === 'date' && value?.endDate ? { endDate: value.endDate } : {}),
    };
    onChange(
      frequency === 'WEEKLY'
        ? { ...base, frequency, weekdays: new Set([weekdayOf(date)]) }
        : { ...base, frequency, monthlyBy: 'DAY_OF_MONTH', dayOfMonth: defaultMonthly(date).dayOfMonth },
    );
  };

  const frequencies: { value: Frequency; label: string }[] = [
    ...(allowOnce ? [{ value: 'ONCE' as const, label: t('recurrence.once') }] : []),
    { value: 'WEEKLY', label: t('recurrence.weekly') },
    { value: 'MONTHLY', label: t('recurrence.monthly') },
  ];
  const ends: { value: EndMode; label: string }[] = [
    { value: 'never', label: t('recurrence.never') },
    { value: 'date', label: t('recurrence.onDate') },
    { value: 'count', label: t('recurrence.afterCount') },
  ];

  return (
    <section className="recurrence-editor" aria-labelledby={`${ids}-title`}>
      <span className="lbl" id={`${ids}-title`}>
        {t('recurrence.title')}
      </span>
      <ChoiceGroup<Frequency>
        className="seg"
        labelledBy={`${ids}-title`}
        value={value?.frequency ?? 'ONCE'}
        onChange={choose}
        choices={frequencies}
      />
      {value ? (
        <>
          <div className="field">
            <label htmlFor={`${ids}-interval`}>{t('recurrence.every')}</label>
            <select
              id={`${ids}-interval`}
              data-testid="repeat-interval"
              className="input short"
              value={value.interval}
              onChange={(e) => onChange({ ...value, interval: Number(e.target.value) })}
            >
              {INTERVALS.map((n) => (
                <option key={n} value={n}>
                  {t(weekly ? 'recurrence.weeks' : 'recurrence.months', { count: n })}
                </option>
              ))}
            </select>
          </div>
          {weekly ? (
            <div className="field">
              <span className="lbl" id={`${ids}-days`}>
                {t('recurrence.weekdays')}
              </span>
              <div className="chips" role="group" aria-labelledby={`${ids}-days`}>
                {WEEKDAYS.map((d, i) => {
                  const on = !!value.weekdays?.has(d);
                  const chosen = [...(value.weekdays ?? [])];
                  return (
                    <button
                      type="button"
                      className="chip"
                      key={d}
                      aria-pressed={on}
                      aria-label={formatWeekday(i, locale, 'long')}
                      onClick={() => {
                        // The last weekday stays: a weekly repeat needs at least one.
                        if (on && chosen.length === 1) return;
                        onChange({
                          ...value,
                          weekdays: new Set(on ? chosen.filter((x) => x !== d) : [...chosen, d]),
                        });
                      }}
                      data-testid={`repeat-${d}`}
                    >
                      {formatWeekday(i, locale, 'short')}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <MonthlyRule value={value} date={date} onChange={onChange} />
          )}
          <fieldset className="field repeat-ends">
            <legend className="lbl">{t('recurrence.ends')}</legend>
            <div className="radio-list">
              {ends.map((end) => (
                <label key={end.value} className="radio-row">
                  <input
                    type="radio"
                    name={`${ids}-ends`}
                    checked={endMode === end.value}
                    onChange={() => {
                      if (end.value === endMode) return;
                      setEndMode(end.value);
                      const { endDate: _end, periodCount: _count, ...rest } = value;
                      onChange(end.value === 'count' ? { ...rest, periodCount: FIRST_COUNT } : rest);
                    }}
                    data-testid={`repeat-end-mode-${end.value}`}
                  />
                  <span>{end.label}</span>
                </label>
              ))}
            </div>
            {endMode === 'never' ? (
              <span className="hint">{t('recurrence.neverHint', { months: RECURRENCE_HORIZON_MONTHS })}</span>
            ) : null}
          </fieldset>
          {endMode === 'date' ? (
            <div className="field">
              <label htmlFor={`${ids}-end-date`}>{t('recurrence.endDate')}</label>
              <input
                id={`${ids}-end-date`}
                data-testid="repeat-end-date"
                className="input"
                type="date"
                min={date}
                required
                value={value.endDate ? isoOf(value.endDate) : ''}
                onChange={(e) => {
                  const { endDate: _date, ...rest } = value;
                  onChange(e.target.value ? { ...rest, endDate: dateOf(e.target.value as IsoDate) } : rest);
                }}
              />
            </div>
          ) : null}
          {endMode === 'count' ? (
            <div className="field">
              <label htmlFor={`${ids}-count`}>
                {t(weekly ? 'recurrence.weeksCount' : 'recurrence.monthsCount')}
              </label>
              <input
                id={`${ids}-count`}
                data-testid="repeat-count"
                className="input short"
                type="number"
                min={1}
                max={MAX_PERIODS}
                required
                value={value.periodCount ?? ''}
                onChange={(e) => {
                  const { periodCount: _count, ...rest } = value;
                  onChange(e.target.value ? { ...rest, periodCount: Number(e.target.value) } : rest);
                }}
              />
              <span className="hint">{t('recurrence.periodHint')}</span>
            </div>
          ) : null}
          <div className="recurrence-preview" aria-live="polite" data-testid="repeat-preview">
            {!valid ? (
              <p>
                {endMode === 'date' && !value.endDate ? t('recurrence.chooseDate') : t('errors.VALIDATION')}
              </p>
            ) : preview.isError ? (
              <p className="error">{error ?? t('errors.VALIDATION')}</p>
            ) : preview.data ? (
              <>
                <b data-testid="repeat-sentence">{describeRecurrence(value, date, t, locale)}</b>
                <span className="muted">{t('recurrence.preview')}</span>
                <div className="chips">
                  {preview.data.dates.map(({ date: d }) => (
                    <span className="tag" key={isoOf(d)}>
                      {formatDate(isoOf(d), locale, 'dayMonth')}
                    </span>
                  ))}
                </div>
                {endMode === 'never' ? null : (
                  <p>
                    {t('recurrence.previewTotal', {
                      count: preview.data.occurrenceCount,
                      date: formatDate(isoOf(preview.data.lastDate), locale, 'long'),
                    })}
                  </p>
                )}
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
