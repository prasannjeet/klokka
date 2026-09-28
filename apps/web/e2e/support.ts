import type { BrowserContext, Page } from '@playwright/test';

export type Persona = 'employer' | 'employee' | 'operator';

// The development fake session answers every page as signed in; the persona cookie picks the role /me reports
// (src/lib/dev-persona.ts). Only works against `next dev` with KLOKKA_DEV_FAKE_SESSION=1.
export async function asPersona(context: BrowserContext, baseURL: string, persona: Persona): Promise<void> {
  await context.addCookies([{ name: 'klokka_dev_persona', value: persona, url: baseURL }]);
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

export const PHONES = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
] as const;

export const DESKTOP = { width: 1440, height: 900 } as const;

// A Prism-valid invitation token (16+ characters).
export const INVITE = 'inv_7Qm2Xk9Lp4Rt8Vw3';

export const SCREENS: Record<Persona | 'public', string[]> = {
  employer: [
    '/w/cafe-nord',
    '/w/cafe-nord/week?d=2026-09-23',
    '/w/cafe-nord/employees',
    '/w/cafe-nord/month',
    '/w/cafe-nord/notifications',
    '/w/cafe-nord/settings',
    '/w/cafe-nord/profile',
    '/new',
  ],
  employee: [
    '/w/cafe-nord',
    '/w/cafe-nord/week?d=2026-09-23',
    '/w/cafe-nord/notifications',
    '/w/cafe-nord/profile',
  ],
  operator: ['/ops/workspaces', '/ops/users', '/ops/invitations', '/ops/volume', '/ops/health'],
  public: [`/join?token=${INVITE}`, '/sign-in?reauth=1'],
};
