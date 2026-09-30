# SEO Launch Implementation Plan

> **For agentic workers:** execute phase by phase with superpowers:executing-plans (or subagent-driven-development for
> the content tasks). Steps use checkbox (`- [ ]`) syntax for tracking. Per AGENTS.md: no per-task reviewer, one
> detailed whole-branch review at the end; targeted tests + project compile per phase; one commit per phase.

**Goal:** Make klokka.se rankable and shareable: correct indexing per environment, per-page link previews, and 21
new pages in Swedish and English (P0, P1 and P2 of the SEO plan), with the web app getting the same preview and
noindex hygiene.

**Architecture:** One page registry (plain data) drives routes, metadata, hreflang, sitemap, footer, `llms.txt` and
each page's social card. Copy lives in one typed dictionary per page, Swedish first, English typed against it, as
`dictionaries.ts` does today. Whether a build may be indexed is a build argument (`NEXT_PUBLIC_INDEXABLE`), true only
for images built by `release.yml`.

**Tech stack:** Next.js 16 App Router (static), `next/og` ImageResponse + `sharp` (JPEG cards), vitest, Playwright,
GitHub Actions, Coolify. New dev-only dependencies: `exceljs`, `pdf-lib` (template generator, output committed).

**Inputs (read before starting):**
- Plan and owner decisions: https://claude.ai/artifact/K8kaUNkMRRcq9Rb8shgj7g (db collections `picks`, `decisions`).
- Research: `docs/research/seo/` (`keywords.md`, `competitors.md`, `technical.md`, `social-specs.md`, `gapfill.md`,
  `playbook-gaps.md`, `page-briefs.md`, `workdays.py`). `page-briefs.md` is the content source for every page.
- Images: `docs/brand/social/` (README names the chosen cards; `compose.mjs` is the layout reference).

**Owner decisions this plan implements (logged 2026-09-29):**

| Topic | Decision |
|---|---|
| Main link card | "phones-right" layout (two phones side by side), Swedish screens on sv |
| Square card | clock over grid, docs only (never an og:image) |
| Scope | P0 + P1 + P2 in one build; P3 later |
| Staging | not indexable: build flag, noindex meta + `X-Robots-Tag`, robots.txt keeps `Allow` |
| Analytics | none now; GA4 with consent is P3 |
| DataForSEO | no top-up |
| Privacy role | Klokka is processor for employee hour data, controller for account data; terms with a DPA clause |
| "No limit on employees" | say it publicly |
| Comparison guide | name competitors' free-plan limits, sourced and dated, never prices |
| Contact | no personal name; a role address only |

Already done in production (not part of this plan): www to apex 301, http to https 301, HSTS (landing proxy labels,
`docs/OPERATIONS.md`).

---

## 0. Gates, ticket, branch, commits

**Owner go-aheads needed (production changes, one each).** None blocks the build or staging; all block the
production tag.
1. Create the Migadu mailbox `hej@klokka.se` (the role address on about, privacy and terms). Until it exists the
   pages still render the address from `contactEmail` in `links.ts`; the gate is that the mailbox receives mail
   before production.
2. Set Logto production sign-in experience `termsOfUseUrl` = `https://klokka.se/villkor`, `privacyPolicyUrl` =
   `https://klokka.se/integritet` (Management API `PATCH /api/sign-in-exp`). Staging gets the staging URLs in Task 4
   without a gate.
3. The legal entity line for the privacy policy (GDPR Art. 13 needs the controller's identity). Decision was "no
   personal name": the owner supplies the entity wording (for example a registered company name or "Klokka, an open
   source project operated from Sweden") before the tag. The page reads it from `legalEntity` in `links.ts`.
4. The owner reads the four labour-law guides in Swedish before the tag (playbook gap G5).
5. `./release.sh minor` and pinning the tag in production Coolify (docs/RELEASING.md), as always by the owner's ask.

**Jira:** create `KLOKKA: SEO launch: indexing, link previews and 21 landing pages (sv/en)`, label `klokka`, with a
Parity section: API not affected; web app gets preview metadata, noindex header and favicon (Task 4); mobile not
affected (it links out to the site, and Logto terms/privacy links show in its sign-in too). Link this session and
the artifact. Call the ticket `CHQ-149` below.

**Branch:** `CHQ-149-seo-launch` from `main`. **Commits:** one per phase, subject `CHQ-149: ...`, single configured
author, no co-author or assistant trailer (AGENTS.md overrides any harness default). The commit of phase 1 also adds
`docs/brand/social/`, `docs/research/seo/` and this plan (all currently untracked).

**Staging:** CI deploys staging only from `main`. After each phase's local verification, merge the branch to `main`
(fast-forward) so staging exercises it; production stays on v1.0.2 until the owner tags.

---
## 1. File map and shared types

All paths under `apps/landing/` unless stated.

| File | New / changed | Responsibility |
|---|---|---|
| `src/lib/pages/registry.ts` | new | The page list as plain data. **No imports** (next.config.ts imports it). |
| `src/lib/pages/index.ts` | new | Typed helpers over the registry (lookup, hrefs, rewrites, breadcrumbs). |
| `src/lib/i18n/pages/types.ts` | new | `PageCopy` and the kind-specific copy types. |
| `src/lib/i18n/pages/<id>.ts` | new, one per page | `sv` (`as const`) and `en: PageCopyOf<typeof sv>` for that page. |
| `src/lib/i18n/pages/index.ts` | new | `pageCopy(id, locale)` map. |
| `src/lib/i18n/dictionaries.ts` | changed | Homepage copy: target "gratis tidrapportering", new FAQ items, footer group titles. |
| `src/lib/links.ts` | changed | `indexable`, `contactEmail`, `legalEntity`, `apkUrl` becomes the klokka.se download path. |
| `src/lib/seo.ts` | changed | `metadataForPage`, `jsonLdForPage`; replaces `metadataFor` / `jsonLd`. |
| `src/lib/brand-image.tsx` | changed | `pageCard(id, locale)` (JPEG), `logoImage(size, opts)`; `socialCard` removed. |
| `src/assets/og/*.jpg` | new | Four 1200 px backgrounds from `docs/brand/social/backgrounds/`. |
| `src/lib/hours.ts` | new | Pure time maths for the calculator. |
| `src/lib/workdays.ts` | new | Swedish holidays and working days per month, any year. |
| `src/components/RichText.tsx` | new | Renders copy strings with inline `[label](page:<id>)` and `[label](https://...)` links. |
| `src/components/pages/*.tsx` | new | Layouts: `ProductPage`, `ToolPage`, `GuidePage`, `IndustryPage`, `TablePage`, `LegalPage`, shared `PageShell`, `Breadcrumbs`, `FaqList`, `CtaBand`. |
| `src/components/tools/HoursCalculator.tsx` | new | Client component for `/rakna-arbetstimmar`. |
| `src/components/layout/SiteNav.tsx`, `SiteFooter.tsx`, `MobileMenu.tsx` | changed | Anchors become `/#how` style off the homepage; footer columns from the registry. |
| `src/app/[lang]/[...slug]/page.tsx` | new | Every non-home page; static params from the registry. |
| `src/app/[lang]/layout.tsx` | changed | JSON-LD moves to the page level; layout keeps html/body. |
| `src/app/[lang]/page.tsx` | changed | Homepage metadata via `metadataForPage('home', ...)` + JSON-LD. |
| `src/app/og/[file]/route.tsx` | new | `/og/<id>-<locale>.jpg`, force-static. Replaces `og.png` and `og-en.png` routes (deleted). |
| `src/app/llms.txt/route.ts` | new | Built from the registry and page copy. |
| `src/app/sitemap.ts`, `robots.ts`, `manifest.ts` | changed | Registry-driven sitemap with x-default + lastmod; empty when not indexable; robots without `Host`, AI crawlers named; manifest 192/512/maskable. |
| `src/app/favicon.ico`, `src/app/icon1.png` | new, static | 16/32/48 ICO and 96 px PNG, generated once from `docs/brand/final/klokka-mark.png` with Pillow, committed. |
| `src/app/icon-192.png/route.tsx`, `icon-512.png/route.tsx`, `icon-maskable.png/route.tsx` | new | Manifest icons via `logoImage`. |
| `public/downloads/*` | new, committed | `tidrapport-mall.xlsx`, `tidrapport-mall.pdf`, `timesheet-template.xlsx`, `timesheet-template.pdf`. |
| `scripts/templates.ts` | new | Generates `public/downloads/*` (exceljs, pdf-lib). `npm run templates -w @klokka/landing`. |
| `next.config.ts` | changed | Registry rewrites for Swedish paths, `X-Robots-Tag` when not indexable, `/download/android` redirect. |
| `Dockerfile` | changed | `ARG/ENV NEXT_PUBLIC_INDEXABLE`, and the runner stage copies `apps/landing/public`. |
| `test/pages.test.ts`, `test/hours.test.ts`, `test/workdays.test.ts` | new | Registry and copy guards, time maths, holiday tables. |
| `e2e/helpers.ts`, `e2e/layout.spec.ts` | changed | One page per kind added to `PAGES`. |
| `.github/scripts/image.sh` | changed | Passes `NEXT_PUBLIC_INDEXABLE` to the landing (default `false`) and `NEXT_PUBLIC_SITE_URL` to the web app. |
| `.github/scripts/index-check.sh` | new | `index-check.sh <base-url> <index\|noindex>`: fails unless `/` and `/en` carry the expected robots meta and header. |
| `.github/workflows/release.yml` | changed | `NEXT_PUBLIC_INDEXABLE: 'true'`; a step runs the built landing image and calls `index-check.sh ... index`. |
| `.github/workflows/ci.yml` | changed | After the staging deploy, `index-check.sh $STAGING_SITE_URL noindex`. |
| `apps/web/src/app/layout.tsx`, `apps/web/next.config.ts`, `apps/web/src/app/robots.ts`, `apps/web/Dockerfile`, `apps/web/src/app/favicon.ico`, `apps/web/src/app/apple-icon.png` | changed / new | Web app previews, noindex header, robots, favicon. |
| `docs/DECISIONS.md`, `docs/RELEASING.md`, `docs/OPERATIONS.md`, `apps/landing/AGENTS.md` | changed | New decision (page registry + indexable flag), release checklist steps, how to add a page. |

**Registry types** (`src/lib/pages/registry.ts`; `Locale` is re-declared there as `'sv' | 'en'` to stay import-free,
and `test/pages.test.ts` asserts it equals `locales` from `i18n/config.ts`):

- `type PageId = 'home' | 'app' | 'small-business' | 'open-source' | 'calculator' | 'template' | 'guide-timesheet'
  | 'guide-change' | 'hours' | 'hours-2026' | 'hours-2027' | 'hourly' | 'guide-best-free' | 'guide-personalliggare'
  | 'guide-working-hours-act' | 'trade-cafe' | 'trade-cleaning' | 'trade-salon' | 'trade-shop' | 'about' | 'privacy'
  | 'terms'`
- `type PageKind = 'home' | 'product' | 'tool' | 'guide' | 'industry' | 'table' | 'legal'`
- `type FooterGroup = 'product' | 'tools' | 'guides' | 'industries' | 'klokka'`
- `type CardBackground = 'phones' | 'grid' | 'clock' | 'cafe'`
- `interface PageEntry { id: PageId; kind: PageKind; path: { sv: string; en: string }; parent?: PageId;
  footer: FooterGroup | null; lastmod: string /* YYYY-MM-DD */; background: CardBackground }`
  - `path` values are site paths without the locale prefix: `sv: '/tidrapport-mall'`, `en: '/timesheet-template'`;
    the homepage is `'/'` for both.
- `export const pages: readonly PageEntry[]`

**Registry content** (sv path, en path, kind, parent, footer, background). Slugs and keywords come from
`page-briefs.md`; the English personalliggare slug is the corrected one from `gapfill.md`.

| id | sv | en | kind | parent | footer | bg |
|---|---|---|---|---|---|---|
| home | `/` | `/` | home | none | none | phones |
| app | `/tidrapportering-app` | `/employee-hours-app` | product | home | product | phones |
| small-business | `/tidrapportering-smaforetag` | `/small-business-time-tracking` | product | home | product | phones |
| hourly | `/timanstallda` | `/hourly-employees` | product | home | product | phones |
| open-source | `/oppen-kallkod` | `/open-source` | product | home | product | clock |
| calculator | `/rakna-arbetstimmar` | `/work-hours-calculator` | tool | home | tools | grid |
| template | `/tidrapport-mall` | `/timesheet-template` | tool | home | tools | grid |
| hours | `/arbetstid-per-manad` | `/working-hours-per-month-sweden` | table | home | tools | grid |
| hours-2026 | `/arbetstid-per-manad/2026` | `/working-hours-per-month-sweden/2026` | table | hours | none | grid |
| hours-2027 | `/arbetstid-per-manad/2027` | `/working-hours-per-month-sweden/2027` | table | hours | none | grid |
| guide-timesheet | `/guide/tidrapport` | `/guide/how-to-track-employee-hours` | guide | home | guides | clock |
| guide-change | `/guide/far-arbetsgivaren-andra-tidrapport` | `/guide/can-an-employer-change-hours` | guide | home | guides | clock |
| guide-best-free | `/guide/basta-gratis-tidrapportering` | `/guide/best-free-timesheet-apps` | guide | home | guides | clock |
| guide-personalliggare | `/guide/personalliggare-eller-tidrapport` | `/guide/personalliggare-sweden` | guide | home | guides | clock |
| guide-working-hours-act | `/guide/arbetstidslagen` | `/guide/swedish-working-hours-act` | guide | home | guides | clock |
| trade-cafe | `/tidrapportering-cafe-restaurang` | `/cafes-restaurants` | industry | home | industries | cafe |
| trade-cleaning | `/tidrapportering-stadfirma` | `/cleaning-companies` | industry | home | industries | cafe |
| trade-salon | `/tidrapportering-frisor-salong` | `/salons` | industry | home | industries | cafe |
| trade-shop | `/tidrapportering-butik` | `/shops` | industry | home | industries | cafe |
| about | `/om` | `/about` | legal | home | klokka | clock |
| privacy | `/integritet` | `/privacy` | legal | home | klokka | clock |
| terms | `/villkor` | `/terms` | legal | home | klokka | clock |

Entries are added in the phase that builds their page, so the footer, sitemap and `llms.txt` never list a page that
does not exist.

**Helpers** (`src/lib/pages/index.ts`, all pure):
- `pageById(id: PageId): PageEntry` (throws on unknown id)
- `pageForSlug(locale: Locale, slug: readonly string[]): PageEntry | undefined`
- `hrefFor(id: PageId, locale: Locale, hash?: string): string`, built on `localeHref` from `i18n/config.ts`
  (`hrefFor('template','sv')` is `/tidrapport-mall`, `hrefFor('template','en')` is `/en/timesheet-template`)
- `staticSlugParams(): { lang: Locale; slug: string[] }[]` (every non-home page, both locales; the sv side uses the
  sv slug, the en side the en slug)
- `swedishRewrites(): { source: string; destination: string }[]` (`/tidrapport-mall` to `/sv/tidrapport-mall`, one
  per non-home sv path; exported from `registry.ts` itself so next.config.ts stays import-light)
- `breadcrumbs(id: PageId, locale: Locale): { name: string; href: string }[]` (home, parent, page; names from copy)
- `footerColumns(locale: Locale): { group: FooterGroup; links: { id: PageId; href: string }[] }[]`

**Copy types** (`src/lib/i18n/pages/types.ts`). Every string may contain `[label](page:<id>)` links rendered by
`RichText`; a test resolves every `page:` target against the registry.
- `interface PageCopyBase { meta: { title: string; description: string; ogAlt: string }; card: { eyebrow: string;
  title: string }; breadcrumb: string; h1: string; lede: string[] /* first 2 sentences state the facts */;
  sections: { h2: string; body: string[]; list?: string[] }[]; faq: { q: string; a: string }[];
  cta: { title: string; body: string; button: string } }`
- `interface GuideCopy extends PageCopyBase { author: string; reviewed: string /* YYYY-MM-DD */;
  sources: { label: string; url: string }[] }`
- `interface ToolCopy extends PageCopyBase { tool: Record<string, string> /* calculator or template UI labels */ }`
- `interface TableCopy extends PageCopyBase { columns: Record<string, string>; monthNames: string[] }`
- `type PageCopyOf<T>`: the widened shape of a Swedish `as const` object (same technique `dictionaries.ts` uses for
  `Dictionary`), so `en` must match `sv` exactly.
- `pageCopy(id: PageId, locale: Locale): PageCopyBase` in `src/lib/i18n/pages/index.ts`, with typed overloads for
  guide, tool and table ids.

---
## Phase 1: Foundation (P0)

Delivers: staging never indexable and production provably indexable; the page system; new link cards, favicons and
manifest; privacy, terms and about pages; homepage copy retargeted; the web app's preview and noindex hygiene.

### Task 1: Indexable flag, robots, and the index checks in CI

**Files:** `src/lib/links.ts`, `src/lib/seo.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, `next.config.ts`,
`Dockerfile`, `.github/scripts/image.sh`, `.github/scripts/index-check.sh` (new), `.github/workflows/release.yml`,
`.github/workflows/ci.yml`, `package.json` script `docker:build`.

- [ ] `links.ts`: add `export const indexable: boolean` = `process.env.NEXT_PUBLIC_INDEXABLE === 'true'` (inlined at
  build). Anything else, including absent, is false: an unconfigured build is safe by default.
- [ ] `seo.ts`: robots metadata becomes `{ index: indexable, follow: indexable, googleBot: {...same, 'max-image-preview': 'large'} }`.
- [ ] `next.config.ts`: when `NEXT_PUBLIC_INDEXABLE !== 'true'`, `headers()` adds `X-Robots-Tag: noindex, nofollow`
  to `/:path*`, next to the existing security headers.
- [ ] `sitemap.ts`: returns `[]` when not indexable (a sitemap of noindex URLs sends mixed signals).
- [ ] `robots.ts`: keep `Allow: /` for everyone (Google must crawl to see noindex); drop the `host` field; add explicit
  allow rules for `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`; keep the sitemap
  line.
- [ ] `Dockerfile` builder stage: `ARG NEXT_PUBLIC_INDEXABLE=false` and export it in the same `ENV` block as the URLs.
- [ ] `image.sh` landing case: add `--build-arg "NEXT_PUBLIC_INDEXABLE=${NEXT_PUBLIC_INDEXABLE:-false}"`.
- [ ] `release.yml` top-level env: `NEXT_PUBLIC_INDEXABLE: 'true'`. After the landing image is built in the `app`
  matrix (landing leg only), a step runs the image on a free port with `--init`, waits for `/` (bounded: 30 tries,
  1 s apart, `curl -sf || continue`, fail after the cap), then runs `index-check.sh http://127.0.0.1:<port> index`
  and removes the container. A failed check fails the release.
- [ ] `index-check.sh <base-url> <index|noindex>`: `set -euo pipefail`; for `/` and `/en` fetch headers and body
  once each (`curl -sf --max-time 15`); for `noindex` require both `<meta name="robots" content="noindex` and an
  `X-Robots-Tag` header containing `noindex`; for `index` require `content="index, follow` and no `X-Robots-Tag`
  noindex. Prints one line per URL, exits 1 on the first mismatch. No loops beyond the two fixed URLs.
- [ ] `ci.yml`: after the step that deploys staging and waits for it, run `index-check.sh "$NEXT_PUBLIC_SITE_URL" noindex`.
- [ ] `package.json` `docker:build`: pass `--build-arg NEXT_PUBLIC_INDEXABLE=${NEXT_PUBLIC_INDEXABLE:-false}`.
- [ ] Verify locally: build twice (flag unset, then `NEXT_PUBLIC_INDEXABLE=true`), each time start the standalone
  server (`PORT=3001 node apps/landing/.next/standalone/apps/landing/server.js`) and run
  `bash .github/scripts/index-check.sh http://127.0.0.1:3001 noindex` / `... index`: each passes on its build and the
  opposite check fails. `npm test -w @klokka/landing` and `npm run typecheck -w @klokka/landing` pass.

### Task 2: Page registry, routing, metadata, JSON-LD, sitemap, llms.txt, nav and footer

**Files:** `src/lib/pages/registry.ts`, `src/lib/pages/index.ts`, `src/lib/i18n/pages/types.ts`,
`src/lib/i18n/pages/index.ts`, `src/components/RichText.tsx`, `src/components/pages/PageShell.tsx`,
`Breadcrumbs.tsx`, `FaqList.tsx`, `CtaBand.tsx`, `LegalPage.tsx`, `src/app/[lang]/[...slug]/page.tsx`,
`src/app/[lang]/page.tsx`, `src/app/[lang]/layout.tsx`, `src/lib/seo.ts`, `src/app/sitemap.ts`,
`src/app/llms.txt/route.ts`, `next.config.ts`, `src/components/layout/SiteNav.tsx`, `MobileMenu.tsx`,
`SiteFooter.tsx`, `src/lib/i18n/dictionaries.ts` (footer group titles), `test/pages.test.ts`.

Call flow: request `/tidrapport-mall` → next.config `beforeFiles` rewrite from `swedishRewrites()` →
`/sv/tidrapport-mall` → `[lang]/[...slug]/page.tsx` → `pageForSlug('sv', ['tidrapport-mall'])` → `PageShell` with the
kind's layout, `generateMetadata` → `metadataForPage(id, locale)`, JSON-LD script from `jsonLdForPage(id, locale)`.

- [ ] Registry with the types and helpers from section 1. Phase 1 registers `home`, `about`, `privacy`, `terms`.
- [ ] `[lang]/[...slug]/page.tsx`: `dynamicParams = false`, `generateStaticParams` from `staticSlugParams()` filtered
  to the current `lang` param, `generateMetadata`, and a switch on `kind` to the layout component. Unknown slug:
  `notFound()`.
- [ ] `next.config.ts`: `rewrites().beforeFiles` = the existing `/` rule plus `swedishRewrites()`. Keep the `/sv`
  redirects.
- [ ] `seo.ts`: `metadataForPage(id: PageId, locale: Locale): Metadata`, using the page copy's `meta`, canonical and
  hreflang from `hrefFor` for both locales plus `x-default` = sv; Open Graph with exactly one image
  `absolute('/og/<id>-<locale>.jpg')`, `width 1200`, `height 630`, `type 'image/jpeg'`, `alt` = `meta.ogAlt`;
  `twitter.card = 'summary_large_image'`; `openGraph.type` = `'article'` for guides with `publishedTime` /
  `modifiedTime` from `lastmod`, else `'website'`. Old `metadataFor` is removed; the homepage calls
  `metadataForPage('home', locale)`.
- [ ] `seo.ts`: `jsonLdForPage(id: PageId, locale: Locale): object` returns one `@graph` with: `Organization`
  (`@id` `#organization`, logo, `sameAs` [GitHub repo], `email` = `contactEmail`), `WebSite` (`@id` `#website`,
  `inLanguage` sv-SE and en), `WebPage` for this URL (`isPartOf` website, `inLanguage`, `dateModified` = lastmod),
  `BreadcrumbList` from `breadcrumbs()` (not on home), `FAQPage` when the copy has FAQ items (for Bing and AI
  answers; Google shows no FAQ results), `SoftwareApplication` on `home` and `app` only (stable `@id` `#app`,
  `url` the sv homepage in both locales, `downloadUrl` = the klokka.se APK path, `offers` price 0), `Article` on
  guides (`author` Organization, `dateModified`). No ratings.
- [ ] `[lang]/layout.tsx`: stops rendering JSON-LD; each page renders its own `<script type="application/ld+json">`
  with the same `<` escaping as today.
- [ ] `sitemap.ts`: every registry entry, both locales, `alternates.languages` with sv-SE, en and x-default,
  `lastModified` from the entry; empty when not indexable.
- [ ] `llms.txt/route.ts`, force-static, `text/plain`: a heading, the 2-sentence fact line from the homepage lede in
  English, then per footer group a list of `- [title](absolute url): description` for both languages (sv first).
- [ ] Nav and mobile menu: section anchors become `hrefFor('home', locale, '#how')` style so they work from subpages;
  the wordmark links to `hrefFor('home', locale)`.
- [ ] Footer: columns from `footerColumns(locale)`, labels from each page's `breadcrumb` copy, group titles from the
  homepage dictionary, plus the existing external links (GitHub, licence, issues, log in, create business, Android
  download). The locale switch links to the same page in the other language (`hrefFor(currentId, other)`), not to
  the other homepage.
- [ ] `RichText`: renders a string, turning `[label](page:<id>)` into an internal link via `hrefFor` and
  `[label](https://...)` into an external link (`rel="noopener"`); anything else is plain text. No HTML injection.
- [ ] `test/pages.test.ts` (vitest): paths unique per locale; every non-home path starts with `/` and has no trailing
  slash; sv slugs ASCII only; every `parent` exists; `swedishRewrites()` covers every non-home sv path; for every
  registered page and locale: title <= 60 chars, description <= 155, card eyebrow <= 20, card title <= 45, no em dash
  in any string, every `page:` link resolves, sv and en copy have the same shape, the word "personalliggare" is absent
  from `h1` and `meta.title` of every non-guide page, and `trade-cafe` and `trade-salon` contain "ersätter inte en
  personalliggare" (sv) / "does not replace a personalliggare" (en) once they exist.
- [ ] Verify: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` in `apps/landing`; the build output
  lists the static pages.

### Task 3: Link cards, favicons, manifest, APK path

**Files:** `src/lib/brand-image.tsx`, `src/assets/og/{phones-sv,phones-en,grid,clock,cafe}.jpg`,
`src/app/og/[file]/route.tsx`, delete `src/app/og.png/` and `src/app/og-en.png/`, `src/app/favicon.ico`,
`src/app/icon1.png`, `src/app/icon-192.png/route.tsx`, `icon-512.png/route.tsx`, `icon-maskable.png/route.tsx`,
`src/app/manifest.ts`, `src/lib/links.ts`, `next.config.ts`, `package.json` (dependency `sharp`).

- [ ] Backgrounds: resize `docs/brand/social/backgrounds/{phones-right-sv,phones-right-en,week-grid,clock,cafe}.jpg`
  to 1200 px wide, JPEG q82, into `src/assets/og/` (`phones-sv.jpg`, `phones-en.jpg`, `grid.jpg`, `clock.jpg`,
  `cafe.jpg`); each about 150 KB.
- [ ] `brand-image.tsx`: `pageCard(id: PageId, locale: Locale): Promise<Response>`.
  - `home` uses the chosen "phones-right" layout from `docs/brand/social/compose.mjs` (`landscape()` with
    `size: 'auto 100%'`): logo top left, two-line headline (`hero.line1` / `hero.line2`, 74 px), subline 25 px, pill
    "free and open source · klokka.se".
  - Every other page uses the per-page layout (`pageCard()` in compose.mjs): logo, eyebrow = `card.eyebrow`,
    title = `card.title`, path line = the page's klokka.se URL without scheme, on the entry's `background`
    (`phones` resolves to `phones-sv`/`phones-en` by locale).
  - Render with `ImageResponse` (fonts as today), then `sharp(buffer).jpeg({ quality: 82, mozjpeg: true })`; response
    `Content-Type: image/jpeg`, `Cache-Control: public, max-age=86400`. Target under 200 KB; assert in a test.
- [ ] `og/[file]/route.tsx`: `dynamic = 'force-static'`, `dynamicParams = false`, `generateStaticParams` yields
  `{ file: '<id>-<locale>.jpg' }` for every registry entry and locale; `GET` parses the file name and calls
  `pageCard`. Unknown name: 404.
- [ ] `logoImage(size: number, opts?: { maskable?: boolean })`: maskable draws the mark at 56% on a full-bleed
  background (inside the 80% safe circle); the default stays 72%.
- [ ] Icon routes for 192, 512 and maskable 512; `manifest.ts` lists 192 and 512 (`purpose 'any'`) and the maskable
  one (`purpose 'maskable'`).
- [ ] `favicon.ico` (16, 32, 48) and `icon1.png` (96) generated once with Pillow from
  `docs/brand/final/klokka-mark.png` on the dark background colour; the one-line command goes in
  `apps/landing/AGENTS.md`. Keep `icon.tsx` (SVG) and `apple-icon.tsx`.
- [ ] APK: `links.ts` keeps the raw Nexus URL as `apkSourceUrl` and sets `apkUrl = absolute('/download/android')`;
  `next.config.ts` redirects `/download/android` to `NEXT_PUBLIC_APK_URL` (temporary 307, since "latest" changes).
- [ ] Verify: build; open `/og/home-sv.jpg`, `/og/about-en.jpg` and compare against `docs/brand/social/cards/og-phones-sv.jpg`
  by eye; `curl -sI` shows `image/jpeg` and size under 200 KB; `/favicon.ico` is 200; `/download/android` is 307 to
  the APK.

### Task 4: Web app previews, noindex header, robots, favicon; Logto links on staging

**Files:** `apps/web/src/app/layout.tsx`, `apps/web/next.config.ts`, `apps/web/src/app/robots.ts` (new),
`apps/web/Dockerfile`, `.github/scripts/image.sh` (web case), `apps/web/src/app/favicon.ico` and `apple-icon.png`
(copies of the landing's static files).

- [ ] `image.sh` web case and `apps/web/Dockerfile`: add build arg `NEXT_PUBLIC_SITE_URL` (default the staging site).
- [ ] `layout.tsx` metadata: keep `robots: { index: false, follow: false }`; add a description (sv and en from the
  core catalogue if a key fits, else a new `meta.description` key in `packages/core/i18n/{sv,en}.json`, chosen by the
  request locale) and `openGraph` + `twitter` with the landing's `/og/home-<locale>.jpg` absolute URL, 1200x630.
- [ ] `next.config.ts` headers: `X-Robots-Tag: noindex, nofollow` on every path.
- [ ] `robots.ts`: allow all, disallow `/api/` (never disallow everything: preview bots must read the tags).
- [ ] Logto staging: set `termsOfUseUrl` and `privacyPolicyUrl` to the staging landing's `/villkor` and `/integritet`
  via the Management API (credentials in `.agents/local-credentials/logto.json`, docs/OPERATIONS.md section 3).
  Production waits for gate 2.
- [ ] Verify: `npm run build -w @klokka/web`; `curl -sI` on the local web app shows the header; the page head carries
  the OG tags; the sign-in page on staging Logto shows both links after Phase 1 is on staging.

### Task 5: Legal pages, about page, homepage copy, hero LCP

**Files:** `src/lib/i18n/pages/{about,privacy,terms}.ts` (rendered by Task 2's `LegalPage`),
`src/lib/i18n/dictionaries.ts`, the hero components under `src/components/hero/`, `src/lib/links.ts`
(`contactEmail = 'hej@klokka.se'`, `legalEntity`).

- [ ] Copy from `page-briefs.md` sections for `/om`, `/integritet` and the terms page, with the owner decisions:
  - Privacy: Klokka is processor for the hours an employer logs about employees and controller for account data;
    what is stored (account: name, email via Logto; hours, notes, flags, history; push tokens; email for invitations
    and opt-in digests), where it is hosted (NetCup, Germany, EU), sub-processors (NetCup, Migadu, Expo and Google
    Firebase for push), retention, the employee's route (ask the employer; employer asks us), deletion by email request
    to `contactEmail` (there is no in-app deletion yet), no analytics or tracking cookies today. Contact = role address,
    no personal name; controller identity = `legalEntity` (gate 3).
  - Terms: free to use, no guarantee, acceptable use, the data processing clause (Art. 28 essentials: instructions,
    confidentiality, security, sub-processors listed on the privacy page, assistance, deletion at the end), MIT for the
    code, Swedish law.
  - About: what Klokka is, who builds it (no personal name), open source, contact, links to GitHub and the privacy page.
- [ ] Homepage (`dictionaries.ts`), from the homepage brief: meta title and description target "gratis
  tidrapportering"; the word "tidrapportering" in the hero subline, one section heading and one FAQ answer; English
  says "timesheet" and "time tracking"; FAQ gains "Är Klokka en personalliggare?" (short: no, with a link to the guide
  once it exists, plain text until then) and "Vilken gratis app för tidrapportering passar ett litet företag?";
  "no limit on the number of employees" stated in the facts line. Swedish description at most 150 chars.
- [ ] Hero LCP: the hero headline and lede animate transform only, never from opacity 0 (Lighthouse showed 1.7 s of
  render delay).
- [ ] Verify: `npm test` (dictionary shape and em dash tests), Playwright `layout` project for `/`, `/en`, `/om`,
  `/en/privacy` at 360x640, 390x844, 412x915 and 430x932 against the LAN dev server.

### Task 6: Phase 1 checks, commit, staging

- [ ] Extend `e2e/helpers.ts` `PAGES` with `/om` and `/en/privacy` (and later one page per kind); the layout spec's
  head test also asserts one `og:image` ending in `.jpg`, `og:image:type` `image/jpeg`, hreflang pairs and x-default.
- [ ] Run in `apps/landing`: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:layout`.
  Run `npm run build -w @klokka/web` and the web lint.
- [ ] Commit: `CHQ-149: SEO foundation: staging noindex flag and index checks, page registry, per-page link cards,
  favicons, privacy/terms/about, web app previews` (includes `docs/brand/social/`, `docs/research/seo/`, this plan).
- [ ] Fast-forward `main`, push; watch CI (landing job, staging deploy, `index-check.sh ... noindex` step green).
- [ ] On staging: `curl -sI https://klokka.coolify.ooguy.com/` shows `X-Robots-Tag: noindex`; `/sitemap.xml` is
  empty; `/og/home-sv.jpg` renders; `/integritet` and `/en/privacy` render; the Facebook Sharing Debugger and
  LinkedIn Post Inspector read the staging card (they ignore noindex).

---
## Phase 2: P1 pages

Delivers: the three product pages, the work-hours calculator, the timesheet template with downloads, and the two P1
guides, each in sv and en, registered, carded, in the sitemap, footer and `llms.txt`.

**Content rule for every page task (Phases 2 and 3):** copy comes from the page's brief in `page-briefs.md` (H1,
fact-first lede, sections, FAQ, internal links as `[label](page:<id>)`, CTA, card text). Links go inside the body
text, not only in the footer (playbook G4). No claims the product cannot back: no clock-in, GPS, scheduling, payroll
export, iOS store app; Dockerfiles, not pullable images; self-hosting only as "the code and Dockerfiles are on
GitHub" until install docs exist. Every guide carries `author` ("Klokka"), `reviewed` date and `sources` (official
URLs from `gapfill.md`), and every `[verify]` item in its brief is settled against those sources or cut.

### Task 7: Product pages (app, small-business, open-source)

**Files:** `src/components/pages/ProductPage.tsx`, `src/lib/i18n/pages/{app,small-business,open-source}.ts`,
registry entries, `src/lib/i18n/pages/index.ts`.

- [ ] `ProductPage` layout: breadcrumbs, H1 + lede, sections (each may reuse an existing homepage visual:
  `WeekGrid` for the app and small-business pages, the repo card from `OpenSource` for open source), FAQ, CTA band to
  "create your business" (`appUrl`) and the Android download.
- [ ] Keyword ownership (playbook G3): "tidrapportering småföretag" belongs to `small-business` only; the homepage
  aims at "gratis tidrapportering"; `app` at "tidrapportering app".
- [ ] Verify: page tests pass; `/tidrapportering-app`, `/en/employee-hours-app` render at the four phone sizes.

### Task 8: Work-hours calculator

**Files:** `src/lib/hours.ts`, `test/hours.test.ts`, `src/components/tools/HoursCalculator.tsx`,
`src/components/pages/ToolPage.tsx`, `src/lib/i18n/pages/calculator.ts`.

- [ ] `hours.ts` (pure, minutes as integers):
  - `parseClock(input: string): number | null` accepts `8`, `8:30`, `08.30`, `0830`, `17`; returns minutes since
    midnight or null for anything else (never guesses).
  - `shiftMinutes(start: number, end: number, breakMinutes: number): number | null` (end before start means past
    midnight; null when the break is longer than the shift).
  - `sumMinutes(values: readonly (number | null)[]): number`
  - `formatHours(minutes: number, locale: Locale): { decimal: string; clock: string }` (`7,5 h` / `7:30` in sv,
    `7.5 h` / `7:30` in en).
  - `pay(minutes: number, hourlyRate: number): number` rounded to 2 decimals.
- [ ] `test/hours.test.ts`: every accepted and rejected input form; overnight shift 22:00 to 06:00 with 30 min
  break = 450; break longer than shift = null; formatting in both locales; pay with 0 and fractional rates.
- [ ] `HoursCalculator` ('use client'): seven day rows (start, end, break in minutes) plus a single "time between
  two times" mode for the generic "räkna timmar" intent; live totals per day, week total, optional hourly wage;
  labels from `ToolCopy.tool`; native inputs (`inputmode="numeric"`), 44 px targets, labelled; state only in the
  component. Below it a CTA "Spara det i Klokka i stället" to `appUrl`.
- [ ] Verify: `npm test`; the layout project at the four phone sizes with the soft keyboard opened and closed on one
  input (focus, then blur) and no horizontal scroll.

### Task 9: Timesheet template and downloads

**Files:** `scripts/templates.ts`, `public/downloads/*`, `package.json` (devDependencies `exceljs`, `pdf-lib`; script
`templates`), `Dockerfile` (runner copies `apps/landing/public` to `./apps/landing/public`),
`src/lib/i18n/pages/template.ts`, `ToolPage` download block.

- [ ] `scripts/templates.ts` (run as `node scripts/templates.ts`; Node 24 strips types natively): writes a
  monthly sheet per language: header (business, employee, month), 31 rows (date, weekday, start, end, break, hours
  with a formula, note), a total with `SUM`, signature lines; xlsx with formulas and a print area; PDF A4 portrait
  with the same grid for printing. Deterministic output (fixed metadata dates) so re-running gives the same bytes.
- [ ] Commit the four files; `test/pages.test.ts` asserts they exist and each is under 200 KB.
- [ ] Template page: preview image of the sheet (a PNG rendered from the PDF's first page with
  `pdftoppm -png -r 80 -singlefile`, committed under `public/downloads/`, alt text in the
  page's language, file name `tidrapport-mall-excel-pdf.png` / `timesheet-template-excel-pdf.png`), download buttons
  (`download` attribute), how-to-fill steps, "or let both sides see it live in Klokka".
- [ ] Verify: open both xlsx files in LibreOffice headless (`soffice --headless --convert-to csv`) and check the total
  formula; the PDF opens; the Docker image serves `/downloads/tidrapport-mall.xlsx` (`npm run docker:build` then
  `docker:run`, curl 200).

### Task 10: P1 guides (tidrapport, får arbetsgivaren ändra)

**Files:** `src/components/pages/GuidePage.tsx`, `src/lib/i18n/pages/{guide-timesheet,guide-change}.ts`.

- [ ] `GuidePage`: breadcrumbs, H1, "reviewed <date>, sources below" line, lede, table of contents from the H2s,
  sections, FAQ, sources list, CTA. Article JSON-LD comes from `jsonLdForPage`.
- [ ] Facts from `gapfill.md` section on the Working Hours Act §11, AFS 2023:2 chapter 9, Bokföringslagen, and the
  forgery line; plain, neutral, no legal-advice tone.
- [ ] Verify: page tests; one guide at the four phone sizes.

### Task 11: Phase 2 checks, commit, staging

- [ ] `PAGES` gains one product page, the calculator and one guide.
- [ ] Same command set as Task 6; commit `CHQ-149: SEO P1 pages: app, small business, open source, work-hours
  calculator, timesheet template, two guides`; fast-forward `main`, push, CI green including the noindex check.
- [ ] On staging: every new URL answers 200 in both languages; hreflang pairs point at each other; the footer lists
  them; `/llms.txt` lists them.

---

## Phase 3: P2 pages, docs, final review

### Task 12: Working hours per month (hub, 2026, 2027)

**Files:** `src/lib/workdays.ts`, `test/workdays.test.ts`, `src/components/pages/TablePage.tsx`,
`src/lib/i18n/pages/{hours,hours-2026,hours-2027}.ts`.

- [ ] `workdays.ts` (pure, dates as `YYYY-MM-DD` strings, UTC):
  - `easterSunday(year: number): string` (Anonymous Gregorian algorithm)
  - `swedishHolidays(year: number): { date: string; key: HolidayKey; kind: 'public' | 'eve' }[]` with `HolidayKey`
    covering nyårsdagen, trettondedag jul, långfredagen, påskdagen, annandag påsk, första maj, Kristi
    himmelsfärdsdag, pingstdagen, nationaldagen, midsommarafton (eve), midsommardagen, alla helgons dag, julafton
    (eve), juldagen, annandag jul, nyårsafton (eve); names come from the page copy, not the library.
  - `monthTable(year: number): { month: number; legalDays: number; practiceDays: number }[]` (Mon to Fri minus
    public holidays on weekdays; practice also minus eves on weekdays). Hours = days x 8, computed in the view.
- [ ] `test/workdays.test.ts`: Easter dates for 2024 to 2030 against known values; `monthTable(2026)` and
  `monthTable(2027)` equal the tables in `gapfill.md` (2026: 254 legal / 251 practice days; 2027: 256 / 253).
- [ ] Hub page explains the rule and links both years; year pages render the table (semantic `<table>` with
  caption), full-time and 75% / 50% part-time columns, and the holiday list with dates. Registry `lastmod` for the
  2027 page is set so it ships before 1 December 2026 (playbook G13).
- [ ] Verify: `npm test`; the 2026 page at 360x640 scrolls the table inside its own container, never the page.

### Task 13: Hourly-staff page and the four trade pages

**Files:** `src/components/pages/IndustryPage.tsx`, `src/lib/i18n/pages/{hourly,trade-cafe,trade-cleaning,trade-salon,trade-shop}.ts`.

- [ ] `hourly` uses `ProductPage`; the trade pages use `IndustryPage` (same shell, a trade-specific example week
  in `WeekGrid` with trade-typical names and hours).
- [ ] Each trade page is at least a third unique text (playbook G12): its own example week, trade-specific FAQ, and
  the right personalliggare line: café/restaurant and salon pages say plainly that Klokka does not replace a
  personalliggare and link the guide; cleaning and shop pages say those trades are not covered by the requirement
  (Skatteverket 2026, per `gapfill.md`).
- [ ] Verify: page tests (including the personalliggare guards); one trade page at the four phone sizes.

### Task 14: P2 guides (best free apps, personalliggare, Working Hours Act)

**Files:** `src/lib/i18n/pages/{guide-best-free,guide-personalliggare,guide-working-hours-act}.ts`.

- [ ] Best free apps: honest comparison including Klokka; each competitor's free-plan limits re-checked on their own
  site at writing time, with the date in the table caption and the source URL in `sources`; no prices.
- [ ] Personalliggare: the 2026 industry list, exemptions, what a ledger records, the fine, the dropped 2026 proposal
  and the changes proposed from 2027-01-01; `reviewed` set so the owner revisits it in December 2026.
- [ ] Working Hours Act: §11 records, limits (40 h, overtime 50 h/month and 200 h/year, 48 h average, 11 h and 36 h
  rest), AFS 2023:2, link to the law text on riksdagen.se.
- [ ] Update the homepage FAQ's personalliggare answer to link the guide.
- [ ] Verify: page tests; one guide at the four phone sizes.

### Task 15: IndexNow key, docs

**Files:** `public/<key>.txt`, `docs/RELEASING.md`, `docs/OPERATIONS.md`, `docs/DECISIONS.md`, `apps/landing/AGENTS.md`.

- [ ] IndexNow: generate a 32-hex key, commit `public/<key>.txt` containing it; `docs/RELEASING.md` gets a
  post-release step that submits the sitemap URLs to `https://api.indexnow.org/indexnow` (one bounded request).
- [ ] `RELEASING.md` production checklist additions: run `index-check.sh https://klokka.se index` after pinning the
  tag; re-scrape `/` and `/en` in the Facebook Sharing Debugger and LinkedIn Post Inspector; the gates in section 0.
- [ ] `OPERATIONS.md`: DNS is at Dynu (for the Search Console TXT record); the new mailbox once gate 1 is done.
- [ ] `DECISIONS.md`: new entry for the page registry, the per-page card route and the `NEXT_PUBLIC_INDEXABLE` flag.
- [ ] `apps/landing/AGENTS.md`: how to add a page (registry entry, copy file, the tests that guard it), the favicon
  regeneration command, the templates script.

### Task 16: Final review, commit, staging, production hand-off

- [ ] `PAGES` gains the hours page and one trade page. Full landing set: `npm test`, `typecheck`, `lint`, `build`,
  `test:layout`, `test:lan` (LAN URL `http://192.168.0.16:3001`, interactivity check on the calculator); web build and
  lint.
- [ ] Lighthouse (local, mobile) on `/`, one guide, the calculator: SEO 100, accessibility 100, performance 90 or
  better, LCP under 2.5 s.
- [ ] Rich Results Test (manual, on the staging URLs) for one page of each kind: no errors (playbook G10).
- [ ] One whole-branch review (superpowers:requesting-code-review) against this plan and the owner decisions; fix
  what it finds.
- [ ] Commit `CHQ-149: SEO P2 pages: hours per month, hourly staff, four trades, three guides; IndexNow; docs`;
  fast-forward `main`, push, CI green.
- [ ] Staging smoke: every registry URL in both languages 200, footer and sitemap consistent, noindex present,
  cards render, downloads work.
- [ ] Hand-off to the owner, with the gates in section 0: the mailbox, the Logto production URLs, the legal entity
  line, the Swedish read of the four labour-law guides, then `./release.sh minor` and pinning. After release: run
  `index-check.sh https://klokka.se index`, and set up Search Console (Domain property via Dynu TXT, service account
  with Full permission, submit sitemap) and Bing (import), per the plan's "Connect Google" section.

---

## Out of scope (P3 or separate tickets)

GA4 with consent; "alternative to X" pages; Google Play listing (needs a Play Console account); GitHub topics,
homepage field and Releases; Show HN, Product Hunt, directories; a Swedish YouTube video; self-hosting docs; a
changelog page; LinkedIn page; Capterra reviews; monthly AI-answer checks.

