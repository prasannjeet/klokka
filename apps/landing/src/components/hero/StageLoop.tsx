'use client';

import { useEffect, useRef, type ReactNode } from 'react';

const LOOP_MS = 9200;

/**
 * Restarts the hero choreography every 9.2 s: cells pop in from 0.5 s at 110 ms intervals, the toast lands at
 * 3.2 s, Maria's phone at 4.6 s, both leave at 8.3 s. The server renders it already playing, so the first run
 * needs no JavaScript; under reduced motion the CSS shows the final state and nothing restarts.
 */
export function StageLoop({ label, children }: { label: string; children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stage.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => {
      el.classList.remove('play');
      void el.offsetWidth;
      el.classList.add('play');
    }, LOOP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div ref={stage} className="stage play" role="figure" aria-label={label}>
      {children}
    </div>
  );
}
