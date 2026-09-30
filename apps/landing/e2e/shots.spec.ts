import { expect, test } from '@playwright/test';
import { DESKTOP, PAGES, PHONES } from './helpers';

// Non-gating screenshot producer for visual review against the mockup (docs/design/mockups/landing.html with
// ?theme=nightshift). Writes to apps/landing/shots/ (gitignored). Hero captures wait 5.6 s so the toast and
// Maria's phone are on screen, as the mockup captures did; full pages use reduced motion so every section is in
// its final state.
const OUT = 'shots';
const MODES = ['dark', 'light'] as const;
const phone = PHONES[1];

for (const p of PAGES) {
  for (const mode of MODES) {
    for (const vp of [DESKTOP, phone]) {
      test(`hero ${p.locale} ${mode} ${vp.width}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.emulateMedia({ colorScheme: mode });
        await page.goto(p.path);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(5600);
        await page.screenshot({ path: `${OUT}/hero-${p.locale}-${mode}-${vp.width}.png` });
      });
    }
    test(`full ${p.locale} ${mode} 1440`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
      await page.goto(p.path);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${OUT}/full-${p.locale}-${mode}-1440.png`, fullPage: true });
    });
  }
  test(`full ${p.locale} ${p.locale === 'sv' ? 'dark' : 'light'} 390`, async ({ page }) => {
    const mode = p.locale === 'sv' ? 'dark' : 'light';
    await page.setViewportSize(phone);
    await page.emulateMedia({ colorScheme: mode, reducedMotion: 'reduce' });
    await page.goto(p.path);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${OUT}/full-${p.locale}-${mode}-390.png`, fullPage: true });
  });
}

test('menu open, sv dark 390', async ({ page }) => {
  await page.setViewportSize(phone);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Öppna menyn' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/menu-sv-dark-390.png` });
});

test('pay switch on, en light 1440', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/en');
  await page.getByRole('switch', { name: 'Show pay to employees' }).click();
  await page.locator('#pay').screenshot({ path: `${OUT}/pay-on-en-light-1440.png` });
  await page.locator('#insights').screenshot({ path: `${OUT}/insights-pay-on-en-light-1440.png` });
});

for (const locale of ['sv', 'en'] as const) {
  test(`social card ${locale}`, async ({ request }) => {
    const res = await request.get(`/og/home-${locale}.jpg`);
    expect(res.status()).toBe(200);
    const { writeFile } = await import('node:fs/promises');
    await writeFile(`${OUT}/og-home-${locale}.jpg`, await res.body());
  });
}
