import { useState } from 'react';
import { useLocale, useT } from '@/i18n/LocaleProvider';
import { Wheel, WheelGroup } from '@/ui';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS_AHEAD = 10;

// Day, month and year wheels for one date (a job's date, a repeat's end date). The years start at `min`, or a year
// before the date it opened with, and run ten years past it; a day past the month's end clamps to its last day.
export function DateWheels({
  value,
  min,
  onChange,
  testID,
}: {
  value: Date;
  min?: Date | undefined;
  onChange: (date: Date) => void;
  testID: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [years] = useState(() => {
    const first = min ? min.getFullYear() : value.getFullYear() - 1;
    const last = value.getFullYear() + YEARS_AHEAD;
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  });
  const year = value.getFullYear();
  const month = value.getMonth() + 1;
  const day = value.getDate();
  const days = Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
  const change = (y: number, m: number, d: number) =>
    onChange(new Date(y, m - 1, Math.min(d, new Date(y, m, 0).getDate())));
  return (
    <WheelGroup>
      <Wheel
        values={days}
        value={day}
        onChange={(d) => change(year, month, d)}
        format={String}
        unit=""
        accessibilityLabel={t('recurrence.day')}
        testID={`${testID}-day`}
      />
      <Wheel
        values={MONTHS}
        value={month}
        onChange={(m) => change(year, m, day)}
        format={(m) => new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(year, m - 1, 1))}
        unit=""
        accessibilityLabel={t('recurrence.month')}
        testID={`${testID}-month`}
      />
      <Wheel
        values={years}
        value={year}
        onChange={(y) => change(y, month, day)}
        format={String}
        unit=""
        accessibilityLabel={t('recurrence.year')}
        testID={`${testID}-year`}
      />
    </WheelGroup>
  );
}
