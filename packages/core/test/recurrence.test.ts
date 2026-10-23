import { describe, expect, it } from 'vitest';
import { translator, type Locale } from '../src/i18n/index.ts';
import {
  defaultMonthly,
  describeEnd,
  describeRecurrence,
  type RecurrenceLike,
  type RecurrenceRuleLike,
} from '../src/recurrence.ts';

// Intl output may use U+00A0 / U+202F between date parts; normalise for readable assertions.
const plain = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

const say = (rule: RecurrenceRuleLike, firstDate: string, locale: Locale) =>
  plain(describeRecurrence(rule, firstDate, translator(locale), locale));

// Shaped like the generated client's objects: dates at local midnight, weekdays as a Set.
const thirdWednesday: RecurrenceRuleLike = {
  frequency: 'MONTHLY',
  interval: 1,
  monthlyBy: 'WEEKDAY_OF_MONTH',
  weekOfMonth: 'THIRD',
  weekday: 'WEDNESDAY',
};
const fortnightly: RecurrenceRuleLike = {
  frequency: 'WEEKLY',
  interval: 2,
  weekdays: new Set(['WEDNESDAY', 'MONDAY'] as const),
  endDate: new Date(2027, 2, 31),
};
const day15ForSixMonths: RecurrenceRuleLike = {
  frequency: 'MONTHLY',
  interval: 1,
  monthlyBy: 'DAY_OF_MONTH',
  dayOfMonth: 15,
  periodCount: 6,
};

describe('describeRecurrence (CHQ-186)', () => {
  it('reads the nth weekday of the month with no end date', () => {
    expect(say(thirdWednesday, '2026-11-18', 'en')).toBe(
      'Every month on the third Wednesday, from 18 November 2026, no end date',
    );
    expect(say(thirdWednesday, '2026-11-18', 'sv')).toBe(
      'Varje månad den tredje onsdagen, från 18 november 2026, inget slutdatum',
    );
  });

  it('reads a weekly rule with an interval, in week order, until an end date', () => {
    expect(say(fortnightly, '2026-11-02', 'en')).toBe('Every 2 weeks on Mon, Wed, until 31 March 2027');
    expect(say(fortnightly, '2026-11-02', 'sv')).toBe(
      'Med 2 veckors mellanrum på mån, ons, till och med 31 mars 2027',
    );
  });

  it('reads a day of the month for a number of months', () => {
    expect(say(day15ForSixMonths, '2026-11-15', 'en')).toBe('Every month on day 15, for 6 months');
    expect(say(day15ForSixMonths, '2026-11-15', 'sv')).toBe('Varje månad på dag 15, i 6 månader');
  });

  it('reads a monthly interval above one', () => {
    const rule: RecurrenceRuleLike = { ...thirdWednesday, interval: 3, endDate: '2027-06-30' };
    expect(say(rule, '2026-11-18', 'en')).toBe('Every 3 months on the third Wednesday, until 30 June 2027');
    expect(say(rule, '2026-11-18', 'sv')).toBe(
      'Med 3 månaders mellanrum den tredje onsdagen, till och med 30 juni 2027',
    );
  });

  it('reads day 31 and the older lastDayOfMonth flag as the last day', () => {
    const day31: RecurrenceRuleLike = { frequency: 'MONTHLY', interval: 1, dayOfMonth: 31, periodCount: 1 };
    expect(say(day31, '2026-10-31', 'en')).toBe('Every month on the last day, for 1 month');
    expect(say(day31, '2026-10-31', 'sv')).toBe('Varje månad på sista dagen, i 1 månad');
    const legacy: RecurrenceRuleLike = {
      frequency: 'MONTHLY',
      interval: 1,
      lastDayOfMonth: true,
      periodCount: 2,
    };
    expect(say(legacy, '2026-11-30', 'en')).toBe('Every month on the last day, for 2 months');
  });

  it('fills a missing monthly detail from the first date', () => {
    expect(say({ frequency: 'MONTHLY', interval: 1, periodCount: 3 }, '2026-10-24', 'en')).toBe(
      'Every month on day 24, for 3 months',
    );
    expect(
      say(
        { frequency: 'MONTHLY', interval: 1, monthlyBy: 'WEEKDAY_OF_MONTH', periodCount: 3 },
        '2026-10-31',
        'en',
      ),
    ).toBe('Every month on the last Saturday, for 3 months');
    expect(say({ frequency: 'WEEKLY', interval: 1, periodCount: 4 }, '2026-10-22', 'en')).toBe(
      'Every week on Thu, for 4 weeks',
    );
  });
});

describe('defaultMonthly (CHQ-186)', () => {
  it('takes the day and the nth weekday from the date', () => {
    expect(defaultMonthly('2026-10-24')).toEqual({
      dayOfMonth: 24,
      weekOfMonth: 'FOURTH',
      weekday: 'SATURDAY',
    });
    expect(defaultMonthly('2026-11-01')).toEqual({ dayOfMonth: 1, weekOfMonth: 'FIRST', weekday: 'SUNDAY' });
  });

  it('turns a fifth weekday into the last one', () => {
    expect(defaultMonthly('2026-10-31')).toEqual({
      dayOfMonth: 31,
      weekOfMonth: 'LAST',
      weekday: 'SATURDAY',
    });
    expect(defaultMonthly('2026-10-29').weekOfMonth).toBe('LAST');
    expect(defaultMonthly('2026-10-28').weekOfMonth).toBe('FOURTH');
  });
});

describe('describeEnd (CHQ-186)', () => {
  const series = (over: Partial<RecurrenceLike>): RecurrenceLike => ({
    firstDate: new Date(2026, 10, 18),
    recurrence: thirdWednesday,
    endDate: new Date(2027, 2, 31),
    stopped: false,
    openEnded: false,
    ...over,
  });

  it('says no end date, the end date or stopped', () => {
    expect(describeEnd(series({ openEnded: true }), translator('en'), 'en')).toBe('No end date');
    expect(describeEnd(series({ openEnded: true }), translator('sv'), 'sv')).toBe('Inget slutdatum');
    expect(plain(describeEnd(series({}), translator('en'), 'en'))).toBe('Ends 31 March 2027');
    expect(plain(describeEnd(series({}), translator('sv'), 'sv'))).toBe('Slutar 31 mars 2027');
    expect(describeEnd(series({ stopped: true, openEnded: true }), translator('en'), 'en')).toBe(
      'Repeat stopped',
    );
    expect(describeEnd(series({ stopped: true }), translator('sv'), 'sv')).toBe('Upprepningen har stoppats');
  });
});
