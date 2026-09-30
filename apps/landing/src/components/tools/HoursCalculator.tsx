'use client';

import { useId, useState } from 'react';
import { formatMoney } from '@klokka/core/format';
import { cn } from '@/lib/cn';
import { formatHours, parseBreak, parseClock, parseRate, pay, shiftMinutes, sumMinutes } from '@/lib/hours';
import type { Locale } from '@/lib/i18n';
import type { en } from '@/lib/i18n/pages/calculator';
import { appUrl } from '@/lib/links';

type Labels = typeof en.tool;
type Shift = { start: string; end: string; rest: string };
type Field = keyof Shift;
type Evaluated = { minutes: number | null; errors: Partial<Record<Field, string>> };

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const EMPTY: Shift = { start: '', end: '', rest: '' };

/** A shift's minutes once start and end are both readable; an unreadable field gets its error text. */
function evaluate(shift: Shift, t: Labels): Evaluated {
  const errors: Evaluated['errors'] = {};
  const start = shift.start.trim() === '' ? undefined : parseClock(shift.start);
  const end = shift.end.trim() === '' ? undefined : parseClock(shift.end);
  const rest = parseBreak(shift.rest);
  if (start === null) errors.start = t.errorClock;
  if (end === null) errors.end = t.errorClock;
  if (rest === null) errors.rest = t.errorBreak;
  if (start == null || end == null || rest === null) return { minutes: null, errors };
  const minutes = shiftMinutes(start, end, rest);
  if (minutes === null) errors.rest = t.errorBreakLong;
  return { minutes, errors };
}

/**
 * The work-hours calculator: a week of shifts or the time between two clock times. Everything stays in this
 * component; errors show once a field has been left, so typing "8:" is not flagged halfway through.
 */
export function HoursCalculator({ t, locale }: { t: Labels; locale: Locale }) {
  const uid = useId();
  const [mode, setMode] = useState<'week' | 'span'>('week');
  const [week, setWeek] = useState<Shift[]>(() => DAYS.map(() => EMPTY));
  const [span, setSpan] = useState<Shift>(EMPTY);
  const [rate, setRate] = useState('');
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const touch = (key: string) => setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  const days = week.map((shift) => evaluate(shift, t));
  const weekMinutes = sumMinutes(days.map((d) => d.minutes));
  const spanResult = evaluate(span, t);
  const hourlyRate = parseRate(rate);
  const rateError =
    rate.trim() !== '' && hourlyRate === null && touched.has('rate') ? t.errorRate : undefined;

  const fields = (key: string, shift: Shift, result: Evaluated, update: (next: Shift) => void) => {
    const labels: Record<Field, string> = { start: t.start, end: t.end, rest: t.break };
    const errorId = `${uid}-${key}-error`;
    const shown = (Object.keys(labels) as Field[]).filter(
      (f) => result.errors[f] && touched.has(`${key}-${f}`),
    );
    return (
      <>
        {(Object.keys(labels) as Field[]).map((f) => {
          const id = `${uid}-${key}-${f}`;
          const invalid = shown.includes(f);
          return (
            <div key={f} className={cn('hc-field', `hc-${f}`)}>
              <label htmlFor={id}>{labels[f]}</label>
              <input
                id={id}
                className="hc-input num"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="next"
                placeholder={f === 'rest' ? '0' : f === 'start' ? '08:00' : '16:30'}
                value={shift[f]}
                aria-invalid={invalid || undefined}
                aria-describedby={invalid ? errorId : undefined}
                onChange={(e) => update({ ...shift, [f]: e.target.value })}
                onBlur={() => touch(`${key}-${f}`)}
              />
            </div>
          );
        })}
        {shown.length > 0 && (
          <p id={errorId} className="hc-error">
            {[...new Set(shown.map((f) => result.errors[f]))].join(' ')}
          </p>
        )}
      </>
    );
  };

  const total = (minutes: number) => {
    const h = formatHours(minutes, locale);
    return (
      <>
        <b className="num">{h.decimal}</b> <span className="num muted">({h.clock})</span>
      </>
    );
  };

  const result = (label: string, minutes: number) => {
    const h = formatHours(minutes, locale);
    return (
      <div className="hc-result" aria-live="polite">
        <p className="hc-result-label">{label}</p>
        <p className="hc-result-main num">{h.decimal}</p>
        <p className="small muted">
          <b className="num">{h.decimal}</b> {t.decimal}, <b className="num">{h.clock}</b> {t.clock}
        </p>
      </div>
    );
  };

  return (
    <div className="hc card">
      <h2 className="h3">{t.title}</h2>
      <fieldset className="hc-modes">
        <legend className="sr-only">{t.mode}</legend>
        {(['week', 'span'] as const).map((m) => (
          <label key={m} className="hc-mode">
            <input
              type="radio"
              name={`${uid}-mode`}
              value={m}
              checked={mode === m}
              onChange={() => setMode(m)}
            />
            <span>{m === 'week' ? t.modeWeek : t.modeSpan}</span>
          </label>
        ))}
      </fieldset>
      <p className="small muted">{t.hint}</p>
      <noscript>
        <p className="hc-note small">{t.noScript}</p>
      </noscript>

      {mode === 'week' ? (
        <div className="hc-panel">
          {DAYS.map((day, i) => {
            const shift = week[i] ?? EMPTY;
            const evaluated = days[i] ?? { minutes: null, errors: {} };
            const nameId = `${uid}-${day}-name`;
            return (
              <div key={day} className="hc-row" role="group" aria-labelledby={nameId}>
                <span className="hc-day" id={nameId}>
                  {t[day]}
                </span>
                <span className="hc-sum">
                  <span className="sr-only">{t.dayTotal}: </span>
                  {evaluated.minutes === null ? null : total(evaluated.minutes)}
                </span>
                {fields(day, shift, evaluated, (next) =>
                  setWeek((prev) => prev.map((s, j) => (j === i ? next : s))),
                )}
              </div>
            );
          })}
          {result(t.weekTotal, weekMinutes)}
          <div className="hc-wage">
            <div className="hc-field">
              <label htmlFor={`${uid}-rate`}>{t.wage}</label>
              <input
                id={`${uid}-rate`}
                className="hc-input num"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={rate}
                aria-invalid={rateError ? true : undefined}
                aria-describedby={`${uid}-rate-note`}
                onChange={(e) => setRate(e.target.value)}
                onBlur={() => touch('rate')}
              />
            </div>
            <p id={`${uid}-rate-note`} className={cn('small', rateError ? 'hc-error' : 'muted')}>
              {rateError ?? t.wageNote}
            </p>
            {hourlyRate !== null && (
              <p className="hc-pay" aria-live="polite">
                {t.payTotal}:{' '}
                <b className="num">{formatMoney(pay(weekMinutes, hourlyRate), 'SEK', locale)}</b>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="hc-panel">
          <div className="hc-row hc-row-span" role="group" aria-label={t.modeSpan}>
            {fields('span', span, spanResult, setSpan)}
          </div>
          {result(t.spanTotal, spanResult.minutes ?? 0)}
        </div>
      )}

      <div className="hc-save">
        <p>
          <b>{t.saveTitle}</b> {t.saveBody}
        </p>
        <a className="btn btn-secondary" href={appUrl}>
          {t.saveButton}
        </a>
      </div>
    </div>
  );
}
