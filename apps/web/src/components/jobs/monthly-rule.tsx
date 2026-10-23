'use client';

// The monthly rule (CHQ-186): two cards, a day of the month or the nth weekday of the month, each saying what it
// means; the chosen one opens its picker. Both start from the first date (24 Oct: day 24, the fourth Saturday).
import { useId } from 'react';
import type { JobRecurrenceRule, MonthlyBy } from '@klokka/api-client';
import {
  LAST_DAY_OF_MONTH,
  WEEKDAYS,
  WEEKS_OF_MONTH,
  defaultMonthly,
  formatWeekday,
  type IsoDate,
} from '@klokka/core';
import { useLocale, useT } from '@/lib/i18n';

// Days 1 to 30, then "Last day" (31, clamped in shorter months).
const DAYS = Array.from({ length: LAST_DAY_OF_MONTH }, (_, i) => i + 1);
const SHORT_MONTH_DAY = 29;

export function MonthlyRule({
  value,
  date,
  onChange,
}: {
  value: JobRecurrenceRule;
  date: IsoDate;
  onChange: (rule: JobRecurrenceRule) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const name = useId();
  const defaults = defaultMonthly(date);
  const mode: MonthlyBy = value.monthlyBy ?? 'DAY_OF_MONTH';
  const day = value.dayOfMonth ?? (value.lastDayOfMonth ? LAST_DAY_OF_MONTH : defaults.dayOfMonth);
  const nth = value.weekOfMonth ?? defaults.weekOfMonth;
  const weekday = value.weekday ?? defaults.weekday;
  const choose = (next: MonthlyBy) => {
    if (next === mode) return;
    const { dayOfMonth: _day, weekOfMonth: _nth, weekday: _weekday, lastDayOfMonth: _last, ...rest } = value;
    onChange(
      next === 'DAY_OF_MONTH'
        ? { ...rest, monthlyBy: next, dayOfMonth: defaults.dayOfMonth }
        : { ...rest, monthlyBy: next, weekOfMonth: defaults.weekOfMonth, weekday: defaults.weekday },
    );
  };
  const options: { mode: MonthlyBy; title: string; summary: string }[] = [
    {
      mode: 'DAY_OF_MONTH',
      title: t('recurrence.byDay'),
      summary: day >= LAST_DAY_OF_MONTH ? t('recurrence.lastDayShort') : t('recurrence.onDay', { day }),
    },
    {
      mode: 'WEEKDAY_OF_MONTH',
      title: t('recurrence.byWeekday'),
      summary: t('recurrence.onWeekday', {
        ordinal: t(`recurrence.ordinal.${nth}`),
        weekday: t(`recurrence.weekdayInMonth.${weekday}`),
      }),
    },
  ];
  return (
    <fieldset className="monthly-rule">
      <legend className="lbl">{t('recurrence.monthly')}</legend>
      {options.map((option) => {
        const on = option.mode === mode;
        return (
          <div key={option.mode} className={on ? 'mr-card on' : 'mr-card'}>
            <label className="mr-head">
              <input
                type="radio"
                name={name}
                checked={on}
                onChange={() => choose(option.mode)}
                data-testid={`repeat-by-${option.mode}`}
              />
              <span>
                <b>{option.title}</b>
                <small>{option.summary}</small>
              </span>
            </label>
            {on && option.mode === 'DAY_OF_MONTH' ? (
              <div className="mr-body">
                <div className="mr-days" role="group" aria-label={t('recurrence.byDay')}>
                  {DAYS.map((d) => {
                    const last = d === LAST_DAY_OF_MONTH;
                    return (
                      <button
                        key={d}
                        type="button"
                        className={last ? 'mr-day last' : 'mr-day'}
                        aria-pressed={d === Math.min(day, LAST_DAY_OF_MONTH)}
                        aria-label={last ? t('recurrence.lastDayShort') : t('recurrence.onDay', { day: d })}
                        onClick={() => onChange({ ...value, dayOfMonth: d })}
                        data-testid={`repeat-dom-${d}`}
                      >
                        {last ? t('recurrence.lastDayShort') : d}
                      </button>
                    );
                  })}
                </div>
                {day >= SHORT_MONTH_DAY ? <span className="hint">{t('recurrence.shortMonths')}</span> : null}
              </div>
            ) : null}
            {on && option.mode === 'WEEKDAY_OF_MONTH' ? (
              <div className="mr-body mr-selects">
                <select
                  className="input"
                  aria-label={t('recurrence.byWeekday')}
                  value={nth}
                  onChange={(e) =>
                    onChange({ ...value, weekOfMonth: e.target.value as (typeof WEEKS_OF_MONTH)[number] })
                  }
                  data-testid="repeat-nth"
                >
                  {WEEKS_OF_MONTH.map((w) => (
                    <option key={w} value={w}>
                      {t(`recurrence.ordinal.${w}`)}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  aria-label={t('recurrence.weekdays')}
                  value={weekday}
                  onChange={(e) =>
                    onChange({ ...value, weekday: e.target.value as (typeof WEEKDAYS)[number] })
                  }
                  data-testid="repeat-weekday"
                >
                  {WEEKDAYS.map((w, i) => (
                    <option key={w} value={w}>
                      {formatWeekday(i, locale, 'long')}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
