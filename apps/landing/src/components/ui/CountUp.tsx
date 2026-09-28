'use client';

import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@klokka/core/format';
import type { Locale } from '@/lib/i18n';

const DURATION_MS = 1100;

/**
 * A stat that counts up once when it scrolls into view (ease-out cubic, 1.1 s). The server renders the final
 * number, so without JavaScript or under reduced motion the figure is simply there.
 */
export function CountUp({ value, locale }: { value: number; locale: Locale }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / DURATION_MS);
          setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{formatNumber(shown, locale, 0)}</span>;
}
