'use client';

// Hours and minutes as two scroll wheels, the phone's picker on the web (CHQ-156): scroll or drag and it snaps
// to a row, click a row to jump to it, and with the keyboard each wheel is a spinbutton (arrow keys step,
// Page keys jump, Home and End go to the ends). The minutes are the ones the workspace rounding allows.
import { useEffect, useRef, type KeyboardEvent } from 'react';

const ROW = 40;
const VISIBLE = 5;
const PAD = ROW * Math.floor(VISIBLE / 2);
const SETTLE_MS = 90;

function Wheel({
  values,
  value,
  onChange,
  format,
  unit,
  label,
  testId,
}: {
  values: readonly number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  unit: string;
  label: string;
  testId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const programmatic = useRef(false);
  const placed = useRef(false);
  const index = Math.max(0, values.indexOf(value));

  // The value moved from outside (a chip, a key, a click): bring its row under the band.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const top = index * ROW;
    if (!placed.current) {
      // The first placement is instant: the wheel opens on its value, it does not spin to it.
      placed.current = true;
      el.scrollTop = top;
      return;
    }
    if (Math.abs(el.scrollTop - top) < 1) return;
    programmatic.current = true;
    if (typeof el.scrollTo === 'function') el.scrollTo({ top, behavior: 'smooth' });
    else el.scrollTop = top;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => (programmatic.current = false), 400);
  }, [index]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  function onScroll() {
    if (programmatic.current) return;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      const next = values[i];
      if (next !== undefined && next !== value) onChange(next);
    }, SETTLE_MS);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = values.length - 1;
    let i: number | null = null;
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') i = index + 1;
    else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') i = index - 1;
    else if (event.key === 'PageUp') i = index + 5;
    else if (event.key === 'PageDown') i = index - 5;
    else if (event.key === 'Home') i = 0;
    else if (event.key === 'End') i = last;
    if (i === null) return;
    event.preventDefault();
    const next = values[Math.min(last, Math.max(0, i))];
    if (next !== undefined && next !== value) onChange(next);
  }

  return (
    <div className="wheel">
      <div
        ref={ref}
        className="wheel-scroll"
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={values[0]}
        aria-valuemax={values.at(-1)}
        aria-valuenow={value}
        aria-valuetext={`${format(value)} ${unit}`}
        data-testid={testId}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
      >
        <div style={{ height: PAD }} aria-hidden="true" />
        {values.map((v, i) => {
          const distance = Math.abs(i - index);
          return (
            <button
              key={v}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className={distance === 0 ? 'witem on' : distance === 1 ? 'witem near' : 'witem'}
              onClick={() => onChange(v)}
              data-testid={`${testId}-${v}`}
            >
              {format(v)}
            </button>
          );
        })}
        <div style={{ height: PAD }} aria-hidden="true" />
      </div>
      <span className="wheel-unit" aria-hidden="true">
        {unit}
      </span>
    </div>
  );
}

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export function TimeWheels({
  hours,
  minutes,
  minuteOptions,
  onChange,
  hourUnit,
  minuteUnit,
  hoursLabel,
  minutesLabel,
}: {
  hours: number;
  minutes: number;
  minuteOptions: readonly number[];
  onChange: (hours: number, minutes: number) => void;
  hourUnit: string;
  minuteUnit: string;
  hoursLabel: string;
  minutesLabel: string;
}) {
  return (
    <div className="wheels">
      <div className="wheels-band" aria-hidden="true" />
      <Wheel
        values={HOURS}
        value={hours}
        onChange={(h) => onChange(h, h === 24 ? 0 : minutes)}
        format={String}
        unit={hourUnit}
        label={hoursLabel}
        testId="wheel-hours"
      />
      <Wheel
        values={hours === 24 ? [0] : minuteOptions}
        value={minutes}
        onChange={(m) => onChange(hours, m)}
        format={(m) => String(m).padStart(2, '0')}
        unit={minuteUnit}
        label={minutesLabel}
        testId="wheel-minutes"
      />
    </div>
  );
}
