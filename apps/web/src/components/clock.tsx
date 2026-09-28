'use client';

// The railway clock (docs/design/DIRECTION.md section 5, "Paddle"): second hand sweeps in 58.5 s and waits
// at twelve, minute hand steps, hour hand glides, all synced to the real time in the given zone through
// negative animation delays. Reduced motion stops the hands where they are.
import { useEffect, useRef } from 'react';
import { clockIn } from '@/lib/time';

const TICKS = Array.from({ length: 60 }, (_, i) => i);

export function RailwayClock({ timeZone, label }: { timeZone?: string; label: string }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const root = svg.current;
    if (!root) return;
    const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const { h, m, s } = clockIn(zone);
    const set = (sel: string, delay: number, deg: number) => {
      const el = root.querySelector<SVGGElement>(sel);
      if (!el) return;
      el.style.animationDelay = `${-delay}s`;
      el.style.transform = `rotate(${Math.min(deg, 360)}deg)`;
    };
    set('.hand.second', s, (s / 58.5) * 360);
    set('.hand.minute', m * 60 + s, m * 6);
    set('.hand.hour', (h % 12) * 3600 + m * 60 + s, ((h % 12) + m / 60) * 30);
  }, [timeZone]);
  return (
    <svg ref={svg} className="clock" viewBox="0 0 200 200" role="img" aria-label={label}>
      <circle className="face" cx="100" cy="100" r="96" />
      <g>
        {TICKS.map((i) => {
          const hour = i % 5 === 0;
          return (
            <rect
              key={i}
              className="tick"
              x={hour ? 96.5 : 98.6}
              y={9}
              width={hour ? 7 : 2.8}
              height={hour ? 24 : 9}
              transform={`rotate(${i * 6} 100 100)`}
            />
          );
        })}
      </g>
      <g className="hand hour">
        <rect x="93" y="44" width="14" height="70" rx="2" />
      </g>
      <g className="hand minute">
        <rect x="94" y="16" width="12" height="98" rx="2" />
      </g>
      <g className="hand second">
        <rect x="98.5" y="34" width="3" height="92" />
        <circle cx="100" cy="44" r="11" />
      </g>
      <circle cx="100" cy="100" r="5" className="tick" />
    </svg>
  );
}
