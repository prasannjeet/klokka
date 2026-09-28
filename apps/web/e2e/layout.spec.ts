// Gating layout checks in a real browser (AGENTS.md responsive rules): no horizontal page scroll at the four
// phone widths and on desktop, 44 px touch targets on phones, the week grid scrolling inside its own card,
// and the soft keyboard opening and closing over a focused cell.
import { expect, test } from '@playwright/test';
import { DESKTOP, PHONES, SCREENS, asPersona, horizontalOverflow, type Persona } from './support';

const PERSONAS: (Persona | 'public')[] = ['employer', 'employee', 'operator', 'public'];

for (const size of [...PHONES, DESKTOP]) {
  const phone = size.width < 1024;
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({
      viewport: size,
      hasTouch: phone,
      isMobile: phone,
      contextOptions: { reducedMotion: 'reduce' },
    });

    for (const persona of PERSONAS) {
      test(`${persona} screens fit without horizontal scroll`, async ({ page, context, baseURL }) => {
        await asPersona(context, baseURL as string, persona === 'public' ? 'employee' : persona);
        for (const path of SCREENS[persona]) {
          await page.goto(path, { waitUntil: 'networkidle' });
          await expect(page.locator('main, .auth').first()).toBeVisible();
          expect(await horizontalOverflow(page), `${path} overflows`).toBeLessThanOrEqual(0);
        }
      });
    }

    if (phone) {
      test('touch targets are at least 44 px', async ({ page, context, baseURL }) => {
        await asPersona(context, baseURL as string, 'employer');
        for (const path of [
          '/w/cafe-nord/week?d=2026-09-23',
          '/w/cafe-nord/employees',
          '/w/cafe-nord/settings',
        ]) {
          await page.goto(path, { waitUntil: 'networkidle' });
          const small = await page.evaluate(() =>
            [
              ...document.querySelectorAll<HTMLElement>(
                '.tabbar .tab, .topbar .ib, .topbar .ws-btn, main .btn, main .chip, main .mnav button, main .seg button, main .switch',
              ),
            ]
              .filter((el) => el.offsetParent !== null)
              .map((el) => ({
                el: el.className,
                h: el.getBoundingClientRect().height,
                text: el.textContent?.trim(),
              }))
              .filter((b) => b.h < 44),
          );
          expect(small, path).toEqual([]);
        }
      });

      test('the week grid scrolls inside its card with the names pinned', async ({
        page,
        context,
        baseURL,
      }) => {
        await asPersona(context, baseURL as string, 'employer');
        await page.goto('/w/cafe-nord/week?d=2026-09-23', { waitUntil: 'networkidle' });
        const scroller = page.locator('.wg-scroll');
        const inner = await scroller.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
        expect(inner.scroll).toBeGreaterThan(inner.client);
        await scroller.evaluate((el) => el.scrollTo({ left: 400 }));
        const who = await page.locator('.wg .who').first().boundingBox();
        const card = await page.locator('.wg-card').boundingBox();
        expect(who && card && who.x - card.x).toBeLessThan(4);
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      });

      test('soft keyboard opening and closing over a cell keeps the layout and the save bar', async ({
        page,
        context,
        baseURL,
      }) => {
        await asPersona(context, baseURL as string, 'employer');
        await page.goto('/w/cafe-nord/week?d=2026-09-23', { waitUntil: 'networkidle' });
        const cell = page.locator('.wg input[data-r="0"][data-c="1"]');
        await cell.tap();
        await page.keyboard.type('5');
        // The keyboard takes roughly the lower half of the screen.
        await page.setViewportSize({ width: size.width, height: Math.round(size.height * 0.55) });
        await cell.scrollIntoViewIfNeeded();
        await expect(cell).toBeInViewport();
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
        await expect(page.locator('.savebar')).toBeInViewport();
        await page.setViewportSize(size);
        expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
        await expect(page.locator('.savebar')).toBeInViewport();
        await expect(cell).toHaveValue('5');
      });
    }
  });
}
