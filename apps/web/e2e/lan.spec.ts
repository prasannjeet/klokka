// The app over the LAN address hydrates (AGENTS.md: Next blocks cross-origin dev resources without
// allowedDevOrigins, which leaves static HTML with dead client JS). Typing into the week grid must move the
// row total, which only happens with a live React tree.
import { expect, test } from '@playwright/test';
import { asPersona } from './support';

test('week grid is interactive over the LAN URL', async ({ page, context, baseURL }) => {
  expect(baseURL).toMatch(/^http:\/\/192\.168\./);
  const blocked: string[] = [];
  page.on('console', (m) => {
    if (/Blocked cross-origin/i.test(m.text())) blocked.push(m.text());
  });
  await asPersona(context, baseURL as string, 'employer');
  await page.goto('/w/cafe-nord/week?d=2026-09-23', { waitUntil: 'networkidle' });
  const total = page.locator('.wg .rt span').first();
  const before = await total.innerText();
  await page.locator('.wg input[data-r="0"][data-c="0"]').fill('7,5');
  await expect(total).not.toHaveText(before);
  await expect(page.locator('.savebar')).toBeVisible();
  expect(blocked).toEqual([]);
});

test('the BFF answers over the LAN URL', async ({ request, baseURL }) => {
  const res = await request.get(`${baseURL}/healthz`);
  expect(res.ok()).toBe(true);
});
