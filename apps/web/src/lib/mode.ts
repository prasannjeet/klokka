// Dark and light (CHQ-139): the device decides unless the user picked one. The choice is stored with the
// user's preferences (theme: SYSTEM | LIGHT | DARK) and mirrored into <html data-mode> and a cookie so the
// first HTML already renders in it.
import type { ThemePreference } from '@klokka/api-client';
import { MODE_COOKIE, type Mode } from './prefs';

export function modeOfPreference(theme: ThemePreference): Mode | null {
  return theme === 'LIGHT' ? 'light' : theme === 'DARK' ? 'dark' : null;
}

export function applyMode(mode: Mode | null): void {
  const root = document.documentElement;
  if (mode) {
    root.dataset.mode = mode;
    document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
  } else {
    delete root.dataset.mode;
    document.cookie = `${MODE_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}
