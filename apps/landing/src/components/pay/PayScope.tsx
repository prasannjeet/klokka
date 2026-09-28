'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type PayState = { on: boolean; toggle: () => void };

const PayContext = createContext<PayState | null>(null);

/**
 * The pay switch drives two sections at once: money figures in the pay card and the labour-cost tile in
 * insights. The wrapper carries data-pay; the CSS does the rest (the money slides in, the tile pops).
 */
export function PayScope({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <PayContext value={{ on, toggle: () => setOn((v) => !v) }}>
      <div data-pay={on ? 'on' : 'off'}>{children}</div>
    </PayContext>
  );
}

export function PaySwitch({ label }: { label: string }) {
  const pay = useContext(PayContext);
  if (!pay) throw new Error('PaySwitch must be rendered inside PayScope');
  return (
    <button type="button" className="switch" role="switch" aria-checked={pay.on} onClick={pay.toggle}>
      <span className="track" aria-hidden="true" />
      {label}
    </button>
  );
}
