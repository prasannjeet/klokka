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

// The new controls run inside the real app dialog. The server preview is deterministic here;
// backend calendar rules and atomic writes are covered against PostgreSQL by JobRecurrenceTest.
for (const size of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
  { width: 1440, height: 900 },
]) {
  test(`recurring job requires an end and fits at ${size.width}x${size.height}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.clock.setFixedTime(new Date('2026-10-05T12:00:00Z'));
    await page.setViewportSize(size);
    await asPersona(context, baseURL as string, 'employer');
    await page.route('**/api/k/workspaces/*/members/*/months/*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), month: '2026-10', days: [], locked: false },
      });
    });
    await page.route('**/api/k/workspaces/*/jobs/recurrence-preview', (route) =>
      route.fulfill({
        json: {
          dates: [
            { date: '2026-10-07' },
            { date: '2026-10-14' },
            { date: '2026-10-21' },
            { date: '2026-10-28' },
          ],
          occurrenceCount: 4,
          lastDate: '2026-10-28',
          endDate: '2026-11-03',
        },
      }),
    );
    await page.goto('/w/cafe-nord/month?month=2026-10&day=2026-10-07', { waitUntil: 'networkidle' });
    await page.getByTestId('add-job').click();
    const dialog = page.locator('dialog[open]');
    await dialog.locator('.job-form .chips').first().getByRole('button').nth(3).click();
    await dialog.locator('.recurrence-editor > .chips button').nth(1).click();
    const save = dialog.locator('button[type=submit]');
    await expect(save).toBeDisabled();
    await dialog.locator('#repeat-end-mode').selectOption('count');
    await dialog.locator('#repeat-count').fill('4');
    await expect(save).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(
      0,
    );
    expect(await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await dialog.locator('#repeat-end-mode').selectOption('date');
    await expect(save).toBeDisabled();
    await dialog.locator('#repeat-end-date').fill('2026-11-03');
    await expect(save).toBeEnabled();
    await page.setViewportSize({ width: size.width, height: Math.round(size.height * 0.55) });
    await dialog.locator('#repeat-interval').focus();
    await dialog.locator('#repeat-interval').scrollIntoViewIfNeeded();
    await expect(dialog.locator('#repeat-interval')).toBeInViewport();
    await page.setViewportSize(size);
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport();
    await page.screenshot({ path: `.shots/recurrence-${size.width}.png`, fullPage: true });
    const sent = page.waitForRequest(
      (request) => request.method() === 'POST' && /\/entries\/2026-10-07\/jobs$/.test(request.url()),
    );
    await save.click();
    expect((await sent).postDataJSON()).toMatchObject({
      recurrence: { frequency: 'WEEKLY', interval: 1, endDate: '2026-11-03', weekdays: ['WEDNESDAY'] },
      requestId: expect.any(String),
    });
    await expect(dialog).toBeHidden();
  });
}
