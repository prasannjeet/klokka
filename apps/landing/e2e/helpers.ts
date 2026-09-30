import type { Page } from '@playwright/test';

export const PHONES = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
] as const;
export const DESKTOP = { width: 1440, height: 900 } as const;
export const VIEWPORTS = [...PHONES, DESKTOP] as const;

export const PAGES = [
  { locale: 'sv', path: '/', lang: 'sv-SE', tagline: 'En klocka.' },
  { locale: 'en', path: '/en', lang: 'en', tagline: 'One clock.' },
] as const;

/** One registry page per layout kind: width, targets, language, and a head that points at the page's own card. */
export const SUBPAGES = [
  { id: 'about', locale: 'sv', path: '/om', lang: 'sv-SE', h1: 'Om Klokka' },
  { id: 'privacy', locale: 'en', path: '/en/privacy', lang: 'en', h1: 'Privacy policy' },
  {
    id: 'calculator',
    locale: 'sv',
    path: '/rakna-arbetstimmar',
    lang: 'sv-SE',
    h1: 'Räkna ut arbetstid och timmar',
  },
  {
    id: 'template',
    locale: 'en',
    path: '/en/timesheet-template',
    lang: 'en',
    h1: 'Free monthly timesheet template in Excel and PDF',
  },
  {
    id: 'app',
    locale: 'sv',
    path: '/tidrapportering-app',
    lang: 'sv-SE',
    h1: 'Tidrapportering i en app, för både arbetsgivaren och de anställda',
  },
  {
    id: 'guide-change',
    locale: 'en',
    path: '/en/guide/can-an-employer-change-hours',
    lang: 'en',
    h1: 'Can an employer change the hours on your timesheet?',
  },
] as const;

/** Collects console errors and page errors from the moment it is called. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Visible elements whose box leaves the viewport sideways (the marquee and the cropped wordmark are meant to). */
export async function escapingElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [];
    const skip = '.ticker, .foot-big, .menu, .sprite, .skip';
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      if (el.closest(skip)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'contents') continue;
      if (r.right > vw + 1 || r.left < -1) {
        out.push(
          `${el.tagName.toLowerCase()}.${el.className} [${Math.round(r.left)}, ${Math.round(r.right)}]`,
        );
      }
    }
    return out;
  });
}

/** Visible links, buttons and summaries shorter than the 44 px tap minimum. */
export async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('a, button, summary'))) {
      // Links inside running text are exempt from the target size (WCAG 2.5.8, inline exception).
      if (el.closest('.sprite, .skip, .menu[hidden], .inline-link')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const tooShort = r.height < 44 - 0.5;
      const tooNarrow = el.classList.contains('icon-btn') && r.width < 44 - 0.5;
      if (tooShort || tooNarrow)
        out.push(
          `${el.tagName.toLowerCase()} "${el.textContent?.trim()}" ${Math.round(r.width)}x${Math.round(r.height)}`,
        );
    }
    return out;
  });
}
