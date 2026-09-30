# SEO and the marketing site

How klokka.se is set up to be found and shared, how to change it without breaking that, and what is still open.
Shipped in v1.1.0 (CHQ-149, 2026-09-30). The decision record is `docs/DECISIONS.md` D18; the research behind every
choice is `docs/research/seo/`; the plan with the owner's choices is
https://claude.ai/artifact/K8kaUNkMRRcq9Rb8shgj7g (its database keeps the picks and decisions).

## 1. What exists

- **22 pages per language** (Swedish at the root, English under `/en`): home, app, small businesses, hourly staff,
  open source, a work-hours calculator, a monthly timesheet template (xlsx + pdf), working hours per month (hub,
  2026, 2027), four trades (café/restaurant, cleaning, salon, shop), five guides (tidrapport, får arbetsgivaren
  ändra, bästa gratis appar, personalliggare, arbetstidslagen), about, privacy, terms.
- **One page registry** (`apps/landing/src/lib/pages/registry.ts`) drives routes, the Swedish root rewrites,
  metadata, canonical + hreflang (sv-SE, en, x-default = sv), JSON-LD, the sitemap, the footer, `llms.txt` and each
  page's link card. Copy lives in `apps/landing/src/lib/i18n/pages/<id>.ts`. How to add a page:
  `apps/landing/AGENTS.md`, "Adding a page".
- **Link cards:** `/og/<id>-<locale>.jpg`, 1200x630 JPEG drawn at build time (`src/lib/brand-image.tsx`) on the
  Higgsfield backgrounds in `src/assets/og/`. The homepage uses the owner's pick: two phones side by side.
- **Indexing:** only production images are indexable (`NEXT_PUBLIC_INDEXABLE`, section 3).
- **Proxy (production):** `www` and http redirect 301 to `https://klokka.se`, HSTS one year, all in the landing
  app's Traefik labels (`docs/OPERATIONS.md`).
- **The web app** (`app.klokka.se`) is never indexed (`X-Robots-Tag` + robots meta) but previews shared links with
  the homepage card, in Swedish when the request has no language (link-preview bots).
- **Sign-in** (Logto, both environments) links `/villkor` and `/integritet`.

## 2. Keyword ownership

One page per search intent; two pages never aim at the same query. The full map with volumes is
`docs/research/seo/keywords.md`; the English keywords are in `gapfill.md`.

| Page | Owns (sv) | Owns (en) |
|---|---|---|
| `/` | gratis tidrapportering | free timesheet app for employees |
| `/tidrapportering-app` | tidrapportering app | timesheet app for android |
| `/tidrapportering-smaforetag` | tidrapportering småföretag, tidrapportering anställda | timesheet app for small business |
| `/rakna-arbetstimmar` | räkna ut arbetstid, timräknare, räkna timmar | work hours calculator |
| `/tidrapport-mall` | tidrapport mall (+ excel) | timesheet template |
| `/arbetstid-per-manad` | arbetstid per månad, timmar per månad | working hours per month sweden |
| `/guide/tidrapport` | tidrapport | how to track employee hours |

Rules that keep the site honest and out of trouble:
- **"personalliggare" never appears in a product or trade page's title or H1** (a test enforces it). Café/restaurant
  and salon pages say Klokka does not replace a personalliggare; cleaning and shop pages say those trades are usually
  not covered. Klokka is not a staff register.
- **No claim the product cannot back:** no clock-in, GPS, scheduling, payroll export, iOS store app, pullable Docker
  images or self-hosting guide (until one exists). "Free to use" and "open source" only; never prices or tiers.
- **Facts early:** every page opens with the plain facts (free, MIT, no limit on employees, web + Android, Swedish
  and English). AI Overviews and answer engines quote the first lines.

## 3. Indexing: staging never, production always

- `NEXT_PUBLIC_INDEXABLE` is a landing build argument, `'true'` only in `.github/workflows/release.yml`. Without it
  every page gets `noindex, nofollow` (meta and `X-Robots-Tag`) and the sitemap is empty.
- `.github/scripts/image.sh` refuses `NEXT_PUBLIC_INDEXABLE=true` for any tag that is not `v*`.
- `.github/scripts/index-check.sh <origin> <index|noindex>` checks `/` and `/en`. CI runs it with `noindex` after
  every staging deploy (so does `./deploy-staging.sh`); `release.yml` runs it with `index` on the built production
  landing image; `docs/RELEASING.md` runs it against klokka.se after pinning.
- robots.txt always `Allow: /` (named AI crawlers too). Never `Disallow` a noindexed host: Google must crawl a page
  to see its noindex, and preview bots must read the tags.

## 4. Images

- Masters, every card size and the generator are in `docs/brand/social/` (README lists the chosen ones):
  backgrounds made with Higgsfield (GPT Image 2.5, high, 2K, the live site and app screens as references), logo and
  text composited in code with the exact mark and the site fonts. Never ship a model-drawn logo.
- Other surfaces already made: GitHub social preview 1280x640, Google Play feature graphic 1024x500, Product Hunt
  1270x760, X/LinkedIn header 1500x500, square 1200x1200 for posts shared by hand.
- Card rules: one `og:image`, JPEG under 300 KB, logo and headline readable in the centre 560 px (WhatsApp and
  Telegram crop the centre square), no WebP/SVG. A new image gets a new URL, then re-scrape (section 6).

## 5. Keeping content correct

Every legal statement was checked against official sources before release (riksdagen.se law texts, av.se AFS 2023:2,
skatteverket.se, regeringen.se, curia, imy.se); unverifiable ones were cut. Each guide shows a review date and its
sources. Dates to act on:

| When | What |
|---|---|
| When the Riksdag decides prop. 2025/26:282 (motion period ends 2026-10-05) | Update `/guide/personalliggare-eller-tidrapport` (proposed start 2027-01-01) and its review date. |
| Before 1 December each year | Add next year's `/arbetstid-per-manad/<year>` (a registry entry + copy; numbers come from `src/lib/workdays.ts`). |
| Yearly, or when a vendor changes plans | Re-check the competitors' free-plan facts in `/guide/basta-gratis-tidrapportering` on their own sites; update the dated caption. |
| After the owner's Swedish read | Fold the owner's corrections into the guides and the terms' data processing clause. |

Changing a guide later: settle every legal claim against an official source, update `reviewed` and `sources`.

## 6. After each release

`docs/RELEASING.md`, "After the landing is deployed": index check against production, IndexNow (key
`97610e0ce4b2f414fb199ad350852ed0`, one bounded POST of the sitemap URLs), re-scrape `/` and `/en` in the Facebook
Sharing Debugger and LinkedIn Post Inspector.

## 7. Search Console and Bing (not connected yet)

1. Search Console: add a **Domain property** for klokka.se, verified with a TXT record at Dynu (DNS host).
2. Add the existing Search Console service account (`/home/dev/.config/gsc/credentials.json`, used by the `gsc` MCP)
   as a user with **Full** permission (read-only gave 403 errors on cleanhq.se).
3. Submit `https://klokka.se/sitemap.xml`; request indexing for `/` and `/en`.
4. Bing Webmaster: import the property from Search Console (Bing feeds ChatGPT search and Copilot).
5. From week 4: a weekly look with the `gsc` MCP. Pages at positions 5 to 20 are the ones to improve first;
   check `site:klokka.coolify.ooguy.com` and `site:www.klokka.se` stay empty.

## 8. Backlog (P3 and launch)

- GA4, loaded only after consent (the owner's choice); the CSP in `apps/landing/next.config.ts` must allow it.
- "Alternativ till X" pages once Search Console shows which competitor names people search.
- Google Play listing (needs a Play Console account; app stores fill 4 of 9 results for "tidrapport app").
- GitHub: topics, the homepage field, a README hero with the 1280x640 card, GitHub Releases for the tags.
- Launch links in order: Swedish "best app" lists (businesswith.se, capterra.se, systemguiden.org), AlternativeTo,
  Show HN, r/selfhosted and selfh.st, open-source directories, Product Hunt; awesome-selfhosted not before
  2027-01-28 (4 months after v1.0.0). Details: `docs/research/seo/competitors.md`.
- A self-hosting guide (the open-source page and awesome-selfhosted both wait for it), a short Swedish YouTube demo,
  Capterra reviews, a LinkedIn page. The full list with priorities: `docs/research/seo/playbook-gaps.md`.
- The brand name is ambiguous in search (Norwegian "klokka" = the clock, klokka.com is unrelated): pair "Klokka"
  with the category ("Klokka tidrapport") in copy and profiles.
