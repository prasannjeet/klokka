'use client';

import { useEffect, useState } from 'react';

const SWAP_MS = 380;
const HOLD_MS = 3400;

/**
 * The swap move: one noun replaces the next ("Free time tracking for the cafe / salon / ..."), out with rotateX
 * and blur, in from the opposite side, 3.4 s hold. Skipped entirely under reduced motion (the first word stays).
 */
export function HeadlineRotator({ words }: { words: readonly string[] }) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (words.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const hold = setInterval(() => {
      setLeaving(true);
      swap = setTimeout(() => {
        setIndex((n) => (n + 1) % words.length);
        setLeaving(false);
      }, SWAP_MS);
    }, HOLD_MS);
    return () => {
      clearInterval(hold);
      clearTimeout(swap);
    };
  }, [words.length]);

  return (
    <span className="rot">
      <span className={leaving ? 'word is-out' : 'word is-in'}>{words[index]}</span>
    </span>
  );
}
