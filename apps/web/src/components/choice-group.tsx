'use client';

// A single-choice group drawn as buttons (segments, colour swatches, emoji tiles) with radio semantics:
// one tab stop, arrow keys move and select, the selection is announced as checked.
import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

export interface Choice<V extends string> {
  value: V;
  label: string;
  content?: ReactNode;
  style?: CSSProperties;
  lang?: string;
}

export function ChoiceGroup<V extends string>({
  className,
  label,
  labelledBy,
  choices,
  value,
  onChange,
  disabled,
}: {
  className: string;
  label?: string;
  labelledBy?: string;
  choices: readonly Choice<V>[];
  value: V | null;
  onChange: (value: V) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = choices.findIndex((c) => c.value === value);
  const focusable = index >= 0 ? index : 0;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, i: number) {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (i + step + choices.length) % choices.length;
    const choice = choices[next];
    if (!choice) return;
    onChange(choice.value);
    refs.current[next]?.focus();
  }

  return (
    <div className={className} role="radiogroup" aria-label={label} aria-labelledby={labelledBy}>
      {choices.map((choice, i) => (
        <button
          key={choice.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={choice.value === value}
          aria-label={choice.content !== undefined ? choice.label : undefined}
          tabIndex={i === focusable ? 0 : -1}
          style={choice.style}
          lang={choice.lang}
          disabled={disabled}
          onClick={() => onChange(choice.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {choice.content !== undefined ? choice.content : choice.label}
        </button>
      ))}
    </div>
  );
}
