'use client';

import type { ReactNode } from 'react';

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <button
      id={id}
      className="switch"
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="track" aria-hidden="true" />
      <span className="sw-l">
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
    </button>
  );
}
