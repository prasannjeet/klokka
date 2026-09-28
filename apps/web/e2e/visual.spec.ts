// Non-gating screenshots of every screen, light and dark, phone and desktop, into apps/web/.shots/ (gitignored)
// to look at. Runs against the Prism mock through the development fake session.
import { test } from '@playwright/test';
import { SCREENS, asPersona, type Persona } from './support';

const SIZES = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

for (const scheme of ['dark', 'light'] as const) {
  for (const size of SIZES) {
    test(`${scheme} ${size.width}`, async ({ browser, baseURL }) => {
      for (const persona of ['employer', 'employee', 'operator', 'public'] as (Persona | 'public')[]) {
        const context = await browser.newContext({
          viewport: size,
          colorScheme: scheme,
          reducedMotion: 'reduce',
        });
        await asPersona(context, baseURL as string, persona === 'public' ? 'employee' : persona);
        const page = await context.newPage();
        for (const path of SCREENS[persona]) {
          await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
          const name = `${persona}-${scheme}-${size.width}${path.replace(/[/?=&]+/g, '_')}`;
          await page.screenshot({ path: `.shots/${name}.png`, fullPage: true });
        }
        await context.close();
      }
    });
  }
}
