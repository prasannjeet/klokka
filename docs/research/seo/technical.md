# Klokka technical SEO audit (klokka.se, production, 2026-09-29)

Scope: live `https://klokka.se` (sv at `/`, en at `/en`), code in `apps/landing` and `apps/web`, and indexability of
`app.`, `auth.`, `auth-admin.`, `api.klokka.se`. Read-only: nothing changed, deployed or committed.
Evidence is curl output taken 2026-09-29 ~22:20 UTC and file:line in the repo.

Lighthouse: DataForSEO `on_page_lighthouse` returned **HTTP 402** (account out of credit), so Lighthouse 12.8.2 was run
locally (scratchpad install, Playwright Chromium 1243, headless), once mobile and once desktop.

## Verdict in one paragraph

The site itself is in good technical shape: server-rendered HTML (about 1,650 words per locale in the raw HTML),
one h1 per page, correct `lang`, self-canonicals, reciprocal hreflang, complete OG/Twitter tags with real 1200x630
PNGs, a valid JSON-LD graph, no crawler blocked by UA or header, Lighthouse mobile 96 / a11y 100 / BP 100 / SEO 100.
The real problems are around it: **the staging copy of the landing page is fully indexable with its own canonical**,
**www.klokka.se serves a 200 duplicate**, **http to https is a 302**, the Android download (and JSON-LD
`downloadUrl`) points at a free-DNS homelab host, and the target keyword "tidrapportering" appears only in `<title>`,
never in the page body.

---

## P0 (fix before submitting to Search Console)

### P0-1. Staging landing is indexable and self-canonical: a full duplicate of klokka.se on another domain
Evidence:
```
$ curl -s https://klokka.coolify.ooguy.com/robots.txt
User-Agent: *
Allow: /
Host: https://klokka.coolify.ooguy.com
Sitemap: https://klokka.coolify.ooguy.com/sitemap.xml

$ curl -s https://klokka.coolify.ooguy.com/ | grep -o '<meta name="robots"[^>]*>\|<link rel="canonical"[^>]*>'
<meta name="robots" content="index, follow"/>
<link rel="canonical" href="https://klokka.coolify.ooguy.com"/>
```
Same content, same language, a sitemap inviting crawl, and a canonical that claims itself. Staging has been up longer
than production, so it may already be the indexed copy. Google may pick either as the canonical of the cluster.

Cause: `apps/landing/src/lib/seo.ts:55-59` hardcodes `robots: { index: true, follow: true }` and
`apps/landing/src/app/robots.ts:6` hardcodes `allow: '/'` regardless of environment; `siteUrl` comes from
`NEXT_PUBLIC_SITE_URL` (`apps/landing/src/lib/links.ts:9`), which CI sets to `STAGING_SITE_URL`
(`.github/workflows/ci.yml:36`) and release sets to `PROD_SITE_URL` (`.github/workflows/release.yml:27`).

Fix (recommended): add a build-time flag, e.g. `NEXT_PUBLIC_INDEXABLE`, set to `true` only in
`.github/workflows/release.yml` (and as a Dockerfile ARG defaulting to empty in `apps/landing/Dockerfile`).
- `apps/landing/src/lib/seo.ts` `metadataFor`: `robots: indexable ? {...current} : { index: false, follow: false }`.
- `apps/landing/src/app/robots.ts`: when not indexable, still `Allow: /` (Google must be able to crawl to see the
  noindex) and omit the `Sitemap:` line. Do NOT `Disallow: /` on staging until it has dropped out of the index,
  otherwise the noindex is never seen and URL-only results can linger.
- Belt and braces: `X-Robots-Tag: noindex` header in `apps/landing/next.config.ts` `headers()` when not indexable.
Alternative (weaker): point staging's canonical at `https://klokka.se`. Canonical is a hint, noindex is a directive,
so noindex is the right call for a staging host.

Day one after deploy: `site:klokka.coolify.ooguy.com` in Google; if present, leave the noindex in place and let it
drop (GSC removal requires verifying ooguy.com, which is a shared free-DNS parent, so rely on noindex).

---

## P1 (this week)

### P1-1. www.klokka.se returns 200 with the same page instead of a 301 to klokka.se
```
https://www.klokka.se/   -> 200 (149431 B, same etag "eie7z277wo36h1" as https://klokka.se/)
http://www.klokka.se/    -> 302 -> https://www.klokka.se/
```
Canonical tags already point at `https://klokka.se`, so this is consolidated by hint, but it splits link signals and
lets `www` URLs show up in reports. Already listed in `docs/OPERATIONS.md:209`.
Fix: in production Coolify app `klokka-landing` (`f7t6h4recxky32cx06iknx2x`, `docs/RELEASING.md:32`) set the
domain **Direction** to "Redirect to non-www" (Coolify generates a Traefik redirect middleware), or keep only
`https://klokka.se` as the app domain and add a Traefik `redirectregex` (permanent) for `www`. Not an app change.

### P1-2. http to https is a 302 (temporary), not 301/308
```
http://klokka.se/    -> 302 -> https://klokka.se/
http://klokka.se/en  -> 302 -> https://klokka.se/en
```
Google treats long-lived 302s as permanent eventually, but a permanent redirect is the correct signal and is cached
by browsers. This is Coolify/Traefik's HTTP-to-HTTPS entrypoint redirect, not the app.
Fix: production Traefik entrypoint redirect with `permanent: true` (Coolify proxy config on NetCup), or per-app
`redirectscheme` middleware with `permanent=true`. Also add HSTS (see P2-9) so browsers stop hitting http at all.

### P1-3. Android download and JSON-LD `installUrl`/`downloadUrl` point at a free-DNS homelab host
Live values on the production site (3 links per page + JSON-LD):
`https://nexus.coolify.ooguy.com/repository/klokka-downloads/prod/klokka-latest.apk`
(HEAD: 200, `application/vnd.android.package-archive`, 65.9 MB).
`ooguy.com` is a shared dynamic-DNS parent domain. A direct APK download from such a host is the pattern Google
Safe Browsing and Chrome's download protection flag most readily ("uncommon/dangerous download"), and a Safe Browsing
flag on a domain the site links to prominently hurts trust and can hurt the site. It also sends link equity and the
structured-data download signal off-brand.
Fix: serve the APK from a klokka.se URL, e.g. `https://klokka.se/download/android` as a 302 in
`apps/landing/next.config.ts` `redirects()` to the Nexus file (quick), or better a `dl.klokka.se` host (CNAME at Dynu
to a proxy of the Nexus raw repo). Then set `PROD_APK_URL` (GitHub variable used by `release.yml:28`) to that URL.
Longer term: Play Store listing, which also unlocks a real `SoftwareApplication` presence.

### P1-4. Primary keyword is only in `<title>`; the h1 and body never say it
Body text counts from the server HTML:
- sv: "tidrapportering" 0, "tidrapport" 0, "arbetstid" 0 (vs "timmar" 23)
- en: "time tracking" 0, "timesheet" 0 (vs "hours" 20)
h1 is the slogan only: "En klocka. För båda." / "One clock. Both sides." (`dictionaries.ts:49-50`).
Technical SEO cannot compensate for the page not containing the query people type. Fix (copy, in
`apps/landing/src/lib/i18n/dictionaries.ts`): put the category term into the hero eyebrow/badge or lead
(`hero.badge`, `hero.lead`), one section heading (e.g. `how.title` or `employers.title`), and one FAQ question
("Är Klokka ett tidrapporteringssystem?"). Keep the slogan as the visual h1 but consider making the h1 contain
both, e.g. a visually smaller first line "Tidrapportering för småföretag" in the same `<h1>`. The content/keyword
research track should pick the exact terms (tidrapportering, tidrapport app, arbetstid app, stämpelklocka).

### P1-5. No `/favicon.ico`; icon set is SVG + 180 apple-touch only
```
/favicon.ico  -> 404 text/html 23453 B (the full 404 page, no-store)
/icon         -> 200 image/svg+xml 3802 B   (<link rel="icon" href="/icon?4a88..." type="image/svg+xml">)
/apple-icon   -> 200 image/png 180x180
/manifest.webmanifest -> icons: only /logo.png 512x512 (no 192, no maskable)
```
Google Search accepts SVG favicons, but Bing, some browsers, feed readers and chat unfurlers request `/favicon.ico`
directly and get a 23 KB HTML 404 each time.
Fix:
- Add `apps/landing/src/app/favicon.ico` (multi-size 16/32/48; Next serves it and adds the link tag).
- Add a PNG fallback `apps/landing/src/app/icon1.png` (or a second generated `icon` export, 32x32 or 48x48) so there
  is a raster `<link rel="icon" sizes="32x32">` next to the SVG.
- `apps/landing/src/app/manifest.ts:15`: add 192x192 and 512x512 `purpose: 'any'` plus a 512x512
  `purpose: 'maskable'` (mark inside the 80% safe zone). Route handlers for 192 and maskable can reuse
  `logoImage()` in `src/lib/brand-image.tsx:165`.
- Same for `apps/web` (only `src/app/icon.tsx` exists).

---

## P2 (polish, next iteration)

### P2-1. JSON-LD: valid, but not eligible for the SoftwareApplication rich result, and the graph is thin
Current graph (`apps/landing/src/lib/seo.ts:64-100`, rendered at the end of `<body>` by `app/[lang]/layout.tsx:54-57`):
`Organization` (`#organization`, name, url, logo 512 PNG, sameAs GitHub) + `SoftwareApplication` (`#app`, name, url,
description, applicationCategory BusinessApplication, operatingSystem "Android, Web", inLanguage, isAccessibleForFree,
license, installUrl, downloadUrl, sameAs [app, GitHub], offers {price "0", priceCurrency SEK}, publisher).
Parses cleanly; `<` escaped; one block per page.
- **Rich result eligibility**: Google's software-app rich result requires `name`, `offers.price` (present) **and**
  `aggregateRating` or `review`. Neither exists, so no rich result. Do not invent ratings (structured-data spam
  policy); add `aggregateRating` only once there are real, on-page, first-party reviews (or a Play Store listing).
- **`priceCurrency: SEK` on /en**: fine. The price is 0, the service is Swedish, and currency must be ISO 4217; SEK is
  as correct as EUR/USD. Keep it identical on both locales.
- **Same `@id` with different properties per locale**: `#app` has `url` `https://klokka.se` on sv and
  `https://klokka.se/en` on en, and a different-language description. Keep the entity stable: `url: siteUrl` on both,
  and let the per-locale `WebPage` carry the language.
- **Add** (all in `jsonLd()` in `seo.ts`, fed from the existing dictionary):
  - `WebSite` `{ '@id': siteUrl + '/#website', url: siteUrl, name: 'Klokka', inLanguage: ['sv-SE','en'], publisher: {'@id': org} }`
    (no `SearchAction`: there is no site search).
  - `WebPage` per locale `{ '@id': canonical + '#webpage', url: canonical, name: t.meta.title, description: t.meta.description,
    inLanguage: htmlLang[locale], isPartOf: {'@id': '#website'}, about: {'@id': '#app'}, primaryImageOfPage: og image URL }`.
  - `FAQPage` from `t.faq.items` (already server-rendered in `components/sections/Faq.tsx`), `mainEntity` of
    `Question`/`acceptedAnswer`. Since Aug 2023 Google shows FAQ rich results only for government and health sites, so
    expect no SERP feature; it still gives Bing and AI answer engines clean Q/A pairs that match visible text.
  - `SoftwareApplication`: add `image` (og image), `screenshot` (once real screenshots exist), `featureList` (from
    `employers.features` / `employees.features` titles), `softwareVersion` (build arg), `applicationSubCategory`
    ("Time tracking"). Move `installUrl`/`downloadUrl` to the klokka.se download URL (P1-3).
  - `Organization`: `logo` as `ImageObject` with width/height 512, a `description`, and a contact (`email` or
    `contactPoint`) once a public address exists.
  - `BreadcrumbList`: not useful on a single-page site; add it with the first subpage (e.g. `/en/privacy`, `/integritet`).

### P2-2. Sitemap: hreflang set differs from the HTML, no `lastmod`
```
<url><loc>https://klokka.se</loc>
  <xhtml:link rel="alternate" hreflang="sv-SE" href="https://klokka.se" />
  <xhtml:link rel="alternate" hreflang="en" href="https://klokka.se/en" />
  <changefreq>monthly</changefreq><priority>1</priority></url>
<url><loc>https://klokka.se/en</loc> ... same two alternates ... <priority>0.8</priority></url>
```
Valid and reciprocal. But the HTML also declares `x-default` (`seo.ts:20`) and the sitemap does not
(`app/sitemap.ts:6`). Not an error (either channel alone is enough), but keep them identical: add
`'x-default': url('/')` to `languages` in `sitemap.ts`. Google ignores `changefreq`/`priority`; it does use an
accurate `lastmod`. Add `lastModified` from a real content date (a constant bumped when copy changes, or the release
build date passed as a build arg), not `new Date()` at request time.

### P2-3. og:image:type missing; og/logo images revalidate on every fetch
- `og:image:type` absent. Add `type: 'image/png'` to `image` in `seo.ts:27`.
- Headers for the images (all force-static route handlers):
```
/og.png     200 image/png 115,899 B  1200x630 RGBA  cache-control: public, max-age=0, must-revalidate  (no ETag, no Last-Modified)
/og-en.png  200 image/png 116,115 B  1200x630 RGBA  same
/logo.png   200 image/png  34,330 B  512x512        same
/apple-icon 200 image/png   9,725 B  180x180        same
/icon       200 image/svg+xml 3,802 B               s-maxage=31536000
```
  `max-age=0, must-revalidate` is not harmful for crawlers (Facebook, LinkedIn, Slack etc. cache the image on their
  side by URL), but with no validator every revalidation is a full 116 KB download. Set
  `Cache-Control: public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800` for
  `/og.png`, `/og-en.png`, `/logo.png` in `apps/landing/next.config.ts` `headers()` (or `export const revalidate`
  plus explicit headers in the route handlers). When the card design changes, bump a version in the URL
  (`/og.png?v=2` via `ogImagePath` in `seo.ts:6`) because scrapers cache by URL for days to weeks.
- Weight: 116 KB is under WhatsApp's practical ~300 KB limit, far under X (5 MB), Facebook (8 MB), LinkedIn (5 MB).
  Size is not a problem. The PNG is RGBA; the card is fully opaque, so an RGB PNG or a JPEG ~60-80 KB would load
  faster in chat previews. Optional.
- Aspect 1.91:1 is right for FB/LinkedIn/X/Slack/Discord/Telegram; WhatsApp crops to a square-ish thumbnail in some
  layouts, so keep the mark/wordmark away from the far left/right edges (current layout puts the wordmark top-left;
  acceptable).

### P2-4. Meta description (sv) slightly long
Lengths: title sv 45, en 47 chars (good). Description sv **163**, en 150. Google's snippet width cuts around
155-160 characters on desktop and fewer on mobile; the sv tail "Lön visas bara om du vill." will often be truncated.
Trim `sv.meta.description` in `apps/landing/src/lib/i18n/dictionaries.ts:18-19` to about 150 characters, and put the
category term in it (P1-4). The manifest reuses it (`manifest.ts:9`).

### P2-5. LCP is held back by the hero entrance animation (lab LCP 2.3 s on mobile, close to the 2.5 s line)
Local Lighthouse 12.8.2, `https://klokka.se/`:

| | Perf | LCP | FCP | TBT | CLS | SI | TTI |
|---|---|---|---|---|---|---|---|
| Mobile (Moto G4 sim, slow 4G) | 96 | 2.3 s | 1.1 s | 60 ms | 0 | 4.0 s | 2.4 s |
| Desktop | 100 | 0.7 s | 0.3 s | 0 ms | 0 | 0.4 s | 0.7 s |

A11y 100, Best practices 100, SEO 100 on both.
Mobile LCP element: `<p class="hero-note">` (desktop: h1 `.line`). LCP breakdown mobile: TTFB 636 ms (simulated),
load delay 0, **render delay 1,711 ms (73%)**. That render delay is the `rise` keyframe (`globals.css:89-98`,
opacity 0 to 1 over `--dur-rise` 1100 ms) with stagger delays up to `6 x 90 ms` on hero children
(`globals.css:660-745`). Chrome does not count an element for LCP until it is visibly painted, so every hero fade adds
to LCP, and Speed Index (4.0 s) suffers for the same reason.
Fix: in `apps/landing/src/app/globals.css`, keep the translate but drop the opacity-from-0 for the h1, lead and
hero-actions (or start at `opacity: 1` and animate transform only), and cut the stagger on above-the-fold items.
Other lab notes (not worth much work): transfer 269 KB over 13 requests (HTML 29 KB gzip, JS 135 KB, fonts 90 KB,
CSS 12 KB); ~55 KB unused JS and 13 KB legacy polyfills in Next's shared chunks; one render-blocking CSS file (12 KB,
normal for Next); fonts are self-hosted by `next/font` with `display: swap` and 2 preloaded woff2 (`lib/fonts.ts`),
no layout shift; no raster `<img>` on the page at all (66 inline SVGs), so image format/`alt` issues do not arise.
DOM 953 elements (Lighthouse flags >800; harmless here). HTML 149 KB raw includes ~95 KB of RSC payload
duplicating the markup; gzip brings it to 29 KB. Server TTFB measured 40 ms, `x-nextjs-cache: HIT`, fully prerendered.

### P2-6. `robots.txt` carries a non-standard `Host:` line
```
User-Agent: *
Allow: /

Host: https://klokka.se
Sitemap: https://klokka.se/sitemap.xml
```
`Host` is a retired Yandex directive (and expects a hostname, not a URL). Google and Bing ignore it. Remove `host`
from `apps/landing/src/app/robots.ts:8`. See section 7 for the AI crawler groups to add in the same file.

### P2-7. Redirect chain on `/sv/`
`/sv/ -> 308 /sv -> 308 /`. Two hops; nobody links there, so low value, but a single rule fixes it: in
`apps/landing/next.config.ts:47-50` Next's trailing-slash redirect runs first. Acceptable to leave.

### P2-8. Anchor-only navigation
All nav/footer product links are fragments (`#how`, `#employers`, `#faq` ...), 3-4 each per page. Fragments are not
separate URLs to Google, so they carry no ranking weight and cannot rank as their own results; they are fine for UX.
The implication is strategic: every topic lives on one URL per language, so the site can rank for one cluster of
queries. When content grows (FAQ, "for cafes", "tidrapport mall", privacy, self-hosting guide), make real subpages
(`/fragor`, `/en/faq` ...) and add them to `sitemap.ts`, hreflang, and a `BreadcrumbList`. Footer headings
"Produkt / Öppen källkod / Hjälp" are `<h2>`s (`SiteFooter.tsx:52`); consider a non-heading element so the outline
is only content (cosmetic).

### P2-9. No HSTS on klokka.se
`strict-transport-security` is absent on klokka.se (Logto on auth.klokka.se sends
`max-age=15552000; includeSubDomains`, which only covers `*.auth.klokka.se`). Add
`Strict-Transport-Security: max-age=31536000; includeSubDomains` to `securityHeaders` in
`apps/landing/next.config.ts:24-31` (production branch), after P1-2 is fixed and all subdomains are https-only (they
are). Preload later if wanted.

### P2-10. No IPv6
No AAAA for klokka.se. Not a ranking factor; Googlebot crawls over IPv4. Note only.

---

## Checklist by area (what passed, with evidence)

### 1. Crawl and index
| URL | Result |
|---|---|
| `https://klokka.se` and `https://klokka.se/` | 200, same document (149,431 B). These are the same URL: an empty path is `/` by definition, so the canonical `https://klokka.se` with no slash is correct and matches what Next emits. Not a duplicate. |
| `https://klokka.se/en` | 200, canonical `https://klokka.se/en` |
| `https://klokka.se/en/` | 308 to `/en` (good, consistent no-trailing-slash policy) |
| `https://klokka.se/sv` | 308 to `/` (good) |
| `https://klokka.se/sv/` | 308 to `/sv`, then 308 to `/` (P2-7) |
| `https://klokka.se/?utm_source=x` | 200, canonical still bare origin (good) |
| `/nope`, `/en/nope`, `/de`, `/EN`, `/index.html` | 404 with the bilingual `global-not-found.tsx` page, `robots: noindex, follow` (good, no soft 404) |
| `http://klokka.se/` | **302** to https (P1-2) |
| `https://www.klokka.se/` | **200 duplicate** (P1-1) |
| `/robots.txt` | 200 text/plain, `Allow: /`, sitemap line, stray `Host:` (P2-6) |
| `/sitemap.xml` | 200 application/xml, 2 URLs, valid XML, xhtml:link alternates reciprocal (P2-2 for x-default/lastmod) |

hreflang in HTML (identical on both pages, self-referencing, reciprocal):
```
<link rel="canonical" href="https://klokka.se"/>            (en: https://klokka.se/en)
<link rel="alternate" hrefLang="sv-SE" href="https://klokka.se"/>
<link rel="alternate" hrefLang="en" href="https://klokka.se/en"/>
<link rel="alternate" hrefLang="x-default" href="https://klokka.se"/>
```
Correct. `sv-SE` only (no bare `sv`) means a sv-FI searcher falls to x-default, which is the Swedish page anyway.
The locale switch links carry `hrefLang` and `lang` (`SiteNav.tsx:34-43`). Response headers: no `X-Robots-Tag`;
`meta robots index, follow` and `googlebot ... max-image-preview:large` (`seo.ts:55-59`).

### 2. Head tags per locale
| | sv (`/`) | en (`/en`) |
|---|---|---|
| `<html lang>` | `sv-SE` | `en` |
| title | "Klokka, gratis tidrapportering för småföretag" (45) | "Klokka, free hours tracking for small employers" (47) |
| description | 163 chars (P2-4) | 150 chars |
| og:type/site_name/url/title/description | all present | all present |
| og:locale / alternate | `sv_SE` / `en_GB` | `en_GB` / `sv_SE` |
| og:image + width/height/alt | `/og.png` 1200x630, alt "Klokka. En klocka. För båda." | `/og-en.png` 1200x630, alt in English |
| og:image:type | missing (P2-3) | missing |
| twitter:card/title/description/image/alt | `summary_large_image`, complete | complete |
| theme-color | light `#F5F1FF`, dark `#0D0620` via media | same |
| icons | SVG `/icon`, apple-touch 180 PNG; no ico/32 PNG (P1-5) | same |
| manifest | `/manifest.webmanifest`, valid JSON, `application/manifest+json`, one 512 icon (P1-5) | same (sv manifest on en page is fine) |
`og:locale en_GB` vs hreflang `en`: fine, OG locale needs a region, hreflang does not. No `twitter:site` (no X
account); add one if an account is created.

### 3. JSON-LD
See P2-1. Valid graph, no errors expected in the Rich Results Test; "not eligible" for the software-app rich result
without ratings; add WebSite, WebPage, FAQPage.

### 4. Social preview readiness
All tested UAs get 200 on `/`, `/en` and `/og.png` with identical sizes (no UA sniffing, no WAF, no Cloudflare):
facebookexternalhit/1.1, LinkedInBot/1.0, Twitterbot/1.0, Slackbot-LinkExpanding 1.0, WhatsApp/2.23, Discordbot/2.0,
TelegramBot, Googlebot/2.1, bingbot/2.0, GPTBot/1.2, ClaudeBot/1.0, PerplexityBot/1.0.
CSP (`default-src 'self'; img-src 'self' data:; frame-ancestors 'none' ...`) and `X-Frame-Options: DENY` only govern
what a browser rendering klokka.se may load or embed; crawlers fetching the HTML and the og.png are unaffected. HEAD
on `/og.png` answers 200 with `content-type: image/png` (some unfurlers HEAD first). og:image URLs are absolute https
on the same host. Nothing blocks previews. Cache and weight notes in P2-3.

### 5. Performance
See P2-5 (Lighthouse table). Core Web Vitals field data (CrUX) will not exist for weeks at this traffic level; the
lab numbers are good except the animation-driven LCP render delay.

### 6. Content and semantics
- One `<h1>` per page (hero slogan). Then `<h2>` per section, `<h3>` for the three steps; footer column titles are
  also `<h2>` (P2-8). Outline sv: h1 "En klocka. För båda." > h2 Tre steg... (h3 x3) > h2 En hel vecka... > h2 Dina
  timmar... > h2 Bara timmar... > h2 Månaden... > h2 Öppen källkod... > h2 Innan du frågar. > h2 Skapa ett företag... >
  h2 Har du fått en inbjudan? > h2 Produkt / Öppen källkod / Hjälp.
- Server-rendered: all copy, including all 8 FAQ answers (native `<details>`, in the DOM while collapsed, so indexed)
  is in the initial HTML (~1,650 words sv, ~1,690 en). No JS needed to see content.
- `.reveal` hides sections only when `html[data-js]` is set and scroll-timeline is unsupported
  (`globals.css:394-406`); Googlebot renders with JS and a tall viewport, and hidden-until-animated text is still
  indexed. No issue.
- No `<img>` elements; 66 inline SVGs, decorative ones `aria-hidden`. Lighthouse a11y 100.
- Internal links: only `/` and `/en` (locale switch) plus fragments; external: app.klokka.se (9 per page), GitHub
  repo/license/issues, APK (P1-3). Keyword gap: P1-4.

### 7. AI crawlers and GEO
- robots.txt has a single `User-Agent: *` / `Allow: /` group, so GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot,
  Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, Bytespider are all allowed, and live
  requests with their UAs return 200.
- `/llms.txt` and `/llms-full.txt`: 404.
- Recommendation: for a free, open-source product that wants to be recommended, allowing all AI crawlers is right.
  Make it explicit (so a future edit of `*` does not silently change it) by returning named groups from
  `apps/landing/src/app/robots.ts`: `rules: [{ userAgent: '*', allow: '/' }, { userAgent: ['GPTBot','OAI-SearchBot',
  'ChatGPT-User','ClaudeBot','Claude-SearchBot','PerplexityBot','Google-Extended','Applebot-Extended'], allow: '/' }]`.
- Add `llms.txt` as a route handler `apps/landing/src/app/llms.txt/route.ts` (force-static, text/plain), generated
  from the dictionaries so it never drifts: one-line summary, what Klokka is and is not (employer logs hours, employees
  see and flag, pay optional, free, MIT, Android + web, sv/en, EU hosting, self-hostable), links to `/`, `/en`,
  GitHub, license. llms.txt is a proposal with limited proven uptake; it is cheap, which is the only reason to do it.
- The bigger GEO lever is P1-4 plus the FAQPage markup: answer engines quote pages that literally state
  "Klokka är ett gratis tidrapporteringssystem för småföretag".

### 8. Google Search Console, Bing Webmaster, IndexNow
- DNS for klokka.se is at **Dynu** (`ns1..ns6.dynu.com`); A `klokka.se` and `www` both `159.195.199.214`; TXT today:
  `hosted-email-verify=zv5d4ixx` (Migadu) and SPF. Not documented in `docs/OPERATIONS.md` or `docs/RELEASING.md`;
  worth one line in OPERATIONS.
- **Google**: add a **Domain property** `klokka.se` verified by DNS TXT `google-site-verification=...` at Dynu. It
  covers http/https, www and every subdomain (app, auth, auth-admin, api), so you also see if any of them get indexed.
  No code change needed (the HTML-tag method would need `verification.google` in `seo.ts`).
- **Bing**: "Import from Google Search Console" once GSC is verified (fastest), or DNS CNAME/TXT at Dynu.
- **Day one**: submit `https://klokka.se/sitemap.xml` in both; URL Inspection, then "Request indexing" for
  `https://klokka.se/` and `https://klokka.se/en`; check International Targeting/hreflang reports after a few days;
  run the Rich Results Test on both URLs; check `site:klokka.coolify.ooguy.com` (P0-1) and `site:www.klokka.se`.
- **IndexNow** (Bing, Yandex, Seznam, Naver; Google does not use it): create a key, serve it at
  `https://klokka.se/<key>.txt` (add `apps/landing/public/<key>.txt`; `public/` does not exist yet, or a route
  handler), and after each production release POST the two URLs to `https://api.indexnow.org/indexnow`. Since
  production deploys are pinned by hand (`docs/RELEASING.md`), document it as a release-checklist curl rather than a
  `release.yml` step (release.yml runs before the site is actually live).

### 9. app, auth, auth-admin, api
| Host | `/robots.txt` | `/` | noindex? |
|---|---|---|---|
| `app.klokka.se` | 404 (HTML) | 307 to `/sign-in`, 200 | `<meta name="robots" content="noindex, nofollow">` on every page from `apps/web/src/app/layout.tsx:20`; 404 page has an extra `noindex`. No `X-Robots-Tag`. |
| `auth.klokka.se` | **200 text/html** (Logto SPA fallback, not a robots file) | 302 to `/unknown-session` | Logto pages carry `<meta name="robots" content="noindex,nofollow">`. HSTS present. |
| `auth-admin.klokka.se` | 200 text/html (same) | 302 to `/console` | Logto meta noindex. |
| `api.klokka.se` | 404 | 404 | No meta (JSON/404 only); no `X-Robots-Tag`. |

All are effectively non-indexable. Important nuance for the fix: **do not `Disallow: /` a host whose pages you want
deindexed via noindex**: a disallowed URL is never fetched, so the noindex is never seen, and the 9 links per page
from klokka.se to app.klokka.se can then produce URL-only "no information available" results. Also, Twitterbot and
LinkedInBot honour robots.txt, so a Disallow would kill link previews of app.klokka.se.
Recommended:
- `apps/web`: keep the meta; add `X-Robots-Tag: noindex, nofollow` for all routes in `apps/web/next.config.ts`
  `headers()` (covers non-HTML responses such as `/api/k/*`), and an `apps/web/src/app/robots.ts` with `Allow: /` and
  `Disallow: /api/` (the BFF has nothing to crawl). The `(public)/sign-in` and `(public)/join` pages can stay noindex:
  the landing page is the page that should rank for "Klokka logga in"; if brand "login" queries later matter, allow
  indexing of `/sign-in` only.
- `apps/web` previews: the root metadata is `title: 'Klokka'` and nothing else, so a shared app link unfurls as a
  bare "Klokka" with no image. Add to `apps/web/src/app/layout.tsx` metadata: `description`, `openGraph` (type
  website, siteName Klokka, image `https://klokka.se/og.png` 1200x630 with alt, or a web-app-specific card), `twitter:
  summary_large_image`, and `metadataBase` from the app URL. noindex does not stop unfurlers (they ignore meta robots
  and only some honour robots.txt), so previews will work while indexing stays off. Invitation links (`/join?...`)
  are the most-shared URLs; give `(public)/join` a specific title/description ("Du är inbjuden till Klokka").
- `auth.` / `auth-admin.` / `api.`: add `X-Robots-Tag: noindex, nofollow` via a Traefik headers middleware on the
  three Coolify apps (production Coolify, not repo code), and for the API a `/robots.txt` returning
  `User-agent: *\nDisallow: /` is fine because nothing there is linked or needs a preview. Logto's robots.txt
  returning HTML is harmless (parsed as no rules, meta noindex still applies).
