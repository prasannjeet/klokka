'use client';

import { useEffect } from 'react';

/**
 * One observer for the page. Adds `is-in` to [data-animate] blocks (the per-employee bars fill) and, only
 * in browsers without CSS scroll timelines, to `.reveal` blocks (the rise fallback in globals.css).
 */
export function InViewObserver() {
  useEffect(() => {
    const scrollTimelines = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');
    const selector = scrollTimelines ? '[data-animate]' : '[data-animate], .reveal';
    const targets = document.querySelectorAll(selector);
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}
