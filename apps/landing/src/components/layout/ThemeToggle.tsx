'use client';

import { Icon } from '@/components/ui/Icon';

export const MODE_KEY = 'klokka-mode';

/**
 * Light or dark. With no stored choice the page follows the device (tokens resolve light-dark() against
 * color-scheme). A click picks the opposite of what is showing; picking what the device already shows
 * clears the override, so the page follows the device again. The icons are swapped by CSS (globals.css),
 * so the server markup never depends on the mode.
 */
export function ThemeToggle({ label }: { label: string }) {
  function toggle() {
    const root = document.documentElement;
    const device = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const showing = root.getAttribute('data-mode') ?? device;
    const next = showing === 'dark' ? 'light' : 'dark';
    if (next === device) {
      root.removeAttribute('data-mode');
    } else {
      root.setAttribute('data-mode', next);
    }
    try {
      if (next === device) window.localStorage.removeItem(MODE_KEY);
      else window.localStorage.setItem(MODE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the choice then lasts for this page view.
    }
  }

  return (
    <button type="button" className="icon-btn theme-toggle" aria-label={label} title={label} onClick={toggle}>
      <Icon name="sun" className="when-dark" />
      <Icon name="moon" className="when-light" />
    </button>
  );
}
