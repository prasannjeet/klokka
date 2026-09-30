import { afterEach, describe, expect, it, vi } from 'vitest';

// links.ts reads NEXT_PUBLIC_INDEXABLE when it is first imported (Next inlines it at build time; here it is a plain
// process.env read), so each case stubs the flag, drops the module cache and imports the sitemap afresh.
async function sitemapWith(indexable: string | undefined) {
  vi.stubEnv('NEXT_PUBLIC_INDEXABLE', indexable);
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://klokka.se');
  vi.resetModules();
  const [{ default: sitemap }, { pages }, { locales }] = await Promise.all([
    import('@/app/sitemap'),
    import('@/lib/pages'),
    import('@/lib/i18n'),
  ]);
  return { entries: sitemap(), pages, locales };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('sitemap', () => {
  it('lists every registered page in both languages, each with its hreflang set and lastmod, when indexable', async () => {
    const { entries, pages, locales } = await sitemapWith('true');
    expect(entries).toHaveLength(pages.length * locales.length);
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
    expect(entries.map((e) => e.url)).toContain('https://klokka.se');
    expect(entries.map((e) => e.url)).toContain('https://klokka.se/en');
    for (const entry of entries) {
      expect(entry.url).toMatch(/^https:\/\/klokka\.se(\/|$)/);
      expect(entry.lastModified, entry.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const languages = entry.alternates?.languages ?? {};
      expect(Object.keys(languages).sort(), entry.url).toEqual(['en', 'sv-SE', 'x-default']);
      expect(languages['x-default'], entry.url).toBe(languages['sv-SE']);
      expect(Object.values(languages), entry.url).toContain(entry.url);
    }
  });

  it('is empty when the flag is unset', async () => {
    const { entries } = await sitemapWith(undefined);
    expect(entries).toEqual([]);
  });

  it('is empty for anything but the literal true', async () => {
    const { entries } = await sitemapWith('TRUE');
    expect(entries).toEqual([]);
  });
});
