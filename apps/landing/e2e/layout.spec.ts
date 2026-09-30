import { expect, test } from '@playwright/test';
import { collectErrors, escapingElements, PAGES, PHONES, smallTargets, SUBPAGES, VIEWPORTS } from './helpers';

for (const p of PAGES) {
  for (const vp of VIEWPORTS) {
    test(`${p.locale} ${vp.width}x${vp.height}: fits the width, 44 px targets, right language`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      const errors = collectErrors(page);
      await page.goto(p.path);
      await page.evaluate(() => document.fonts.ready);

      await expect(page.locator('html')).toHaveAttribute('lang', p.lang);
      await expect(page.locator('h1')).toContainText(p.tagline);

      const [scrollWidth, innerWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        window.innerWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      expect(await escapingElements(page)).toEqual([]);

      // The page is taller than the viewport; scroll through so every section has been laid out and revealed.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 30));
        }
      });
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test(`${p.locale}: SEO head (canonical, hreflang, Open Graph, JSON-LD)`, async ({ page }) => {
    await page.goto(p.path);
    const head = await page.evaluate(() => ({
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      hreflang: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map((l) =>
        l.getAttribute('hreflang'),
      ),
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      ogLocale: document.querySelector('meta[property="og:locale"]')?.getAttribute('content'),
      description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
      jsonLd: JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? 'null'),
    }));
    expect(head.canonical).toMatch(p.locale === 'sv' ? /^https?:\/\/[^/]+$/ : /\/en$/);
    expect(head.hreflang.sort()).toEqual(['en', 'sv-SE', 'x-default']);
    expect(head.ogImage).toMatch(p.locale === 'sv' ? /\/og\/home-sv\.jpg$/ : /\/og\/home-en\.jpg$/);
    expect(head.ogLocale).toBe(p.locale === 'sv' ? 'sv_SE' : 'en_GB');
    expect(head.description?.length ?? 0).toBeGreaterThan(80);
    const types = (head.jsonLd['@graph'] as Array<{ '@type': string }>).map((n) => n['@type']);
    expect(types).toEqual(['Organization', 'WebSite', 'WebPage', 'FAQPage', 'SoftwareApplication']);
  });
}

for (const p of SUBPAGES) {
  for (const vp of VIEWPORTS) {
    test(`${p.path} ${vp.width}x${vp.height}: fits the width, 44 px targets, right language`, async ({
      page,
    }) => {
      await page.setViewportSize(vp);
      const errors = collectErrors(page);
      await page.goto(p.path);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('html')).toHaveAttribute('lang', p.lang);
      await expect(page.locator('h1')).toHaveText(p.h1);
      const [scrollWidth, innerWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        window.innerWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      expect(await escapingElements(page)).toEqual([]);
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test(`${p.path}: head points at its own card and its twin page`, async ({ page }) => {
    await page.goto(p.path);
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toMatch(new RegExp(`/og/${p.id}-${p.locale}\\.jpg$`));
    const hreflang = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((ls) => ls.map((l) => l.getAttribute('hreflang')));
    expect(hreflang.sort()).toEqual(['en', 'sv-SE', 'x-default']);
    expect(
      (await page.request.get(ogImage!.replace(/^https?:\/\/[^/]+/, ''))).headers()['content-type'],
    ).toBe('image/jpeg');
  });
}

test('/sv redirects to / (one canonical URL per language)', async ({ request }) => {
  const res = await request.get('/sv', { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()['location']).toBe('/');
});

// What the running build must tell search engines: `npm run dev` and a default build are noindex; set
// PW_EXPECT_INDEXABLE=true (with PW_BASE_URL) when testing a production-style build made with
// NEXT_PUBLIC_INDEXABLE=true. The sitemap's entries themselves are checked in test/sitemap.test.ts.
const expectIndexable = process.env.PW_EXPECT_INDEXABLE === 'true';

test(`indexing signals match the build (${expectIndexable ? 'indexable' : 'noindex'})`, async ({
  request,
}) => {
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Sitemap:');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const path of ['/', '/en']) {
    const res = await request.get(path);
    const meta = (await res.text()).match(/<meta name="robots" content="([^"]*)"/)?.[1];
    if (expectIndexable) {
      expect(meta, path).toMatch(/^index, follow/);
      expect(res.headers()['x-robots-tag'], path).toBeUndefined();
    } else {
      expect(meta, path).toMatch(/^noindex/);
      expect(res.headers()['x-robots-tag'], path).toContain('noindex');
    }
  }
  if (expectIndexable) {
    expect(sitemap).toContain('hreflang="sv-SE"');
    expect(sitemap).toContain('hreflang="x-default"');
    expect(sitemap).toContain('/en</loc>');
  } else {
    expect(sitemap).toContain('<urlset');
    expect(sitemap).not.toContain('<url>');
  }
});

test('social cards, icons and security headers', async ({ request }) => {
  for (const path of ['/og/home-sv.jpg', '/og/about-en.jpg']) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type']).toBe('image/jpeg');
    expect((await res.body()).length, path).toBeLessThan(200 * 1024);
  }
  for (const path of ['/logo.png', '/icon-192.png', '/icon-512.png', '/icon-maskable.png']) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
  }
  const home = await request.get('/');
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
  expect(home.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(home.headers()['x-frame-options']).toBe('DENY');
});

test('an unknown URL answers 404 with the bilingual page', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('Sidan finns inte.');
  await expect(page.locator('h1')).toContainText('Page not found.');
});

test.describe('interactions at phone width', () => {
  test.use({ viewport: PHONES[1] });

  test('the calculator adds up a day, flags an unreadable time, and survives the soft keyboard', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto('/rakna-arbetstimmar');
    const monday = page.getByRole('group', { name: 'Måndag' });
    await monday.getByLabel('Start').fill('8');
    await monday.getByLabel('Slut').fill('16:30');
    await monday.getByLabel('Rast (min)').fill('30');
    const total = page.locator('.hc-result');
    await expect(total).toContainText('Veckan totalt');
    await expect(page.locator('.hc-result-main')).toHaveText('8 h');
    await expect(total).toContainText('8:00');
    await expect(monday.locator('.hc-sum')).toContainText('8 h');

    const tuesday = page.getByRole('group', { name: 'Tisdag' });
    await tuesday.getByLabel('Start').fill('25');
    await tuesday.getByLabel('Slut').focus();
    await expect(tuesday.getByLabel('Start')).toHaveAttribute('aria-invalid', 'true');
    await expect(tuesday.locator('.hc-error')).toHaveText('Skriv tiden som 8, 8:30 eller 0830.');

    // The soft keyboard proxy: focus an input, then blur it; the page must not scroll sideways at any point.
    const noSideScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await page.getByRole('group', { name: 'Söndag' }).getByLabel('Rast (min)').focus();
    expect(await noSideScroll()).toBe(true);
    await page.locator('h1').click();
    expect(await noSideScroll()).toBe(true);
    expect(await escapingElements(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('the template page offers both files with the download attribute', async ({ page, request }) => {
    await page.goto('/tidrapport-mall');
    for (const [name, type] of [
      ['Ladda ner Excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      ['Ladda ner PDF', 'application/pdf'],
    ] as const) {
      const link = page.getByRole('link', { name: new RegExp(`^${name} \\(.+ kB\\)$`) });
      await expect(link).toHaveAttribute('download', '');
      const res = await request.get((await link.getAttribute('href'))!);
      expect(res.status(), name).toBe(200);
      expect(res.headers()['content-type'], name).toContain(type);
    }
    await expect(page.locator('img.td-preview')).toHaveAttribute(
      'alt',
      /^Förhandsvisning av tidrapport mallen/,
    );
  });

  test('the menu opens as a dialog, takes focus, and Escape closes it', async ({ page }) => {
    await page.goto('/en');
    const burger = page.getByRole('button', { name: 'Open menu' });
    await burger.click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(burger).toBeFocused();
    await burger.click();
    await dialog.getByRole('link', { name: 'FAQ' }).click();
    await expect(dialog).toBeHidden();
  });

  test('the theme toggle overrides the device and persists; switching back follows the device', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    const toggle = page.locator('.nav-right > .theme-toggle');
    const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    const dark = await bg();
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
    expect(await bg()).not.toBe(dark);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
    await toggle.click();
    await expect(page.locator('html')).not.toHaveAttribute('data-mode', /.*/);
    expect(await bg()).toBe(dark);
  });

  test('the pay switch reveals money in the pay card and the labour-cost tile', async ({ page }) => {
    await page.goto('/en');
    const sw = page.getByRole('switch', { name: 'Show pay to employees' });
    const cost = page.locator('.tile.cost');
    await expect(cost).toBeHidden();
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(cost).toBeVisible();
    await expect(page.locator('.pay-total .money')).toHaveText('SEK 14,615');
  });

  test('reduced motion shows the final state: grid filled, toast and phone on screen', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    for (const selector of ['.stage .cell.fill >> nth=0', '.stage .toast', '.stage .phone-mini']) {
      await expect(page.locator(selector)).toHaveCSS('opacity', '1');
    }
  });

  test('the clock is set to the real time before first paint', async ({ page }) => {
    await page.goto('/');
    const delay = await page.evaluate(() =>
      document.getElementById('hero-clock')?.style.getPropertyValue('--clock-h'),
    );
    expect(delay).toMatch(/^-?\d+(\.\d+)?s$/);
  });
});

test('the 2026 hours table scrolls inside its own region at 360x640, never the page', async ({ page }) => {
  await page.setViewportSize(PHONES[0]);
  const errors = collectErrors(page);
  await page.goto('/arbetstid-per-manad/2026');
  await page.evaluate(() => document.fonts.ready);
  const region = page.getByRole('region', { name: 'Arbetsdagar och arbetstimmar per månad 2026' });
  await expect(region.locator('tbody tr')).toHaveCount(12);
  await expect(region.locator('tfoot')).toContainText('251');
  await expect(region.locator('tfoot')).toContainText('2 008');

  const box = await region.evaluate((el) => ({
    overflowX: getComputedStyle(el).overflowX,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    right: el.getBoundingClientRect().right,
  }));
  expect(['auto', 'scroll']).toContain(box.overflowX);
  expect(box.right).toBeLessThanOrEqual(360);
  // The table is wider than a 360 px phone; if a layout change ever makes it fit, the region simply never scrolls.
  if (box.scrollWidth > box.clientWidth) {
    await region.evaluate((el) => el.scrollBy({ left: 200 }));
    expect(await region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  }
  const [scrollWidth, innerWidth] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ]);
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
  expect(errors).toEqual([]);
});
