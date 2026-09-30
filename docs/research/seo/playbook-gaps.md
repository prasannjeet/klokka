# Klokka SEO plan vs our past SEO playbook: gap list (2026-09-29)

Read-only comparison. No DataForSEO calls, no production requests (one WebSearch for the brand name, no fetch of
klokka.se needed: the saved headers in the scratchpad were enough).

## What was compared

Klokka plan: `site/index.html` (plan text), `research-keywords.md`, `research-competitors.md`,
`research-technical.md`, `research-social-specs.md`, `page-briefs.md` (sections 0 to 2 only; the file ends in an
`<!-- APPEND -->` marker, so later sections were still being written and are not judged here).
`research-gapfill.md` does not exist yet.

Past playbook:
- `~/.agents/skills/seo-meta-og/SKILL.md` (no other files next to it), `~/.agents/skills/local-seo-skill/SKILL.md`
- `cleanhq/cleanhq.se/SEO-PLAN.md`, `SEO-STRATEGY.md`, `SEO-SCHEMA.md`
- `cleanhq/delhi-6-main/SEO-PLAN.md`
- `nakshatra/seo/*.md` (7 files: deep research, measurement loop, organic growth, keywords, recommendations, GTM x2)
- `cleanhq/logical-guy-nuxt-seo/src/seo/index.ts`, `new-sawerashree/src/lib/seo.ts`
- claude-seo plugin v2.2.0 (`~/.claude/plugins/cache/agricidaniel-claude-seo/claude-seo/2.2.0/skills/`)

claude-seo skills installed (25): seo, seo-audit, seo-backlinks, seo-cluster, seo-competitor-pages, seo-content,
seo-content-brief, seo-dataforseo, seo-drift, seo-ecommerce, seo-flow, seo-geo, seo-google, seo-hreflang,
seo-image-gen, seo-images, seo-local, seo-maps, seo-page, seo-plan, seo-programmatic, seo-schema, seo-sitemap,
seo-sxo, seo-technical. (A synced copy also lists seo-ahrefs, seo-bing, seo-firecrawl, seo-profound, seo-seranking,
seo-unlighthouse; these are paid-tool or extension wrappers, not in the installed version.)

## Bottom line

The Klokka plan is stronger than any past plan on technical audit, social cards, competitor structure and page
architecture. What it lacks is mostly what the past plans learned *after* launch: a guard against the staging fix
backfiring on production, a brand-name disambiguation (Klokka is a common Norwegian word and klokka.com is another
software product), a keyword-cannibalization check between the homepage and the new pages, contextual internal
linking beyond the footer, a video asset for a SERP where video already ranks, native Swedish and author review on
the legal guides, and a written measurement loop with targets. Local-SEO items (GBP, NAP, citations, maps) do not
apply.

---

## 1. Gap list

Priority: P0 ship with the P0 fixes, P1 before or with the first page build, P2 within 1 to 2 months, P3 later.

### P0

#### G1. Post-release SEO smoke check (guards the staging noindex fix)
- **What:** after every production pin and every staging deploy, fetch every URL in the sitemap and assert status 200,
  canonical host, `robots` meta and `X-Robots-Tag`, hreflang set, JSON-LD parses. Production must be `index`,
  staging must be `noindex`.
- **Source:** `delhi-6-main/SEO-PLAN.md` "Check this first when we revisit this plan" (staging host became Google's
  chosen canonical); `cleanhq.se/SEO-PLAN.md` 3A (curl verification of every surface after deploy); claude-seo
  `seo-drift` (baseline and compare of title, canonical, robots, schema, OG per deploy).
- **Applies:** yes, and it is new risk the plan creates. The P0 fix makes indexability depend on
  `NEXT_PUBLIC_INDEXABLE` being set only in `release.yml`. If a release build ever misses the flag, production ships
  `noindex` silently, and nothing in the plan would notice until Search Console shows pages dropping weeks later.
- **How without DataForSEO:** a small script (`scripts/seo-smoke.sh` or a Vitest/Playwright check) that reads
  `sitemap.xml`, curls each URL, greps the head, and exits non-zero on mismatch. Add it as a line in
  `docs/RELEASING.md` right after "pin the tag in Coolify", and as a CI step after the staging deploy (asserting
  noindex there). Optionally store the head fields as a JSON baseline and diff it per release (what seo-drift does).
- **Priority:** P0.

### P1

#### G2. Brand SERP and entity disambiguation for "Klokka"
- **What:** check what Google shows for the brand name and make the entity unambiguous.
- **Source:** `cleanhq.se/SEO-STRATEGY.md` section 4 "Brand SERP" (cleanhq.se ranked #6 under an Australian brand) and
  section 6 (llms.txt disambiguation note); claude-seo `seo-geo` (entity clarity, sameAs).
- **Applies:** yes, strongly. A US-index search for "klokka" today returns Norwegian dictionary pages (klokka = "the
  clock" in Norwegian), a Norwegian folk song, a Spotify track, and **klokka.com, an unrelated business-software
  product**. The plan never checks the brand SERP. Brand searches ("klokka app", "klokka logga in") will be the first
  real traffic, from invitation emails and word of mouth.
- **How:**
  - Check `klokka`, `klokka app`, `klokka tidrapport`, `klokka logga in` on google.se in a private window (and later in
    Search Console queries).
  - Add a disambiguation line to `llms.txt` and the Organization / SoftwareApplication `description`, e.g.
    sv: "Klokka (klokka.se) är en svensk app för tidrapportering i småföretag. Den har ingen koppling till klokka.com."
    en: "Klokka (klokka.se) is a Swedish hours-tracking app for small employers. It is not related to klokka.com."
  - Use "Klokka tidrapport" / "Klokka hours" as the consistent profile name on GitHub, AlternativeTo, Product Hunt and
    any social profile, and list all of them in `sameAs`.
  - Goal (from cleanhq): klokka.se in positions 1 to 3 for "klokka" in Sweden within about 8 weeks.
- **Priority:** P1.

#### G3. Keyword cannibalization and SERP-overlap check before titles are fixed
- **What:** make sure two Klokka pages do not target the same query, and that queries merged onto one page really share
  a SERP.
- **Source:** claude-seo `seo-cluster` (cluster by SERP overlap, not by text similarity; hub-and-spoke);
  `nakshatra/seo/nakshatra-organic-growth.md` (one pillar per cluster).
- **Applies:** yes. Examples from the plan: the homepage title "Gratis tidrapportering för småföretag, öppen källkod"
  and `/tidrapportering-smaforetag` "Tidrapportering för anställda i småföretag" both lean on "tidrapportering
  småföretag"; `/guide/tidrapport` vs the homepage for "tidrapport"; `räkna timmar`, `timräknare`, `räkna ut arbetstid`
  and `räkna arbetstimmar` are all merged onto `/rakna-arbetstimmar` without a SERP-overlap check. (The research
  keyword doc even proposes a different homepage title, "Tidrapportering för småföretag, gratis och öppen", than the
  plan's page table, so the final pick is still open.)
- **How:** for each candidate pair, compare the Google.se top 10 in a private window (or the WebSearch tool, lower
  fidelity). Rule of thumb from seo-cluster: 4 or more shared URLs means one page; 0 to 1 means separate pages. Then
  give each page one primary keyword in the registry and add a guard test that no two registry entries share a primary
  keyword. After launch, the Search Console "Pages" tab per query shows real cannibalization (two URLs alternating).
- **Priority:** P1 (decide before page titles and slugs are set; slugs are expensive to change later).

#### G4. Contextual internal links, not only the footer
- **What:** every guide links up to the product and to the relevant tool with descriptive anchors; the product pages
  link down to the guides; the homepage body links to the P1 pages; nothing is more than 2 to 3 clicks deep.
- **Source:** `nakshatra/seo/nakshatra-organic-growth.md` "Internal linking rules" (link up with descriptive anchor,
  link down, cross-link tools, 2 clicks from home); `nakshatra-seo-deep-research.md` C4; claude-seo `seo-cluster`
  (internal link matrix), `seo-content` (3 to 5 contextual links per 1000 words, no orphans).
- **Applies:** yes. The plan specifies only a footer. Footer links are sitewide boilerplate and carry the least weight;
  the calculator and template pages are meant to be the link magnets that pass value to the product pages, which only
  happens with in-body links.
- **How:** add `related: PageId[]` to each entry in `apps/landing/src/lib/pages/registry.ts`, render a "Läs också" /
  "Related" block and at least one in-copy link per section from the page dictionaries, and extend the guard test:
  every page has at least 2 inbound in-body links, no page is only reachable from the footer. Anchor examples:
  "räkna ut arbetstid gratis", "tidrapport mall i Excel", "appen för tidrapportering".
- **Priority:** P1.

#### G5. Native Swedish review, and author and reviewer on the legal guides (E-E-A-T)
- **What:** a native speaker reviews every Swedish page before publishing; guides show who wrote and reviewed them,
  with a date, and say how they were made.
- **Source:** `cleanhq.se/SEO-PLAN.md` 1B and 3B ("Swedish native review before publishing"), `SEO-STRATEGY.md`
  section 8 item 4; claude-seo `seo-content` (Google's Who / How / Why test, AI-content markers, author byline),
  `seo-geo` quick wins (Person schema for authors), `seo-content-brief` (E-E-A-T requirements, information gain).
- **Applies:** yes. The plan builds 8 P1 and about 10 P2 Swedish pages, several on labour-law topics (arbetstidslagen,
  får arbetsgivaren ändra tidrapport, personalliggare), which sit close to YMYL for employers. The page briefs already
  have "Senast granskad", a disclaimer, sources and an About page, which is good. Missing: a named author and
  reviewer, a Person entity, and a short "how this was made" line, plus a language-review gate.
- **How:** in the page dictionaries add `author` and `reviewedBy` (name, role, link to the GitHub profile or LinkedIn);
  emit `Article` with `author` (Person, `sameAs`), `datePublished`, `dateModified` from the registry `lastmod`; add a
  review checklist item "native sv review done" per registry entry (a boolean the guard test requires before a page
  is added to the sitemap). Proposed byline copy: "Skriven av Prasannjeet Singh, utvecklare av Klokka. Senast
  granskad 2026-10-15." / "Written by Prasannjeet Singh, developer of Klokka. Last reviewed 2026-10-15."
- **Priority:** P1 for the four legal guides and the homepage; P2 for the rest.

#### G6. A short Swedish video (YouTube), embedded with VideoObject
- **What:** a 30 to 60 second screen recording of the employer logging a day and the employee seeing the month,
  published as a YouTube Short and a normal video, then embedded on the app page.
- **Source:** `cleanhq.se/SEO-STRATEGY.md` section 6 and `SEO-PLAN.md` Step 4 ("2-3 short YouTube demos, strongest
  AI-citation signal"); claude-seo `seo-geo` (YouTube mentions correlate most with AI citations, multi-modal content
  selected more often).
- **Applies:** yes, with direct evidence in our own research: the "gratis tidrapportering" SERP has video results on
  page 1, including a YouTube Short with about 13 views and a Facebook video (`research-competitors.md` 1.1). A Klokka
  Short titled for that query is probably the fastest page-1 appearance available, faster than the domain itself.
  The plan mentions none of this.
- **How:** record on the phone and the web app with demo data (screen recording, no voice needed, Swedish captions).
  Title: "Gratis tidrapportering för småföretag: så funkar Klokka". Description starts with the fact line and links to
  klokka.se. Embed on `/tidrapportering-app` with `VideoObject` JSON-LD (name, description, thumbnailUrl, uploadDate,
  duration, contentUrl or embedUrl). Add the channel to `sameAs`.
- **Priority:** P1 (cheap, and the SERP proof exists).

#### G7. Written measurement loop with 90-day targets
- **What:** a weekly and monthly routine once Search Console has data, plus a small KPI table.
- **Source:** `nakshatra/seo/measurement-loop.md` (weekly: positions 5 to 20, sort by impressions, strengthen that
  exact page: query in title, H1, first 100 words, add 1 to 2 internal links; every 4 to 8 weeks: check "Discovered,
  not indexed", re-verify supported schema types); `cleanhq.se/SEO-STRATEGY.md` section 7 (KPIs for 90 days, watch
  impressions before clicks); claude-seo `seo-plan` (KPI targets table).
- **Applies:** yes. The plan says "track impressions from week 4" and nothing more.
- **How:** the `gsc` MCP already on this host (free): `search_analytics` for queries and pages, `detect_quick_wins`
  for the striking-distance list, `index_inspect` for Google-selected canonical and coverage of new URLs. Proposed
  90-day KPIs: all sitemap URLs indexed; Google-selected canonical is klokka.se for `/` and `/en` (not the staging
  host, which is the delhi-6 lesson); "klokka" brand query in top 3; impressions on at least 10 non-brand queries per
  P1 page; 10 or more referring domains (GitHub, AlternativeTo, directories); "Skapa ditt företag" clicks from organic
  measured (G14).
- **Priority:** P1 (a doc section, no code).

#### G8. Search Console service account needs Full permission, not read-only
- **What:** when adding the gsc service account to the new property, give it "Full" so sitemap submission and URL
  inspection work through the API.
- **Source:** `cleanhq.se/SEO-STRATEGY.md` section 8 item 1 and `SEO-PLAN.md` Step 2 (API sitemap submission returned
  403 because the account had a restricted role).
- **Applies:** yes. The plan says "give the existing Search Console service account access", without the level.
- **How:** Search Console, Settings, Users and permissions, add the service-account email from
  `/home/dev/.config/gsc/credentials.json` as Full. Then `gsc submit_sitemap` works without the owner.
- **Priority:** P1 (one-line fix to the plan).

### P2

#### G9. Correct the FAQ and HowTo schema status
- **What:** FAQ rich results were retired for all sites on 7 May 2026, and HowTo was removed in 2023.
- **Source:** `nakshatra-seo-deep-research.md` section B; `measurement-loop.md` "What NOT to do";
  `cleanhq.se/SEO-SCHEMA.md` 4.5; claude-seo `seo-schema` ("HowTo: never recommend").
- **Applies:** yes, as a correction. The plan's technical section and `page-briefs.md` 0.4 still say FAQ rich results
  show "since Aug 2023 only for government and health", and the briefs plan `HowTo` "kept for answer engines".
- **How:** keep `FAQPage` where a visible FAQ exists (Info priority, for Bing and AI answers); drop `HowTo` from the
  registry flags and `jsonLdFor`; do not budget effort for FAQ rich results. Re-check supported types in the live Rich
  Results Test, not from a cached list.
- **Priority:** P2 (low impact, avoids wasted work).

#### G10. Rich Results Test and Schema Markup Validator per page template
- **What:** after each new template ships (product, tool, template, guide, industry, about), run one URL of that kind
  through both validators.
- **Source:** `nakshatra-seo-deep-research.md` E2 and `measurement-loop.md` step 2; `cleanhq.se/SEO-PLAN.md` 3A.
- **Applies:** yes. `research-technical.md` mentions it for `/` and `/en` on day one only; the plan page does not.
- **How:** free web tools (search.google.com/test/rich-results, validator.schema.org), or add a JSON-LD shape check to
  the G1 smoke script. Add a line to the release checklist.
- **Priority:** P2.

#### G11. Image SEO for content pages (not only OG cards)
- **What:** real screenshots and template previews with descriptive file names, alt text in both languages, modern
  formats, width and height set, the hero image not lazy-loaded.
- **Source:** `~/.agents/skills/seo-meta-og/SKILL.md` pillar 3 "Asset and Image SEO" (semantic alt, lowercase
  hyphenated file names); claude-seo `seo-images` (alt 10 to 125 chars, WebP/AVIF, size tiers, `fetchpriority` on LCP
  image, no lazy LCP), `seo-page`.
- **Applies:** yes. Today the site has no raster images, so the audit found nothing, but the new app, template and
  industry pages will add them. Our research shows an **image pack at the top of "tidrapportering"** and on "gratis
  tidrapportering", filled with template thumbnails (dokumera, zervant, startaegetinfo). A good preview image of the
  Klokka timesheet template can enter that pack.
- **How:** `next/image` with AVIF/WebP, files named like `tidrapport-mall-excel-manad.png`,
  `klokka-manadsvy-anstalld.png`; alt from the page dictionary (sv: "Tidrapport mall i Excel med en rad per dag och
  summa för månaden", en: "Timesheet template in Excel with one row per day and a monthly total"); set
  `primaryImageOfPage` on the `WebPage` node. Add alt-present and alt-length to the guard test.
- **Priority:** P2 (P1 for the template page itself).

#### G12. Thin-content and near-duplicate gate for industry and yearly pages
- **What:** measure unique text between pages built from one template before publishing them.
- **Source:** claude-seo `seo-programmatic` (at least 30 to 40% unique content between any two pages of a set,
  "Would this page be worth publishing even if no other similar pages existed?", list of penalty-risk patterns:
  "Best tool for industry" without industry-specific value, "competitor alternative" without real comparison data),
  `seo-sitemap` quality gates.
- **Applies:** partly covered. The competitor research already says "only 4 industry pages, substantive, Swedish
  specifics". Not covered: the yearly `/arbetstid-per-manad/2026` and `/2027` pages (same template, different
  numbers), and the P3 alternatives pages.
- **How:** in `apps/landing/test/pages.test.ts`, compute word-level overlap between pages of the same `kind` (excluding
  nav, footer and shared blocks) and fail under 40% unique. For the yearly pages, add year-specific text (which
  holidays fall on weekdays, klämdagar, what changed from last year) or keep only the current year indexable and
  `noindex` the rest.
- **Priority:** P2.

#### G13. Freshness program and seasonality timing
- **What:** a calendar of when each page is re-reviewed, and publishing dates timed to search peaks.
- **Source:** claude-seo `seo-geo` (content under 3 months old is about 3x more likely to be cited in AI answers;
  pages stale for 6+ months lose eligibility), `seo-competitor-pages` ("as of date" on prices, quarterly review);
  `nakshatra-organic-growth.md` (visible "last updated"); `cleanhq.se/SEO-STRATEGY.md` section 2 (September spike
  3 to 5x, "indexed and aged before September" deadline).
- **Applies:** yes. The briefs have "Senast granskad" but no cadence. Our own keyword data shows a September 2025 spike
  for tidrapportering (2 400 vs about 1 000 baseline), which the research treats only as noise to average away.
  "Arbetstid per månad 2027" and "arbetsdagar 2027" searches will peak around December and January.
- **How:** Google Trends (free) for tidrapportering, tidrapport mall, räkna arbetstimmar, arbetsdagar 2027, Sweden,
  5 years, to confirm the peak months. Then: publish the 2027 working-hours page by 1 December 2026; review the
  comparison guide quarterly (competitor prices and limits with an "as of" date and a source link each); review legal
  guides every 6 months; `lastmod` in the registry changes only with real content changes.
- **Priority:** P2.

#### G14. Conversion tracking across klokka.se and app.klokka.se
- **What:** know which pages lead to a created business, not just to a click on the button.
- **Source:** `nakshatra/seo/gtm-upcoming-tracking.md` and `gtm-container-setup-checklist.md` (event list, key events,
  custom dimensions, validate before publish); `cleanhq.se/SEO-PLAN.md` Step 2 (form_submit as key event; the owner's
  LAN DNS filter at 192.168.0.5 blocks analytics hosts, so test from mobile data).
- **Applies:** yes. The plan lists three events (Create business, Log in, APK download) under the GA4 option only. It
  does not cover the cookieless option's events, template downloads, calculator use, or the fact that the actual
  sign-up happens on a different host.
- **How:** with Plausible or Umami (the recommended option), send custom events `create_business_click`,
  `apk_download`, `template_download` (props: format), `calculator_used`, `locale_switch`, each with a `page` prop.
  Append `?utm_source=klokka.se&utm_content=<page-id>` to the app CTA links, and have the API or web app record the
  first-touch `utm_content` on workspace creation (one nullable column), so "businesses created per landing page" is a
  number we own. Test from mobile data, not the LAN.
- **Priority:** P2 (P1 if GA4 is chosen, because consent wiring is required first).

#### G15. Free keyword data sources instead of topping up DataForSEO
- **What:** English volumes and trade-page volumes without DataForSEO.
- **Source:** `nakshatra/seo/nakshatra-priority-keywords.md` (used Google Keyword Planner ranges, India);
  claude-seo `seo-google` (Keyword Planner through Google Ads API, tier 3); `local-seo-skill` (GSC is free ground
  truth, check it first).
- **Applies:** yes. Decision 3 in the plan offers only "top up DataForSEO" or "wait for Search Console".
- **How:** Google Ads Keyword Planner (free with any Google Ads account, no spend; gives ranges like 100 to 1K) for the
  UK/US English list and the Swedish trade terms; Bing Webmaster Tools Keyword Research (free after the Bing import,
  Bing-only volumes but real); Google Trends for relative demand; autocomplete (already used). Ranges are enough to
  rank the P2 and P3 pages against each other.
- **Priority:** P2.

#### G16. SERP page-type check before building each remaining page
- **What:** confirm, per target query, that the page type we plan matches what Google ranks (tool, template, guide,
  listicle, homepage).
- **Source:** claude-seo `seo-sxo` (page-type mismatch detection; "a page can score 95 technically and fail because it
  is the wrong page type").
- **Applies:** partly covered. `research-competitors.md` classified page types for 8 queries (e.g. "tidrapport mall" is
  100% templates). Not checked: räkna ut arbetstid / timräknare, arbetstid per månad, timanställda, får arbetsgivaren
  ändra tidrapport, the four industry queries, and all English page targets.
- **How:** google.se in a private window (or WebSearch), top 10 per query, tally page types, build the dominant type.
  Record it as `serpType` in the registry next to the primary keyword.
- **Priority:** P2 (do it page by page, just before writing each brief).

#### G17. Entity footprint: LinkedIn page, sameAs, and first-party links from our own sites
- **What:** profiles and mentions that tell Google and LLMs Klokka is a real, maintained product.
- **Source:** `cleanhq.se/SEO-PLAN.md` Step 4 and 5 (LinkedIn company page, founder profile, sameAs array, footer social
  links, client "Webbplats av CleanHQ" links as the fastest first links); `SEO-STRATEGY.md` section 5 Phase 0.5;
  claude-seo `seo-geo` (brand mentions correlate about 3x more with AI visibility than backlinks; Reddit and LinkedIn
  presence).
- **Applies:** mostly yes. The plan's launch list covers GitHub, AlternativeTo, HN, Reddit, Product Hunt and
  directories. Missing: a LinkedIn company page (Swedish small-business owners are there; specs are already in
  `research-social-specs.md` section 4 but no step uses them), a link from the owner's own sites, and a real-use
  case study.
- **How:** LinkedIn page "Klokka" with the 400x400 logo and 1512x256 cover; add it and every launch profile to the
  Organization `sameAs`. Add a "Klokka" link in the cleanhq.se footer or products section (same owner, relevant,
  dofollow). If any business we already work with (for example a restaurant client) uses Klokka for its staff, ask
  for a short case study with numbers: it is the "Experience" signal for the café/restaurang page. (Whether such a
  user exists is not known to me.)
- **Priority:** P2.

#### G18. Collect genuine reviews where AI Overviews already look
- **What:** get a few real reviews on third-party sites.
- **Source:** `cleanhq.se/SEO-PLAN.md` Step 4 (reviews engine, 10+ reviews target); `delhi-6-main/SEO-PLAN.md` P2
  item 8 (no fake aggregateRating; schema only if reviews are shown on page); claude-seo `seo-competitor-pages`
  (G2/Capterra ratings as social proof).
- **Applies:** yes, the non-GBP part. Our research shows capterra.se is cited in the AI Overview for "gratis
  tidrapportering". The plan lists a Capterra listing but no step to get reviews on it.
- **How:** after the first 5 to 10 real businesses have used Klokka for a month, send one in-app or email request to
  review on Capterra.se (and AlternativeTo "likes"). Keep the plan's rule: no `aggregateRating` on klokka.se unless
  reviews are shown on the page.
- **Priority:** P2 (month 2 onward).

#### G19. Trust content for employers entering staff data
- **What:** a short "Säkerhet och data" / "Security and data" section or page: where data is stored, who sees what,
  export, deletion, open source code as proof.
- **Source:** claude-seo `seo-plan` SaaS template (`/security` page, high priority for SaaS), `seo-content`
  Trustworthiness (privacy policy, contact info, transparency).
- **Applies:** yes. The privacy page is planned (page-briefs 8.2), which covers the legal side; a plain-language trust
  section answers the buyer question "is my staff's data safe here" and gives AI answers a citable fact.
- **How:** a section on `/om` or `/oppen-kallkod` fed from facts in the repo (hosting location, roles, history log,
  CSV export). State only what is true today (the briefs note there is no self-service account deletion).
- **Priority:** P2.

### P3

#### G20. AI answer-engine visibility baseline, done by hand
- **Source:** claude-seo `seo-geo` (score Google AI Overviews and AI Mode separately, plus ChatGPT and Perplexity);
  `research-competitors.md` section 4 proposes the DataForSEO ChatGPT scraper instead.
- **Applies:** yes.
- **How:** 5 fixed prompts (for example "Vilken gratis app för tidrapportering är bäst för ett litet café?",
  "open source time tracking for employers of hourly staff"), asked monthly in ChatGPT (search on), Perplexity,
  Gemini/AI Mode, Copilot and Claude; log mentioned yes or no and cited URL in a table. Free, 15 minutes a month.
- **Priority:** P3.

#### G21. Backlink monitoring with free sources
- **Source:** claude-seo `seo-backlinks` (Bing Webmaster, Moz free API, Common Crawl); cleanhq section 4
  (backlink audit found 13 nofollow junk links).
- **Applies:** yes, once launch links go out.
- **How:** Search Console "Links" report and Bing Webmaster "Backlinks" monthly; count referring domains against the
  G7 target.
- **Priority:** P3.

#### G22. Wikidata item
- **Source:** claude-seo `seo-geo` (entity presence in Wikipedia and Wikidata).
- **Applies:** maybe. Wikipedia notability is out of reach; a Wikidata item for free software with a public repo and
  official website is often accepted, but it can be deleted without independent references.
- **How:** create it after the first independent mention (HN front page, a listicle, a directory) so it has a
  reference; link it in `sameAs`.
- **Priority:** P3.

#### G23. Article metadata on guides
- **Source:** `new-sawerashree/src/lib/seo.ts` (every page: canonical, `og:type` website or article, `publishedTime`,
  one fallback chain; `BlogPosting` with `dateModified` and authors); `logical-guy-nuxt-seo/src/seo/index.ts`
  (per-page title and description templates, BreadcrumbList per page); `seo-meta-og` pillar 2.
- **Applies:** yes, small. The plan's `metadataFor` covers canonical, hreflang and per-page cards, but not
  `og:type: article` with `article:published_time` / `article:modified_time` for guides, or a per-page `noIndex` flag
  in the registry (useful for pages not yet reviewed, see G5 and G12).
- **How:** add `kind === 'guide'` to `og:type: article` and the two time tags from the registry; add `noindex?: true`
  to the registry and exclude those entries from the sitemap and llms.txt.
- **Priority:** P3.

#### G24. Changelog or release notes page
- **Source:** claude-seo `seo-plan` SaaS template (resources, docs); competitor research (solidtime's 16
  changelog-style posts are most of its site).
- **Applies:** yes for the open-source audience. Fresh, dated content every release, at no writing cost, from the
  GitHub releases already made by `release.sh`.
- **How:** `/en/changelog` and `/andringar` rendered at build time from GitHub releases or a `CHANGELOG.md`.
- **Priority:** P3.

#### G25. Content cadence and one original-data asset
- **Source:** `cleanhq.se/SEO-STRATEGY.md` Phase 3 (2 articles per month; a small local study for PR links);
  claude-seo `seo-content-brief` ("information gain is non-negotiable").
- **Applies:** yes after the P2 pages. The plan ends at "month 2 onward".
- **How:** one guide per month from the PAA list in `research-competitors.md` section 3; one data asset per year, for
  example a computed "arbetstimmar per månad 2027" table with klämdagar, which is unique and linkable.
- **Priority:** P3.

#### G26. Core Web Vitals field data and INP on the calculator
- **Source:** claude-seo `seo-technical` (INP under 200 ms, 75th percentile field data), `seo-google` (CrUX).
- **Applies:** yes later. The plan has lab Lighthouse only (fine for now; field data needs traffic). The calculator is
  the first interactive page.
- **How:** Lighthouse timespan or Performance panel on the calculator for INP; PageSpeed Insights field data once CrUX
  has enough traffic (months).
- **Priority:** P3.

---

## 2. Past playbook items that do NOT apply to Klokka

| Item | Source | Why not |
|---|---|---|
| Google Business Profile, local pack, GBP reviews, map embed, opening hours | cleanhq Step 4 and 5, delhi-6 P2, `seo-local`, `seo-maps` | Klokka is an online product with no place customers visit. Google's GBP rules exclude online-only businesses. |
| NAP consistency and directory citations (hitta.se, allabolag, eniro) | cleanhq Step 4, delhi-6 P3 | These list a local company with an address and phone. Product directories (AlternativeTo, Capterra, OSS lists) are the right equivalent and are in the plan. |
| City and location pages, "Växjö in prose", areaServed | cleanhq 1B and Phase 2, `logical-guy-nuxt-seo` service-location generator | No geographic intent. Industry pages are the equivalent and are in the plan. |
| `LocalBusiness` / `ProfessionalService` schema | cleanhq SEO-SCHEMA 4.1, nuxt-seo | Klokka is `Organization` plus `SoftwareApplication`, as the plan has. |
| `Service` + `Offer` with real prices | cleanhq SEO-SCHEMA 4.3 | Product rule: no pricing, tiers or seats in public copy. `offers.price: 0` already covers "free". |
| Product / AggregateOffer, Google Shopping | cleanhq 3B (Clean Blip), `seo-ecommerce` | Not a physical product. |
| `meta keywords` | `logical-guy-nuxt-seo` | Ignored by Google and Bing. Skip. |
| Security headers, `poweredByHeader: false` | cleanhq 1D | Already live on klokka.se (CSP, nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options; no `x-powered-by`). HSTS is the one missing header and the plan covers it. |
| Hindi/Hinglish body translation | nakshatra C3 | The Klokka equivalent (real English bodies, not chrome-only) is already the plan's default. |
| `schema-dts` typed JSON-LD | nakshatra D | Optional nicety; the plan's builder in `seo.ts` plus the guard test is enough. |
| seo-flow prompt library, seo-image-gen | claude-seo | Not needed: FLOW is a prompt catalogue; image generation is already done with Higgsfield. |

---

## 3. What the plan already covers well (for comparison)

- Staging duplicate found and fixed with noindex while keeping `Allow: /` (the delhi-6 lesson, handled better than
  delhi-6 did).
- www to apex 301, http to https permanent, HSTS (cleanhq 1D and section 9 items).
- Hreflang: self-referencing, reciprocal, x-default in HTML and sitemap, `lastmod` from real dates (cleanhq 1C,
  `seo-hreflang`).
- One page registry driving routes, sitemap, footer, llms.txt, OG cards and a guard test (better than any past repo).
- Title at most 60 and description at most 155, checked by script (seo-meta-og pillar 1).
- Per-page, per-language OG cards, 1200x630, with type, size, alt, cache and versioned URL (seo-meta-og pillar 2, far
  beyond it).
- Full favicon and manifest set (plan P1).
- JSON-LD graph: Organization, SoftwareApplication, WebSite, WebPage, FAQPage, BreadcrumbList, no fake ratings
  (cleanhq SEO-SCHEMA, `seo-schema`).
- Explicit AI crawler groups in robots.txt and a generated llms.txt (cleanhq 1B, `seo-geo`).
- Fact line in the first two sentences for AI Overview citation (cleanhq section 6, `seo-geo` citability).
- Keyword research with real Swedish volumes, CPC and referring-domain difficulty, honest about unmeasured English
  (cleanhq section 2 quality).
- Competitor structure from sitemaps and live SERPs, with page types for 8 queries (`seo-plan` competitive analysis,
  partial `seo-sxo`).
- Tools and templates as the traffic engine, industry pages capped at 4 with real specifics (`seo-programmatic` safe
  page types).
- Personalliggare risk handled in copy rules and a guard test.
- Comparison guide with disclosure and a dated title (`seo-competitor-pages` fairness rules).
- Launch links in a sensible order, including the awesome-selfhosted 4-month rule and Google Play as a SERP asset.
- Search Console Domain property by DNS, sitemap submit, request indexing, Bing import, IndexNow in the release
  checklist (cleanhq Step 2, `seo-technical` IndexNow).
- Cookieless analytics recommendation and the CSP note (cleanhq GTM lessons).
- Mobile LCP render delay from the hero fade, found and explained (`seo-technical` CWV).
- About page, privacy page, "Senast granskad", sources on legal guides (`seo-content` trust, partial E-E-A-T).
- app.klokka.se previews fixed while staying noindexed via header, not robots.txt block (correct nuance).

---

## 4. Summary table

| # | Gap | Source | Applies | Priority |
|---|---|---|---|---|
| G1 | Post-release SEO smoke check (prod index, staging noindex) | delhi-6 plan; cleanhq 3A; seo-drift | Yes, new risk from the P0 fix | P0 |
| G2 | Brand SERP check and disambiguation (Norwegian word, klokka.com) | cleanhq strategy s4, s6; seo-geo | Yes | P1 |
| G3 | Keyword cannibalization and SERP-overlap check | seo-cluster; nakshatra growth | Yes | P1 |
| G4 | Contextual internal links and link matrix, not footer only | nakshatra growth, deep research C4; seo-content | Yes | P1 |
| G5 | Native Swedish review; author, reviewer, Person schema on legal guides | cleanhq 1B, 3B, s8; seo-content; seo-geo | Yes | P1 |
| G6 | Swedish YouTube Short and demo, VideoObject | cleanhq s6, Step 4; seo-geo; own SERP data | Yes | P1 |
| G7 | Measurement loop (positions 5 to 20) and 90-day KPIs | nakshatra measurement-loop; cleanhq s7; seo-plan | Yes | P1 |
| G8 | GSC service account with Full permission | cleanhq s8, Step 2 | Yes | P1 |
| G9 | FAQ retired May 2026, drop HowTo | nakshatra B; cleanhq schema 4.5; seo-schema | Yes (correction) | P2 |
| G10 | Rich Results Test per template | nakshatra E2; cleanhq 3A | Yes | P2 |
| G11 | Image SEO on content pages, image-pack entry for the template | seo-meta-og pillar 3; seo-images | Yes | P2 |
| G12 | Uniqueness gate for industry and yearly pages | seo-programmatic; seo-sitemap | Partly covered | P2 |
| G13 | Refresh calendar and seasonality (Trends) | seo-geo; cleanhq s2; nakshatra | Yes | P2 |
| G14 | Conversion events and landing-page attribution across hosts | nakshatra GTM docs; cleanhq Step 2 | Yes | P2 |
| G15 | Free keyword sources (Keyword Planner, Bing, Trends) | nakshatra keywords; seo-google | Yes | P2 |
| G16 | SERP page-type check per remaining page | seo-sxo | Partly covered | P2 |
| G17 | LinkedIn page, sameAs, link from our own sites, case study | cleanhq Step 4, 5; seo-geo | Yes | P2 |
| G18 | Genuine reviews on Capterra.se / AlternativeTo | cleanhq Step 4; delhi-6 P2 | Yes (not GBP) | P2 |
| G19 | Security and data trust section | seo-plan SaaS; seo-content | Yes | P2 |
| G20 | Manual AI-visibility baseline | seo-geo | Yes | P3 |
| G21 | Backlink monitoring (GSC, Bing) | seo-backlinks | Yes | P3 |
| G22 | Wikidata item | seo-geo | Maybe | P3 |
| G23 | og:type article, times, per-page noindex flag | sawerashree seo.ts; nuxt-seo; seo-meta-og | Yes | P3 |
| G24 | Changelog page | seo-plan SaaS; solidtime | Yes | P3 |
| G25 | Content cadence and one data asset | cleanhq Phase 3; seo-content-brief | Yes | P3 |
| G26 | CWV field data and INP on the calculator | seo-technical; seo-google | Later | P3 |
| - | GBP, NAP, citations, local pages, LocalBusiness, Service+Offer prices | cleanhq, delhi-6, seo-local, seo-maps | No | - |

Source for the brand check in G2: WebSearch "klokka" (US index, 2026-09-29), results included
[Wiktionary: klokka](https://en.wiktionary.org/wiki/klokka), [Cambridge: klokka](https://dictionary.cambridge.org/dictionary/norwegian-english/klokka)
and [klokka.com](https://klokka.com/).
