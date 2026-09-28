import { expect, test } from '@playwright/test';
import { collectErrors, PHONES } from './helpers';

// Runs against this host's LAN address (http://192.168.x.x:3001), not localhost: Next's dev-origin protection
// serves the HTML but refuses the client bundle cross-origin unless allowedDevOrigins is set, which would leave a
// static page with dead JavaScript. Every assertion here needs hydrated React.
test.use({ viewport: PHONES[1] });

test('the site hydrates over the LAN: pay switch, theme toggle and the rotating word all respond', async ({
  page,
  baseURL,
}) => {
  expect(baseURL).toMatch(/^http:\/\/192\.168\./);
  const errors = collectErrors(page);
  await page.goto('/en');

  const sw = page.getByRole('switch', { name: 'Show pay to employees' });
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.tile.cost')).toBeVisible();

  await page.locator('.nav-right > .theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', /light|dark/);

  const word = page.locator('.rot .word');
  const first = await word.textContent();
  await expect(word).not.toHaveText(first ?? '', { timeout: 6000 });

  expect(errors).toEqual([]);
});

test('the Swedish root and the English page both answer over the LAN', async ({ request }) => {
  expect((await request.get('/')).status()).toBe(200);
  expect((await request.get('/en')).status()).toBe(200);
});
