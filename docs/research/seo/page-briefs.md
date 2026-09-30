# Klokka marketing site: page briefs (klokka.se, written 2026-09-29)

Inputs: `research-keywords.md` (section 5 keyword map), `research-competitors.md` (SERPs, PAA, proof URLs),
`docs/PRODUCT_BRIEF.md`, `apps/landing/src/lib/i18n/dictionaries.ts`, plus a read of the repo (contract, API config,
web and landing source) to check every product claim below. No DataForSEO calls were made for this document.

## 0. Rules every page follows

### 0.1 Product truth (checked against the repo, v1.0.2)

What Klokka does, and may be claimed anywhere:
- The employer logs the hours each employee worked, per day (one entry per employee per day, optional note). Fast
  paths: quick chips (0.5 / 1 / 2 / 4 / 8 / full day), "Samma som i går", a week grid for all employees.
- The employee sees their day / week / month, month total, average per working day, comparison with last month, a
  shareable month card. Push + in-app notification when hours are added, changed or removed, coalesced per sitting.
- The employee can flag an entry with a message; the employer fixes or dismisses; both are notified.
- Every change is kept in a history (who, what, when), visible to both roles.
- Month lock (and unlock), CSV export of any month, per employee or the whole business.
- Pay is optional: a per-business switch, off by default; hourly rate per employee; employees without a rate see hours only.
- Rounding rule (none, 0.25 h, 0.5 h) and a default day length.
- Several businesses per user, with a switcher. Opt-in weekly email digest (`DigestJob`, Mondays). Dark and light mode.
- Web app (any browser, including iPhone Safari) and an Android app installed as a signed APK from klokka.se.
- Swedish and English. Free to use. MIT licence (`LICENSE`, "Copyright (c) 2026 Prasannjeet Singh").
- No employee cap: the contract and `application.properties` have no member limit (grep found none).

What Klokka does NOT do, and no page may imply: employee self-logging, clock-in / stämpelklocka, GPS, scheduling
(schema), payroll or payroll integration (Fortnox, Visma), OB or overtime calculation, invoicing, SMS, web push,
iOS App Store app, Google Play listing (not today), personalliggare, project or customer time, account self-deletion
(there is no delete-me or delete-business operation in the contract; see the privacy brief).

### 0.2 The fact line (reuse verbatim or near-verbatim; AI Overviews quote it)

- sv: "Klokka är gratis att använda och har öppen källkod under MIT-licens. Det finns ingen gräns för antalet
  anställda, och Klokka fungerar på webben och i Android-appen, på svenska och engelska."
- en: "Klokka is free to use and open source under the MIT licence. There is no limit on the number of employees, and
  it works on the web and in the Android app, in Swedish and English."

Placement rule (decided): on product, tool, template and industry pages the fact line is inside the first two
sentences. On the four legal/rules guides (tidrapport, får arbetsgivaren ändra, personalliggare, arbetstidslagen) the
first two sentences answer the question neutrally, and the fact line sits in a small "Om Klokka" box right after the
first section. Reason: those SERPs reward a neutral definitional answer, and a product plug in sentence one reads as
an ad and weakens the citation. The comparison guide discloses "Klokka är vår egen app" in sentence two.

### 0.3 Copy rules
- No em dash anywhere (the existing `test/dictionaries.test.ts` check must cover the new page dictionaries).
- Never pricing, tiers, seats, "plan", "premium", "trial". "Gratis att använda" / "free to use", "öppen källkod" /
  "open source" are fine. "Obegränsat antal anställda" / "no limit on employees" is stated as a fact of today.
- "företag" / "business" for workspace, everywhere in user-facing copy.
- `personalliggare` never in the title or H1 of a product, tool or industry page. The café/restaurang and
  frisör/salong pages carry the line "Klokka ersätter inte en personalliggare" in the first screen, linked to
  Skatteverket and to the personalliggare guide.
- Android: say "Android-appen" and "hämtas direkt från klokka.se". Never "Google Play" or "App Store". iPhone:
  "använd webbappen i webbläsaren, samma funktioner".
- Guides: plain and neutral, no "du måste" in legal-advice tone; state the rule, cite the source (riksdagen.se for
  law text, av.se for arbetstidslagen supervision, skatteverket.se for personalliggare, forsakringskassan.se for
  sjuklön where relevant), and end legal sections with "Kolla ert kollektivavtal" where agreements can deviate.
  Each legal guide shows "Senast granskad: <datum>" and a one-line disclaimer ("Det här är en allmän genomgång, inte
  juridisk rådgivning.").
- Legal facts marked **[verify]** below are being checked separately; do not publish a guide until its [verify]
  items are resolved or cut.

### 0.4 SEO defaults
- Titles at most 60 characters, metas at most 155 (checked with a script, section 7). Social card eyebrow at most
  20 characters, card title at most ~45.
- Every page: self-canonical, reciprocal hreflang (sv-SE, en, x-default = sv) when both languages exist.
  Swedish-only pages (the yearly `arbetstid-per-manad/<år>` pages) carry sv-SE + x-default only.
- JSON-LD on every page: `WebPage` (or `Article`/`AboutPage`) with `isPartOf: #website` and `about: #app` (reference
  to the one `SoftwareApplication` `@id` from the home graph, never a second copy), plus `BreadcrumbList` on every
  page except the homepage. `FAQPage` wherever a visible FAQ exists (no Google rich result since 2023 outside gov and
  health, still useful to Bing and answer engines). `HowTo` only where the steps are real and visible (Google dropped
  HowTo rich results in 2023; kept for answer engines). No `Review`/`AggregateRating` anywhere (no genuine reviews).
- CTAs: primary "Skapa ditt företag" / "Create your business" (to `appUrl`), secondary depends on the page. The
  APK link is only a secondary CTA, on the app page and in FAQ answers.
- Word counts are visible body text in the target language, excluding nav, footer and tool UI labels.

## 1. Shared page architecture (files only)

One registry drives everything; pages never hand-list each other.

| Concern | File | What it holds / does |
|---|---|---|
| Page registry | `apps/landing/src/lib/pages/registry.ts` | Plain data, no imports from Next or React (so `next.config.ts` can import it): per page an `id`, `kind` (home, product, tool, template, guide, industry, about, legal), `path: { sv, en? }`, `parent` id (breadcrumbs), `footerGroup`, `llms` section, `lastmod` (ISO date), `jsonLd` flags (faq, howTo, article), `sitemapPriority`. |
| Registry helpers | `apps/landing/src/lib/pages/index.ts` | `pageById`, `pageByPath(locale, slug)`, `alternatesFor(id)`, `breadcrumbsFor(id, locale)`, `footerLinks(locale)`, `allStaticParams()`. |
| Page dictionaries | `apps/landing/src/lib/i18n/pages/<id>.ts` (one per page, e.g. `tidrapportering-app.ts`, `guide-tidrapport.ts`) | Same pattern as `dictionaries.ts`: `sv` `as const`, `en` typed through `Widen`, holding `meta` (title, description), `card` (eyebrow, title), `h1`, `intro`, sections, `faq`, `howTo`, `cta`. Swedish-only pages export `sv` only. |
| Page dictionary index | `apps/landing/src/lib/i18n/pages/index.ts` | `getPageDictionary(id, locale)`. |
| Shared chrome copy | `apps/landing/src/lib/i18n/dictionaries.ts` (existing) | Keeps nav, footer, a11y; gains `facts` (the fact line) and footer group titles for the new link columns. |
| Routing | `apps/landing/src/app/[lang]/[...slug]/page.tsx` | `generateStaticParams` from the registry, `dynamicParams = false`, resolves slug to page id per locale, renders the page component for its `kind`. Different slugs per language are handled by the registry, not by folder names. |
| Swedish at the root | `apps/landing/next.config.ts` (existing) | `rewrites().beforeFiles` gains one explicit entry per Swedish path from the registry (`/tidrapportering-app` to `/sv/tidrapportering-app`); the existing `/sv/:path*` 301 stays. |
| Page templates | `apps/landing/src/components/pages/{ProductPage,GuidePage,ToolPage,IndustryPage,LegalPage}.tsx` | Kind-level layout: hero with H1 + intro, section list, FAQ (reuses `sections/Faq.tsx`), CTA (reuses `sections/Cta.tsx`), breadcrumbs, "Senast granskad" on guides. |
| Tools | `apps/landing/src/components/tools/HoursCalculator.tsx` (client), `apps/landing/src/lib/tools/hours.ts`, `apps/landing/src/lib/tools/swedish-holidays.ts`, `apps/landing/src/lib/tools/work-month.ts` | Pure functions, unit tested; the holiday table is computed (Easter computus plus fixed and floating dates), never hand-typed per year. |
| Downloads | `apps/landing/src/app/downloads/[file]/route.ts` (`force-static`) + `apps/landing/src/lib/templates/{xlsx,pdf}.ts` | Timesheet xlsx and pdf built at build time, same pattern as `og.png/route.tsx`. Needs two new dependencies (an xlsx writer and a pdf writer); pick in implementation. |
| Metadata + JSON-LD | `apps/landing/src/lib/seo.ts` (existing) | `metadataFor(id, locale)` (canonical and hreflang from the registry, per-page OG image), `jsonLdFor(id, locale)` (WebSite + Organization + SoftwareApplication once, by `@id`; per page WebPage/Article/AboutPage, BreadcrumbList, FAQPage, HowTo, WebApplication for the calculator). |
| Sitemap | `apps/landing/src/app/sitemap.ts` (existing) | Iterates the registry; per entry `lastmod`, alternates including `x-default`. |
| llms.txt | `apps/landing/src/app/llms.txt/route.ts` (`force-static`) | Generated from the registry: the fact line, then one line per page grouped by `llms` section (Produkt, Verktyg, Guider, Om), each "- [title](url): meta description". English variant at `apps/landing/src/app/en/llms.txt/route.ts` or one bilingual file (pick one; bilingual single file is simpler). |
| Per-page OG card | `apps/landing/src/app/og/[file]/route.tsx` (`force-static`, `generateStaticParams` from the registry, file `<id>-<locale>.png`) + `apps/landing/src/lib/brand-image.tsx` (existing `socialCard(locale)` gains `{ eyebrow, title }`) | Card text comes from the page dictionary `card`. Existing `/og.png` and `/og-en.png` stay as the homepage cards. |
| Footer | `apps/landing/src/components/layout/SiteFooter.tsx` (existing) | Columns from `footerLinks(locale)`: Produkt, Verktyg och mallar, Guider, Om Klokka (Om, Integritet, GitHub, MIT-licens). Homepage anchors become `/#how` style links on subpages. |
| Guard test | `apps/landing/test/pages.test.ts` | Every registry entry has a dictionary per declared locale; title at most 60, meta at most 155, eyebrow at most 20, card title at most 45; no em dash; unique paths; hreflang pairs reciprocal; `personalliggare` absent from title and H1 of kinds product, tool, industry; café and salon dictionaries contain the "ersätter inte en personalliggare" line. |

## 2. Page index

| # | Page | sv URL | en URL | Prio |
|---|---|---|---|---|
| 1 | Homepage (rework) | `/` | `/en` | P1 |
| 2 | App | `/tidrapportering-app` | `/en/employee-hours-app` | P1 |
| 3 | Small business | `/tidrapportering-smaforetag` | `/en/small-business-time-tracking` | P1 |
| 4 | Open source | `/oppen-kallkod` | `/en/open-source` | P1 |
| 5 | Work hours calculator | `/rakna-arbetstimmar` | `/en/work-hours-calculator` | P1 |
| 6 | Timesheet template | `/tidrapport-mall` | `/en/timesheet-template` | P1 |
| 7 | Guide: tidrapport | `/guide/tidrapport` | `/en/guide/how-to-track-employee-hours` | P1 |
| 8 | Guide: får arbetsgivaren ändra | `/guide/far-arbetsgivaren-andra-tidrapport` | `/en/guide/can-an-employer-change-hours` | P1 |
| 9 | Arbetstid per månad (+ /2026, /2027) | `/arbetstid-per-manad` | `/en/working-hours-per-month-sweden` | P2 |
| 10 | Hourly employees | `/timanstallda` | `/en/hourly-employees` | P2 |
| 11 | Guide: best free apps | `/guide/basta-gratis-tidrapportering` | `/en/guide/best-free-timesheet-apps` | P2 |
| 12 | Guide: personalliggare | `/guide/personalliggare-eller-tidrapport` | `/en/guide/staff-register-sweden` | P2 |
| 13 | Guide: arbetstidslagen | `/guide/arbetstidslagen` | `/en/guide/swedish-working-hours-act` | P2 |
| 14 | Industry: café/restaurang | `/tidrapportering-cafe-restaurang` | `/en/cafes-restaurants` | P2 |
| 15 | Industry: städfirma | `/tidrapportering-stadfirma` | `/en/cleaning-companies` | P2 |
| 16 | Industry: frisör/salong | `/tidrapportering-frisor-salong` | `/en/salons` | P2 |
| 17 | Industry: butik | `/tidrapportering-butik` | `/en/shops` | P2 |
| 18 | About | `/om` | `/en/about` | P1 (needed for trust and E-E-A-T) |
| 19 | Privacy | `/integritet` | `/en/privacy` | P1 (does not exist today, see section 6) |

Breadcrumbs (decided): two levels, "Klokka > <sidan>", for every page, because no crumb may point at a URL that does
not exist. The only three-level trail is "Klokka > Arbetstid per månad > 2026". When a `/guide` or `/branscher` hub
is built later, set `parent` in the registry and the trails update everywhere.

## 3. P1 pages

### 3.1 Homepage (rework): `/` and `/en`

Keywords
- Primary sv: **gratis tidrapportering** (10/mo, but the weak SERP where Klokka can win page 1; AI Overview leads with
  the free option). Also carry **tidrapportering** (1 300) and **tidrapport** (1 000) in H1, headings and body.
- Secondary sv: tidrapportering gratis (70), tidrapportering anställda (110), tidrapport app gratis (10).
- Primary en: **free employee hours tracker** (unmeasured). Secondary en: hours tracker for employees, employee
  timesheet app free, time tracking for small business (unmeasured).

Title and meta (changed from 5.1 so the title leads with the target phrase; the sv meta today is 163 characters)
- Title sv: Gratis tidrapportering för småföretag | Klokka
- Meta sv: Gratis tidrapportering för småföretag: du loggar de anställdas timmar per dag och båda ser samma månad. Öppen källkod, webb och Android.
- Title en: Free employee hours tracker for small teams | Klokka
- Meta en: Log the hours each employee worked, day by day, and both of you see the same month. Free to use, open source, on the web and Android.

H1 (one `<h1>`, two visual lines; the slogan stays the big line)
- sv: "Gratis tidrapportering för småföretag. En klocka. För båda." (first sentence rendered small above the slogan)
- en: "Free employee hours tracker. One clock. Both sides."

First two sentences (replace `hero.lead`; keep the rotator line "Gjord för ..." after them)
- sv: "Klokka är gratis tidrapportering för småföretag: arbetsgivaren loggar timmarna varje anställd har jobbat, dag för
  dag, och båda ser samma månad. Klokka har öppen källkod under MIT-licens, ingen gräns för antalet anställda och
  fungerar på webben och i Android-appen, på svenska och engelska."
- en: "Klokka is a free employee hours tracker: the employer logs the hours each person worked, day by day, and both
  sides see the same month. It is open source under the MIT licence, has no limit on employees, and works on the web
  and in the Android app, in English and Swedish."

Section outline (existing sections stay; changes in bold)
- Hero: H1 + the two sentences above + CTAs. **Trust chips unchanged.**
- H2 "Så funkar tidrapporteringen" (was "Tre steg. Sen sköter det sig självt.", keep that as the sub-line): invite,
  log, both see.
- H2 "En hel vecka på en minut" (employers): unchanged copy; **add one sentence using "tidrapport"**: "Veckorutnätet
  är tidrapporten för hela personalen på en skärm."
- H2 "Dina timmar i mobilen" (employees): unchanged.
- H2 "Bara timmar. Eller timmar och lön." (pay): unchanged.
- H2 "Månaden, förklarad på en skärm." (insights): unchanged.
- H2 "Öppen källkod. Varenda rad.": unchanged, **add a link to `/oppen-kallkod`**.
- **New H2 "Vad Klokka inte gör"** (3 short lines): ingen stämpelklocka, inget schema, ingen lönekörning; Klokka
  ersätter inte en personalliggare. One line each, linking to the relevant guide. Honesty here is what makes the
  comparison guides credible and prevents a wrong-fit sign-up.
- H2 "Innan du frågar." (FAQ): add the questions below.
- **New H2 "Mer om tidrapportering"**: a compact link grid to the P1 pages (see internal links).
- CTA block: unchanged.

FAQ (add to the existing eight; answer direction)
- "Är Klokka ett tidrapporteringssystem?" Yes, for the employer who logs hours per day; not a clock-in or scheduling system.
- "Vilken gratis app för tidrapportering är bäst?" (PAA on 3 of 4 SERPs) Depends on who records time; one line per
  case, link to the comparison guide.
- "Är Klokka en stämpelklocka?" No; the employer logs afterwards; employees see and flag.
- "Ersätter Klokka en personalliggare?" No; link Skatteverket and the guide.
- "Finns Klokka för iPhone?" Use the web app in Safari, same features; no App Store app yet.
- en equivalents: "Is Klokka a timesheet app?", "What is the best free timesheet app?", "Is Klokka a time clock?",
  "Does Klokka replace a Swedish staff register (personalliggare)?", "Is there an iPhone app?"

Internal links (from "Mer om tidrapportering" and in-copy)
- `/tidrapportering-app` "Tidrapportering i appen" / `/en/employee-hours-app` "The employee hours app"
- `/tidrapportering-smaforetag` "Tidrapportering för småföretag" / "Time tracking for small businesses"
- `/rakna-arbetstimmar` "Räkna ut arbetstid" / "Work hours calculator"
- `/tidrapport-mall` "Gratis tidrapport mall" / "Free timesheet template"
- `/guide/tidrapport` "Så för du tidrapport" / "How to track employee hours"
- `/oppen-kallkod` "Öppen källkod" / "Open source" (from the open-source section)
- Once P2 exists: industry pages from the rotator words' section ("kaféet" to café page etc., as a plain link list
  below the rotator, not inside the animation).

CTA: primary "Skapa ditt företag" / "Create your business"; secondary "Se hur det funkar" (anchor).

JSON-LD: WebSite, Organization, SoftwareApplication (the one canonical `#app`, see research-technical P2-1:
`featureList`, `applicationSubCategory`, stable `url`), WebPage, FAQPage. No BreadcrumbList on the home page.

Social card: keep the current `/og.png` and `/og-en.png` artwork; update the text.
- Card eyebrow sv: Öppen källkod, MIT
- Card title sv: Gratis tidrapportering för småföretag
- Card eyebrow en: Open source, MIT
- Card title en: Free employee hours tracker

Word target: 1 200 to 1 500 (today about 1 000; the additions are the new H2s and FAQ items).

Verify before publishing
- The owner accepts "ingen gräns för antalet anställda" as a public statement (true in code today; it binds future
  hosted plans).
- `installUrl`/`downloadUrl` and the APK link point at a klokka.se URL, not the ooguy.com Nexus host (research-technical P1-3).

### 3.2 App page: `/tidrapportering-app` and `/en/employee-hours-app`

Keywords
- Primary sv: **tidrapportering app** (320, CPC 23.93, RD 1.6: the most beatable head term).
- Secondary sv: tidrapport app (70), tidrapport app gratis (10), arbetstid app (10), "vilken app kan jag använda för
  att registrera min arbetstid" (PAA).
- Primary en: **employee timesheet app free**. Secondary en: track employee hours app, hours tracker for employees.

Title and meta (5.2, unchanged)
- Title sv: Tidrapportering app för Android och webben | Klokka
- Meta sv: Klokkas app visar månadens timmar direkt i mobilen. Pushnotis när timmar ändras, flagga fel rad, mörkt läge. Gratis och öppen källkod.
- Title en: Employee timesheet app for Android and web | Klokka
- Meta en: See the month's hours on your phone. Push notifications when hours change, flag a wrong entry, dark mode. Free to use and open source.

H1
- sv: "Tidrapportering i en app, för både arbetsgivaren och de anställda"
- en: "The employee timesheet app both sides can see"

First two sentences
- sv: "Klokka är en app för tidrapportering där arbetsgivaren loggar timmarna och den anställda ser dem i mobilen direkt,
  med en pushnotis varje gång något ändras. Appen är gratis att använda, har öppen källkod under MIT-licens och ingen
  gräns för antalet anställda, och finns för Android och på webben, på svenska och engelska."
- en: "Klokka is a timesheet app where the employer logs the hours and the employee sees them on their phone straight
  away, with a push notification every time something changes. It is free to use, open source under the MIT licence
  with no limit on employees, and runs on Android and the web, in English and Swedish."

Section outline
- H2 "Det här gör appen för arbetsgivaren": week grid, quick chips, "Samma som i går", note per entry, lock the
  month, CSV export. Screenshot of the week grid (real app, both themes).
- H2 "Det här ser den anställda": month calendar, total, average per working day, comparison with last month, the
  shareable month card.
- H2 "En notis per tillfälle, inte fem": how coalescing works, with the "Nora lade till 5 dagar, 22,5 h" example.
- H2 "Flagga en rad som är fel": the flag loop, both sides notified, history shows the outcome.
- H2 "Android, webben och iPhone": Android app as a signed APK from klokka.se (why not a store, one line; Android asks
  once to allow the install); the web app in any browser with the same features; iPhone users use the web app,
  there is no App Store app yet.
- H2 "Installera appen" (3 real steps): hämta APK:n, tillåt installationen, logga in eller öppna inbjudan.
- H2 "Vad appen inte gör": no clock-in, no GPS, no scheduling, no payroll; link the comparison guide for tools that do.

FAQ
- "Vilken app kan jag använda för att registrera min arbetstid?" (PAA x2) If the employer logs: Klokka. If you want to
  log your own time: Klokka does not do that in v1; link comparison guide.
- "Vilken gratis app för tidrapportering är bäst?" (PAA) Short answer by use case, link the guide.
- "Finns appen för iPhone?" Web app in Safari, same features.
- "Varför hämtar jag appen från klokka.se?" Signed APK from us; the store listing question is open (verify).
- "Kan de anställda stämpla in?" No.
- en: "Which app can I use to record my working hours?", "What is the best free timesheet app?", "Is there an iPhone
  app?", "Why do I download the app from klokka.se?", "Can employees clock in?"

Internal links
- `/tidrapportering-smaforetag` "tidrapportering för småföretag" / "time tracking for small businesses"
- `/timanstallda` "tidrapport för timanställda" / "hours tracking for hourly employees" (once P2 is live)
- `/guide/basta-gratis-tidrapportering` "jämförelse av gratis appar" / "free timesheet apps compared" (once live)
- `/guide/far-arbetsgivaren-andra-tidrapport` from the flag section: "får arbetsgivaren ändra tidrapporten?"
- `/` from breadcrumb and logo.

CTA: primary "Skapa ditt företag"; secondary "Hämta Android-appen" (APK link, with the existing `apk.note`).

JSON-LD: WebPage (`about: #app`), BreadcrumbList, FAQPage. HowTo for "Installera appen" is optional (steps are real);
recommended to skip, since the steps involve an OS permission dialog that varies by phone.

Social card
- Card eyebrow sv: Android och webb
- Card title sv: Tidrapportering i mobilen
- Card eyebrow en: Android and web
- Card title en: The employee timesheet app

Word target: 900 to 1 100.

Verify before publishing
- Whether a Google Play listing is planned (research-competitors 5 #2 recommends it); the FAQ answer changes if so.
- Real screenshots (not the landing mockups) for both apps, both themes.

### 3.3 Small business: `/tidrapportering-smaforetag` and `/en/small-business-time-tracking`

Keywords
- Primary sv: **tidrapportering anställda** (110, CPC 16.65).
- Secondary sv: tidrapporteringssystem (210), tidrapportering småföretag (SERP of young blog guides, very open),
  tidrapportering företag (20), tidrapportering personal (10).
- Primary en: **time tracking for small business**. Secondary en: log employee hours, track employee hours.

Title and meta (5.3, unchanged)
- Title sv: Tidrapportering för anställda i småföretag | Klokka
- Meta sv: För dig med några få anställda: fyll i veckan på en minut, lås månaden och exportera till CSV. Alla ändringar sparas i historiken.
- Title en: Time tracking for small businesses with hourly staff
- Meta en: For employers with a handful of staff: fill in the week in a minute, lock the month and export to CSV. Every change is kept in the history.

H1
- sv: "Tidrapportering för småföretag med några få anställda"
- en: "Time tracking for small businesses with hourly staff"

First two sentences
- sv: "Klokka är ett gratis tidrapporteringssystem för småföretag: du som arbetsgivare loggar varje anställds timmar per
  dag, och de anställda ser samma siffror i mobilen. Det har öppen källkod under MIT-licens, ingen gräns för antalet
  anställda och fungerar på webben och i Android-appen, på svenska och engelska."
- en: "Klokka is free time tracking for small businesses: you, the employer, log each employee's hours per day, and
  your staff see the same numbers on their phones. It is open source under the MIT licence, has no limit on
  employees, and works on the web and in the Android app, in English and Swedish."

Section outline
- H2 "Kalkylark eller system?": what a spreadsheet does not do (the employee cannot see it live, no history, no
  flags, no notification). Neutral: a sheet works for some; link the template page.
- H2 "Så ser en månad ut": worked example, four people, one month: log in the grid, one flag resolved, lock, CSV.
  Use real app screenshots.
- H2 "Du för in timmarna, de ser dem": why employer-logged fits a small place where the owner knows who worked;
  honest that employees cannot self-log in v1.
- H2 "Lås månaden och lämna över till lönen": CSV export, what the file contains (columns), who uses it
  (redovisningsbyrå, löneprogram). No integration claims.
- H2 "Lön på eller av": the switch, rates per person.
- H2 "Flera företag, en inloggning": owners with two businesses, staff with two employers.
- H2 "Vad Klokka inte gör": schema, stämpelklocka, lönekörning, personalliggare.
- H2 "Kom igång på fem minuter": create business, invite, log the first day.

FAQ
- "Måste man tidrapportera varje vecka?" (PAA) Direction: the law does not set a weekly reporting interval for the
  employee; the employer must keep records of certain hours [verify]; many agreements and employers use weekly or
  monthly routines; Klokka is per day, reviewed per week, closed per month.
- "Hur rapporterar jag arbetstid?" (PAA) Direction: in Klokka the employer does it per day; link the guide.
- "Kan jag skicka timmarna till Fortnox eller Visma?" Direction: via CSV export; no direct integration.
- "Hur många anställda kan jag lägga till?" No limit.
- "Är det verkligen gratis?" Yes, free to use, no card; MIT so you can also run it yourself.
- en: "Do I need to report hours every week?", "How do I record working hours?", "Can I send the hours to my payroll
  software?", "How many employees can I add?", "Is it really free?"

Internal links
- `/tidrapport-mall` "gratis tidrapport mall" / "free timesheet template" (from the spreadsheet section)
- `/guide/tidrapport` "vad en tidrapport ska innehålla" / "what an hours record should contain"
- `/timanstallda` "timanställda" / "hourly employees" (P2)
- Industry pages (P2) as a "För din bransch" row: café, städfirma, frisör, butik.
- `/tidrapportering-app` "appen" / "the app".

CTA: primary "Skapa ditt företag"; secondary "Se hur appen funkar" to `/tidrapportering-app`.

JSON-LD: WebPage (`about: #app`), BreadcrumbList, FAQPage. HowTo for "Kom igång på fem minuter" (3 real steps) is
acceptable; recommended.

Social card
- Card eyebrow sv: För småföretag
- Card title sv: En hel vecka på en minut
- Card eyebrow en: For small businesses
- Card title en: Log a week in a minute

Word target: 1 100 to 1 300.

Verify before publishing
- The "Måste man tidrapportera varje vecka?" answer (legal part, see the arbetstidslagen items).
- The CSV column list against `exportMonthCsv` output.

### 3.4 Open source: `/oppen-kallkod` and `/en/open-source`

The strongest English page. Write the English first, then the Swedish (not a translation: the Swedish reader is an
employer who cares about "gratis" and "min data", the English reader is often a self-hoster or developer).

Keywords
- Primary sv: **öppen källkod tidrapport** (n/a). Secondary sv: tidrapportering gratis (70), gratis tidrapportering (10).
- Primary en: **open source time tracking**. Secondary en: self-hosted time tracking, open source timesheet software,
  open source clockify alternative, self hosted clockify alternative (autocomplete [AC]).

Title and meta (5.5, unchanged)
- Title sv: Tidrapportering med öppen källkod (MIT) | Klokka
- Meta sv: Klokka är öppen källkod under MIT-licens. Använd vår tjänst gratis eller kör hela Klokka på din egen server. Koden finns på GitHub.
- Title en: Open source, self-hosted time tracking (MIT) | Klokka
- Meta en: Klokka is MIT licensed. Use the hosted service for free or run all of Klokka on your own server. The code is on GitHub.

H1
- sv: "Tidrapportering med öppen källkod, under MIT-licens"
- en: "Open source time tracking for employers of hourly staff"

First two sentences
- en: "Klokka is open source time tracking under the MIT licence, built for employers who log the hours their hourly
  staff worked, with each employee seeing the same month. The hosted service is free to use with no limit on
  employees, and it runs on the web and Android, in English and Swedish."
- sv: "Klokka är tidrapportering med öppen källkod under MIT-licens: arbetsgivaren loggar de anställdas timmar och
  båda ser samma månad. Tjänsten vi driftar är gratis att använda, utan gräns för antalet anställda, på webben och i
  Android-appen, på svenska och engelska."

Section outline
- H2 "What MIT means here" / "Vad MIT-licensen betyder": use, change, run commercially, keep the copyright notice.
  Link `LICENSE`.
- H2 "The same code as the hosted service" / "Samma kod som tjänsten": no closed core, no paid-only features in the
  code (state only what is true of the repo today).
- H2 "What is in the repository" / "Vad som finns i repot": Java 25 + Quarkus API, Next.js web app, Expo Android app,
  one OpenAPI contract that generates server and client, PostgreSQL, Logto for sign-in, Dockerfiles for the API,
  web and landing. English page may add a small architecture diagram.
- H2 "Run it yourself" / "Kör Klokka själv": what a self-hosted install needs (API, web app, PostgreSQL 18, a Logto
  instance, an SMTP account for invitations; push notifications need an Expo project and Firebase). Link to the
  self-hosting guide. **Gate: until that guide exists this section says "Instruktioner kommer" and the page does not
  promise a quick install.**
- H2 "How Klokka differs from other open source time trackers" (en) / "Andra verktyg med öppen källkod" (sv): Kimai,
  solidtime and Traggo are timer and project tools for people tracking their own time; Klokka is for an employer
  recording hourly staff, who then see it. Factual, no ranking. Licences: Kimai AGPL-3.0, solidtime AGPL-3.0, Traggo
  GPL-3.0 (verified via GitHub API in research-competitors 2.2), Klokka MIT.
- H2 "Contribute" / "Bidra": issues are the roadmap, pull requests welcome, translations (link `CONTRIBUTING.md`,
  `SECURITY.md`).
- H2 "Your data" / "Din data": CSV export of any month; self-hosting keeps everything on your server.

FAQ
- "Can I use Klokka commercially?" / "Får jag använda Klokka i mitt företag eller sälja det vidare?" Yes, MIT.
- "Do I need my own server?" / "Behöver jag en egen server?" No, the hosted service is free to use.
- "What do I need to self-host Klokka?" / "Vad behövs för att köra Klokka själv?" The component list above.
- "Is there a Docker image?" / "Finns det Docker-images?" Dockerfiles are in the repo; public images only if published (verify).
- "How is Klokka different from Kimai or solidtime?" / "Hur skiljer sig Klokka från Kimai?" Who records the time.

Internal links
- `/` "Klokka" (breadcrumb) and "så funkar Klokka" / "how Klokka works"
- `/guide/basta-gratis-tidrapportering` "gratis appar jämförda" / `/en/guide/best-free-timesheet-apps` "free
  timesheet apps compared" (P2)
- `/integritet` "var din data finns" / `/en/privacy` "where your data lives"
- `/om` "om Klokka" / "about Klokka"
- External: GitHub repo, LICENSE, CONTRIBUTING, issues.

CTA: primary "Skapa ditt företag" / "Create your business"; secondary "Se koden på GitHub" / "View the code on GitHub".

JSON-LD: WebPage (`about: #app`), BreadcrumbList, FAQPage, plus a `SoftwareSourceCode` node (`codeRepository` =
repo URL, `license`, `programmingLanguage` ["Java", "TypeScript"], `targetProduct: #app`).

Social card
- Card eyebrow sv: MIT-licens
- Card title sv: Öppen källkod. Varenda rad.
- Card eyebrow en: MIT licence
- Card title en: Open source time tracking

Word target: 1 000 to 1 300 (en), 800 to 1 000 (sv).

Verify before publishing
- Self-hosting guide exists (README today documents local development only; `docker-compose.yml` is the dev stack).
- Whether container images are publicly pullable. Today they go to the private Nexus registry, so the homepage line
  "allt i samma repo, med Docker" means Dockerfiles, not images. Word the FAQ accordingly.
- GitHub repo hygiene (topics, homepage field) before this page is promoted (research-competitors 5 #1).

### 3.5 Tool: work hours calculator: `/rakna-arbetstimmar` and `/en/work-hours-calculator`

Keywords
- Primary sv: **räkna ut arbetstid** (390). Secondary sv: räkna timmar (590), timräknare (590), räkna arbetstimmar
  (210), "hur räknar man ut arbetade timmar" [AC], "vilken app kan jag använda för att räkna tid" (PAA).
- Primary en: **work hours calculator monthly**. Secondary en: how to calculate hours worked (with lunch break, in
  decimals, per month) [AC].

Title and meta (5.7, unchanged)
- Title sv: Räkna ut arbetstid: gratis timräknare | Klokka
- Meta sv: Räkna ut arbetstid och timmar på sekunder. Ange start, slut och rast per dag, så summerar vi veckan och månaden. Gratis, inget konto.
- Title en: Work hours calculator: daily, weekly, monthly | Klokka
- Meta en: Work out hours worked from start, end and break times. See the week and month total instantly. Free, no account needed.

H1
- sv: "Räkna ut arbetstid och timmar"
- en: "Work hours calculator"

First two sentences (above the tool, short)
- sv: "Räkna ut arbetstiden per dag, vecka eller månad: ange start, slut och rast så får du timmarna direkt, både i
  timmar och minuter och som decimaltal. Verktyget är gratis och kräver inget konto; vill du spara timmarna och låta
  de anställda se dem gör Klokka det: gratis, öppen källkod (MIT), obegränsat antal anställda, på webben och i
  Android-appen, på svenska och engelska."
- en: "Work out hours worked per day, week or month: enter start, end and break and get the total straight away, in
  hours and minutes and as a decimal. The calculator is free with no account; to keep the hours and let your staff
  see them, Klokka does that: free to use, open source (MIT), no limit on employees, on the web and Android, in
  English and Swedish."

Tool spec (client component, all maths in `lib/tools/hours.ts`, unit tested)
- Mode 1 "Mellan två klockslag": start and end time, optional break in minutes; handles shifts past midnight.
  Satisfies the generic "räkna timmar" intent.
- Mode 2 "Vecka / månad": rows per day (date or weekday label, start, end, break, note); add row; totals per week and
  for all rows; results as h:mm and decimal (7:45 = 7,75).
- Optional "Timlön" field: shows gross amount for the total (no tax, no OB, no holiday pay; say so under the field).
- Optional rounding: none, 0,25 h, 0,5 h (same rule set as Klokka).
- Nothing leaves the browser; state may persist in `localStorage` wrapped in try/catch (per-visitor convenience only).
- Accessible: real labels, keyboard entry, `inputmode="numeric"`, results in an `aria-live="polite"` region.
- Output actions: "Kopiera som tabell" (tab-separated, pastes into Excel), print stylesheet.

Section outline (below the tool)
- H2 "Så räknar du ut arbetstid för hand": slut minus start minus rast, one worked example (08:30 to 17:00, 45 min
  rast = 7 h 45 min = 7,75 h).
- H2 "Timmar och minuter som decimaltal": small conversion table (15 min = 0,25, 30 = 0,5, 45 = 0,75, 20 = 0,33,
  40 = 0,67, 50 = 0,83).
- H2 "Arbetspass över midnatt": how the tool handles it; one example.
- H2 "Räknas rasten som arbetstid?": rast versus paus under arbetstidslagen, one paragraph, link the ATL guide [verify].
- H2 "Hur många timmar har en månad?": link the arbetstid per månad page (P2).
- H2 "Spara timmarna i stället": what Klokka adds (the employee sees them, history, month lock). CTA.

FAQ
- "Hur räknar man ut arbetade timmar?" [AC] Formula in one line.
- "Vilken app kan jag använda för att räkna tid?" (PAA) This calculator for one-off sums; Klokka for keeping them.
- "Hur skriver man 7 timmar och 45 minuter som decimaltal?" 7,75.
- "Räknas rasten som arbetstid?" Direction: rast no, paus yes [verify].
- "Hur räknar jag ett nattpass?" End time is the next day; the tool does it.
- en: "How do I calculate hours worked?", "How do I calculate hours with a lunch break?", "How do I convert minutes to
  decimal hours?", "Is a break counted as working time in Sweden?", "How do I calculate a night shift?"

Internal links
- `/tidrapport-mall` "tidrapport mall i Excel" / "timesheet template in Excel"
- `/arbetstid-per-manad` "arbetstid per månad" / `/en/working-hours-per-month-sweden` (P2)
- `/guide/arbetstidslagen` "rast och paus i arbetstidslagen" (P2)
- `/tidrapportering-smaforetag` "tidrapportering för småföretag" (from the CTA section)

CTA: primary "Spara timmarna i Klokka" / "Keep the hours in Klokka" (to sign-up); secondary "Ladda ner tidrapport mall".

JSON-LD: WebPage, `WebApplication` for the calculator (`applicationCategory: UtilitiesApplication`,
`isAccessibleForFree`, `browserRequirements`), HowTo for "Så räknar du ut arbetstid för hand" (3 real steps),
FAQPage, BreadcrumbList. `mentions: #app`.

Social card
- Card eyebrow sv: Gratis verktyg
- Card title sv: Räkna ut arbetstid
- Card eyebrow en: Free tool
- Card title en: Work hours calculator

Word target: 700 to 900 below the tool.

Verify before publishing
- Rast and paus definitions (arbetstidslagen 15 and 16 §§) [verify].

### 3.6 Template: `/tidrapport-mall` and `/en/timesheet-template`

Keywords
- Primary sv: **tidrapport mall** (260, RD 0.3; same demand as timrapport mall).
- Secondary sv: tidrapport excel (50, RD 0.1), tidrapport mall excel (30), timrapport (210), timlista mall (10,
  use the word once in body, never as a target), "tidrapport mall pdf gratis" [AC].
- Primary en: **timesheet template** (very hard in English; secondary page). Secondary en: employee hours tracker
  excel template, free monthly timesheet template.

Title and meta (5.9 sv unchanged; en title shortened to leave the brand in)
- Title sv: Tidrapport mall: gratis i Excel och PDF | Klokka
- Meta sv: Ladda ner en gratis tidrapport mall för månaden i Excel eller PDF. Fyll i timmar per dag och få summan direkt. Ingen registrering.
- Title en: Free monthly timesheet template, Excel and PDF | Klokka
- Meta en: Download a free monthly timesheet template in Excel or PDF. Fill in hours per day and get the total automatically. No sign-up.

H1
- sv: "Tidrapport mall för en månad, gratis i Excel och PDF"
- en: "Free monthly timesheet template in Excel and PDF"

First two sentences
- sv: "Ladda ner en gratis tidrapport mall för en hel månad, i Excel eller som PDF att skriva ut, utan registrering. Mallen
  kommer från Klokka, en gratis app med öppen källkod (MIT) där arbetsgivaren loggar timmarna och de anställda ser
  samma månad, utan gräns för antalet anställda, på webben och Android, på svenska och engelska."
- en: "Download a free timesheet template for a whole month, in Excel or as a printable PDF, with no sign-up. It comes
  from Klokka, a free and open source (MIT) app where the employer logs the hours and each employee sees the same
  month, with no limit on employees, on the web and Android, in English and Swedish."

Downloads (built at build time by `app/downloads/[file]/route.ts`, one set per language)
- sv: `tidrapport-mall-manad.xlsx`, `tidrapport-mall-manad.pdf`; en: `timesheet-template-monthly.xlsx`,
  `timesheet-template-monthly.pdf`.
- xlsx: header cells (Företag, Anställd, Månad, År); 31 rows (Datum, Veckodag, Start, Slut, Rast (min), Timmar,
  Anteckning); dates and weekday names computed from the Månad/År cells by formula (rows past the month's last day
  stay blank); Timmar = (Slut minus Start) minus Rast, handles past-midnight; month total; signature lines
  (Arbetsgivare, Anställd). No macros. Print area set to one A4 page.
- pdf: the same layout, blank dates (1 to 31), A4 portrait, one page.
- A preview image of the sheet on the page (static PNG from the same generator, with `alt`).

Section outline
- Download block: two buttons (Excel, PDF), file size and format in the label, preview image.
- H2 "Vad mallen innehåller": the columns and why each exists.
- H2 "Så fyller du i tidrapporten" (real steps: fill header, one row per worked day, start/end/rast, check the total,
  both sign, save).
- H2 "Räkna timmar med rast": short, link the calculator.
- H2 "Hur länge ska tidrapporten sparas?": one paragraph, link the tidrapport guide (which carries the [verify] rules).
- H2 "När mallen inte räcker": a paper or Excel sheet is only as current as the last time someone opened it; the
  employee cannot see it; no history. What Klokka does instead. CTA.

FAQ
- "Finns det en gratis tidrapport mall i Excel?" Yes, this one.
- "Fungerar mallen i Google Kalkylark och Numbers?" Direction: yes if formulas are checked there [verify].
- "Ska man skriva tidrapport eller tidsrapport?" (PAA) Both occur; "tidrapport" is the more common form in
  employer use; do not claim a dictionary ruling unless checked [verify with SAOL/ISOF].
- "Vad ska en tidrapport innehålla?" Short list, link the guide.
- "Behöver både arbetsgivaren och den anställda skriva under?" Common practice, not a general legal requirement;
  check your collective agreement [verify].
- en: "Is there a free timesheet template for Excel?", "Does it work in Google Sheets?", "What should a timesheet
  include?", "Do both employer and employee need to sign?"

Internal links
- `/rakna-arbetstimmar` "räkna ut arbetstid" / "work hours calculator"
- `/guide/tidrapport` "vad en tidrapport ska innehålla" / "how to track employee hours"
- `/tidrapportering-smaforetag` "tidrapportering för småföretag" (from "När mallen inte räcker")
- `/arbetstid-per-manad` "arbetstid per månad" (P2)

CTA: primary "Ladda ner Excel" / "Download Excel" (the page's own conversion); second block "Slipp mallen: skapa ditt
företag i Klokka" / "Skip the sheet: create your business in Klokka".

JSON-LD: WebPage with `hasPart` two `DigitalDocument` nodes (name, `encodingFormat`, `url`), HowTo (filling steps),
FAQPage, BreadcrumbList.

Social card
- Card eyebrow sv: Gratis mall
- Card title sv: Tidrapport mall i Excel och PDF
- Card eyebrow en: Free template
- Card title en: Monthly timesheet template

Word target: 700 to 900.

Verify before publishing
- The xlsx opens with working formulas in Excel (sv and en locale), LibreOffice and Google Sheets.
- The spelling FAQ and the signature FAQ [verify].

### 3.7 Guide: tidrapport: `/guide/tidrapport` and `/en/guide/how-to-track-employee-hours`

Keywords
- Primary sv: **tidrapport** (1 000, KD 2, informational). Secondary sv: "hur för man tidrapport", timrapport (210),
  arbetstidsrapport (10), "vad innebär tidrapportering" (PAA), "hur rapporterar jag arbetstid" (PAA), "måste man
  tidrapportera varje vecka" (PAA).
- Primary en: **log employee hours** / how to track employee hours. Secondary en: best way to track employee hours,
  how to track employee hours for free [AC].

Title and meta (5.12, unchanged)
- Title sv: Tidrapport: vad den ska innehålla och hur du för den
- Meta sv: Allt en arbetsgivare behöver veta om tidrapporten: vad den ska innehålla, hur länge den sparas och hur du gör det enkelt varje månad.
- Title en: How to track employee hours: a practical guide
- Meta en: What an employee hours record should contain, how long to keep it, and a simple routine that makes month end painless.

H1
- sv: "Tidrapport: vad den ska innehålla och hur du för den"
- en: "How to track employee hours"

First two sentences (neutral; fact line goes in the "Om Klokka" box after the first section)
- sv: "En tidrapport är en sammanställning av hur många timmar en anställd har arbetat, dag för dag, och den är
  underlaget för lönen när lönen beror på arbetad tid. Den här guiden går igenom vad en tidrapport brukar innehålla,
  vad arbetstidslagen kräver att arbetsgivaren antecknar och en enkel rutin för månadsslutet."
- en: "An hours record, or timesheet, lists how many hours an employee worked, day by day, and it is the basis for pay
  whenever pay depends on time worked. This guide covers what a timesheet usually contains, what Swedish law asks an
  employer to record, and a simple month-end routine."

Section outline
- H2 "Vad är en tidrapport?": one-sentence definition (citable), tidrapport versus tidsrapport, who uses it.
- Box "Om Klokka": the fact line, one sentence on what Klokka does, link to the homepage.
- H2 "Vad en tidrapport ska innehålla": datum, start och slut eller antal timmar, rast, övertid och mertid för sig,
  jour och beredskap om det förekommer, frånvaro, anteckning, godkännande.
- H2 "Vad lagen kräver av arbetsgivaren": arbetstidslagen: anteckningar om jourtid, övertid och mertid; the
  employee's right to see them [verify section numbers]; the 2019 EU Court ruling on recording daily working time
  (C-55/18) and its status in Sweden [verify]. Link riksdagen.se and av.se.
- H2 "Hur länge ska tidrapporten sparas?": ATL records [verify period]; if the timesheet is underlag for bookkeeping,
  bokföringslagen's archive rule [verify]. Neutral wording.
- H2 "Måste man tidrapportera varje vecka?" (PAA): no fixed legal interval for the report itself; routines vary; per
  day logging and monthly closing is common [verify the legal half].
- H2 "Fyra sätt att föra tidrapport": papper eller Excel-mall, stämpelklocka, app där den anställda rapporterar, app där
  arbetsgivaren loggar. Two neutral lines of fit per option. Klokka is named only in the fourth.
- H2 "En enkel rutin för månadsslutet" (HowTo, 5 real steps): för in dag för dag eller vecka för vecka; låt den anställda
  se timmarna; reda ut invändningar; lås månaden; skicka underlaget till lönen och spara det.
- H2 "Tidrapport för timanställda": short, link `/timanstallda` (P2).

FAQ
- "Vad innebär tidrapportering?" (PAA) Definition.
- "Hur rapporterar jag arbetstid?" (PAA) Depends on the employer's system; the common options.
- "Måste man tidrapportera varje vecka?" (PAA) As above.
- "Ska man skriva tidrapport eller tidsrapport?" (PAA) Both occur [verify].
- "Hur länge ska tidrapporter sparas?" As above [verify].
- "Vad händer om man inte tidrapporterar?" Direction: pay can be delayed or disputed; for the employer, missing ATL
  records can lead to supervision by Arbetsmiljöverket [verify].
- en: "What is a timesheet?", "How do I record working hours?", "Do hours have to be reported every week?", "How long
  should timesheets be kept in Sweden?", "What happens if hours are not recorded?"

Internal links
- `/tidrapport-mall` "gratis tidrapport mall" / "free timesheet template"
- `/rakna-arbetstimmar` "räkna ut arbetstid" / "work hours calculator"
- `/guide/far-arbetsgivaren-andra-tidrapport` "får arbetsgivaren ändra tidrapporten?" / "can an employer change the hours?"
- `/guide/arbetstidslagen` "arbetstidslagen för arbetsgivare" (P2)
- `/guide/personalliggare-eller-tidrapport` "personalliggare eller tidrapport" (P2)
- `/tidrapportering-smaforetag` from the "Fyra sätt" section, anchor "app där arbetsgivaren loggar".

CTA: end block "Prova Klokka för nästa månad" / "Try Klokka for next month" (sign-up); inline link to the template.

JSON-LD: Article (`headline`, `datePublished`, `dateModified`, `author` Organization, `inLanguage`, `about: #app` only
as `mentions`, not `about`), HowTo (month-end routine), FAQPage, BreadcrumbList.

Social card
- Card eyebrow sv: Guide
- Card title sv: Så för du tidrapport
- Card eyebrow en: Guide
- Card title en: How to track employee hours

Word target: 1 600 to 2 000.

Verify before publishing
- Arbetstidslagen: which hours the employer must record, the employee's right to see records, retention [verify].
- Status in Swedish law of the EU Court ruling C-55/18 (CCOO, 2019) on recording daily working time [verify].
- Bokföringslagen archive period applying to timesheets as lönunderlag [verify].
- "Vad händer om man inte tidrapporterar" direction [verify].

### 3.8 Guide: får arbetsgivaren ändra tidrapport: `/guide/far-arbetsgivaren-andra-tidrapport` and `/en/guide/can-an-employer-change-hours`

The best product fit of any guide (research-competitors 6 #5): Klokka's history, notification and flag loop is a
concrete answer to "how do we keep changes fair". Audience is both sides: employees searching after a surprise, and
employers wanting to do it right.

Keywords
- Primary sv: **får arbetsgivaren ändra tidrapport** [AC; nuba.se ranks a dedicated post]. Volume unmeasured.
- Secondary sv: arbetsgivaren ändrar mina timmar, ändra i tidrapport, fel i tidrapporten, fel lön timmar.
- Primary en: **can an employer change your timesheet** (unmeasured; English audience is expats in Sweden, so the
  page says "in Sweden" throughout).

Title and meta (new; not in the keyword file)
- Title sv: Får arbetsgivaren ändra tidrapporten? Så fungerar det
- Meta sv: Får arbetsgivaren ändra i din tidrapport? Vad som gäller, vad du kan göra om du inte håller med och hur ändringar görs öppet för båda.
- Title en: Can an employer change your timesheet in Sweden?
- Meta en: Can your employer change the hours on your timesheet? What applies in Sweden, what to do if you disagree, and how to keep every change visible.

H1
- sv: "Får arbetsgivaren ändra i tidrapporten?"
- en: "Can an employer change the hours on your timesheet?"

First two sentences (neutral, answer first)
- sv: "Arbetsgivaren ansvarar för att arbetstiden registreras och kan rätta en tidrapport som är fel, men lönen ska
  motsvara den tid du faktiskt har arbetat enligt ditt anställningsavtal och eventuellt kollektivavtal [verify].
  Ändras dina timmar utan att du håller med ska ändringen gå att förklara, och du har rätt att invända och vid behov
  kräva lön för tid som strukits [verify]."
- en: "In Sweden the employer is responsible for recording working time and may correct a timesheet that is wrong, but
  pay must match the time you actually worked under your employment contract and any collective agreement [verify].
  If your hours are changed and you disagree, the change should be explainable, and you can object and, if needed,
  claim pay for hours that were removed [verify]."

Section outline
- H2 "Kort svar": the two sentences as a boxed summary.
- H2 "Vem ansvarar för tidrapporten?": employer's recording duty under arbetstidslagen; the employee's right to see
  the records [verify]. Link riksdagen.se.
- Box "Om Klokka": fact line.
- H2 "När en ändring är rimlig": wrong day, double entry, an agreed break not deducted, a typo. Neutral examples.
- H2 "När du bör reagera": hours removed without explanation, breaks deducted that were not taken, repeated
  rounding down. Describe as situations to raise, no accusation language, no legal conclusions.
- H2 "Om du inte håller med": steps: keep your own notes (dates, times), ask for an explanation in writing, contact
  your union if you are a member, otherwise the options for a wage claim [verify: preskription and agreement
  deadlines]. Link to official or union-neutral sources only.
- H2 "Så blir ändringar rättvisa för båda": a change log with who and when, the employee told at once, a way to object
  on the entry, a month that is locked when both agree. Here Klokka is described factually as one way (history on
  every entry, notification on every change, flags, month lock).
- H2 "För arbetsgivaren: en rutin som undviker tvister": 4 short points.

FAQ
- "Får arbetsgivaren ändra tidrapporten utan att säga till?" Direction: nothing forbids correcting a record as such;
  pay must still match time worked; good practice is to inform [verify].
- "Får chefen dra av rast som jag inte tog?" Direction: rast that was not taken is working time; raise it [verify].
- "Hur länge kan jag kräva lön för timmar som strukits?" Direction: general preskription and shorter deadlines in
  collective agreements [verify, cite preskriptionslagen on riksdagen.se].
- "Vem kan hjälpa mig?" Union; without one, the routes for a civil claim [verify].
- "Kan en anställd ändra timmarna i Klokka?" No; the employee flags, the employer fixes or dismisses, and the history
  keeps both.
- en: same five, "in Sweden".

Internal links
- `/guide/tidrapport` "vad en tidrapport ska innehålla" / "what a timesheet should contain"
- `/guide/arbetstidslagen` "arbetstidslagen" (P2)
- `/timanstallda` "tidrapport för timanställda" (P2)
- `/tidrapportering-app` "flagga en rad i appen" / "flag an entry in the app"

CTA: "Visa timmarna för båda, från början" / "Show both sides the hours from day one" (sign-up); secondary link to
the app page.

JSON-LD: Article, FAQPage, BreadcrumbList. No HowTo (the "om du inte håller med" steps are advice, keep them out of
structured data).

Social card
- Card eyebrow sv: Guide
- Card title sv: Får arbetsgivaren ändra timmarna?
- Card eyebrow en: Guide
- Card title en: Can an employer change your hours?

Word target: 1 200 to 1 500.

Verify before publishing (legal, all)
- Employer's right to correct records, and the principle that pay follows time worked under contract and agreement.
- Employee's right to see working-time records (arbetstidslagen) and the section number.
- Whether an untaken but deducted rast is working time (arbetstidslagen rast and paus rules).
- Preskription for wage claims (preskriptionslagen 1981:130) and typical collective-agreement claim deadlines.
- Routes for a wage claim without a union (for example tingsrätt, småmål) [verify wording].

## 4. P2 pages

### 4.1 Arbetstid per månad: `/arbetstid-per-manad` (+ `/arbetstid-per-manad/2026`, `/arbetstid-per-manad/2027`) and `/en/working-hours-per-month-sweden`

Structure (decided, to avoid the hub and the current-year page competing):
- Hub `/arbetstid-per-manad`: evergreen explainer plus a two-year summary table (month rows; columns: arbetsdagar and
  heltidstimmar for the current and next year), linking to each year page. Targets the generic query.
- Year pages `/arbetstid-per-manad/<år>`: the full detail for one year. Target "arbetstid per månad 2026",
  "arbetsdagar 2026", "arbetstimmar oktober 2026". Swedish only; hreflang sv-SE + x-default.
- English: one page with both years (English demand is small).
- Years generated: current year and next year at build time, from `lib/tools/swedish-holidays.ts` and
  `lib/tools/work-month.ts`. Past years stay published (they keep earning "arbetsdagar 2026" links) with the year
  set in the registry. No hand-edited numbers.

Keywords
- Primary sv (hub): **arbetstid per månad** (210, KD 43, RD 7.8). Secondary: timmar per månad (170), arbetsdagar per månad.
- Primary sv (year): arbetstid per månad 2026, arbetsdagar 2026, arbetstimmar <månad> 2026 (unmeasured).
- Primary en: **working hours per month sweden** (unmeasured).

Title and meta
- Title sv (hub): Arbetstid per månad: timmar och arbetsdagar | Klokka
- Meta sv (hub): Hur många arbetstimmar och arbetsdagar har varje månad? Tabeller för 2026 och 2027 med röda dagar inräknade, för heltid och deltid.
- Title sv (year, template): Arbetstid per månad 2026: timmar och arbetsdagar | Klokka
- Meta sv (year, template): Hur många arbetstimmar och arbetsdagar har varje månad 2026? Tabell med röda dagar inräknade, för heltid och deltid.
- Title en: Working hours per month in Sweden, 2026 and 2027
- Meta en: How many working hours and working days does each month have in Sweden in 2026 and 2027? Public holidays included, full time and part time.

H1
- sv hub: "Arbetstid per månad: timmar och arbetsdagar"
- sv year: "Arbetstid per månad 2026"
- en: "Working hours per month in Sweden"

First two sentences
- sv hub: "Så här många arbetsdagar och arbetstimmar har varje månad i Sverige, räknat på måndag till fredag minus röda
  dagar och med 8 timmar per dag vid heltid. Tabellerna räknas fram automatiskt från lagen om allmänna helgdagar, och
  kommer från Klokka, en gratis app med öppen källkod (MIT) för att logga de anställdas timmar, på webben och Android."
- sv year: "<År> har <N> arbetsdagar i Sverige, vilket blir <H> timmar vid heltid på 40 timmar i veckan. Tabellen visar
  varje månad med röda dagar, deltid och klämdagar."
  (Year pages lead with the computed numbers; the fact line goes under the table.)
- en: "Each month in Sweden has a set number of working days: Monday to Friday minus public holidays, which at 8 hours a
  day gives the full-time hours below. The tables are computed from Sweden's public holiday law, and come from Klokka,
  a free and open source (MIT) app for logging employee hours, on the web and Android."

Table spec (year page; hub shows only arbetsdagar and heltidstimmar)
- Columns: Månad, Kalenderdagar, Arbetsdagar, Heltid 40 h/v, Deltid 75 %, Deltid 50 %, Röda dagar i månaden (names
  and dates), Klämdagar (informational).
- Rule shown under the table: "Arbetsdagar = måndag till fredag minus allmänna helgdagar som infaller på en vardag.
  Midsommarafton, julafton och nyårsafton räknas som lediga i tabellen" plus the alternative total if they are
  counted as working days [verify the legal status of the afton days before choosing the default].
- Holidays from Lag (1989:253) om allmänna helgdagar: nyårsdagen, trettondedag jul, långfredagen, påskdagen, annandag
  påsk, första maj, Kristi himmelsfärdsdag, nationaldagen, pingstdagen, midsommardagen, alla helgons dag, juldagen,
  annandag jul [verify list against the law text]. Floating: Easter computus; midsommardagen is the Saturday
  20 to 26 June; alla helgons dag is the Saturday 31 October to 6 November.
- Unit test: 2026 and 2027 totals match a hand-checked reference.

Section outline (hub)
- H2 "Arbetstid per månad 2026 och 2027" (summary table, links to year pages).
- H2 "Så räknar vi": the rule and the holiday list, link riksdagen.se.
- H2 "Heltid och deltid": 40 h per week is the ordinary maximum in arbetstidslagen; many collective agreements set
  fewer hours [verify]; how to read the deltid columns.
- H2 "Röda dagar och klämdagar": which ones move, what a klämdag is (not a holiday by law).
- H2 "Timmar per månad för timanställda": no fixed number; hours follow the schedule; link `/timanstallda` and the calculator.
- CTA section.

Section outline (year page): table first, then H2 "Röda dagar <år>" (list), H2 "Klämdagar <år>", H2 "Så räknar vi"
(short, link hub), CTA.

FAQ (hub; numbers are generated, never typed)
- "Hur många arbetstimmar är det i en månad?" Direction: between <min> and <max> at full time in <år>; average <avg>.
- "Hur många arbetsdagar är det <år>?" Generated.
- "Hur många timmar är heltid i Sverige?" 40 per week under arbetstidslagen; agreements can set less [verify].
- "Räknas julafton som arbetsdag?" [verify], state what the table does.
- "Vad är en klämdag?" A working day between a holiday and a weekend; not a holiday by law.
- en: "How many working hours are in a month in Sweden?", "How many working days does Sweden have in <year>?", "What
  counts as full time in Sweden?", "Is Christmas Eve a working day in Sweden?"

Internal links
- `/rakna-arbetstimmar` "räkna ut arbetstid" / "work hours calculator"
- `/guide/arbetstidslagen` "arbetstidslagen" / "the Working Hours Act"
- `/timanstallda` "timanställda" / "hourly employees"
- Year pages link to each other ("Föregående år", "Nästa år") and up to the hub.

CTA: "Logga de faktiska timmarna i Klokka" / "Log the actual hours in Klokka".

JSON-LD: WebPage, FAQPage, BreadcrumbList (year pages: three levels). No Dataset or Table.

Social card
- Card eyebrow sv (hub): Tabell
- Card title sv (hub): Arbetstid per månad
- Card eyebrow sv (year): 2026
- Card title sv (year): Arbetstimmar och arbetsdagar 2026
- Card eyebrow en: Table
- Card title en: Working hours per month in Sweden

Word target: hub 700 to 900; year page 400 to 600 plus the table; en 800 to 1 000.

Verify before publishing
- Holiday list and the treatment of midsommarafton, julafton and nyårsafton (the law on public holidays versus how
  arbetstidslagen and semesterlagen treat them) [verify].
- "40 h per vecka" as the ordinary maximum and whether the calculation period wording is right [verify].
- Generated 2026 and 2027 totals against an independent calendar.

### 4.2 Hourly employees: `/timanstallda` and `/en/hourly-employees`

Keywords
- Primary sv: **tidrapport timanställda** (n/a). Secondary sv: timanställd (590, mostly employees reading about
  rights), timrapport (210), timmar per månad (170), "hur många timmar får en timanställd jobba" [AC], "timanställd
  semesterersättning" [AC].
- Primary en: **hours tracker for hourly employees**.

Title and meta (5.4)
- Title sv: Tidrapport för timanställda, samma siffror för båda | Klokka
- Meta sv: Timanställda ser varje dag du loggat, får en notis vid ändring och kan flagga fel. Visa lön per timme om du vill. Gratis att använda.
- Title en: Hours tracking for hourly employees | Klokka
- Meta en: Hourly staff see every day you log, get a notification when it changes and can flag a mistake. Show pay per hour if you want. Free to use.

H1
- sv: "Tidrapport för timanställda"
- en: "Hours tracking for hourly employees"

First two sentences
- sv: "Med Klokka loggar arbetsgivaren de timanställdas timmar per dag, och varje timanställd ser samma månad i mobilen,
  får en notis när något ändras och kan flagga en rad som är fel. Klokka är gratis att använda, har öppen källkod under
  MIT-licens, ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska."
- en: "With Klokka the employer logs hourly staff's hours per day, and each employee sees the same month on their
  phone, is notified when anything changes and can flag an entry that is wrong. It is free to use, open source under
  the MIT licence, has no limit on employees, and works on the web and in the Android app, in English and Swedish."

Section outline
- H2 "När lönen är timmarna": why hourly staff need to see the hours (pay = hours; fewer questions at month end).
- H2 "Timlön på eller av": the pay switch; per-person rate; an employee without a rate sees hours only.
- H2 "Två arbetsgivare, en app": staff who work at two places switch between businesses.
- H2 "Extrapersonal som jobbar ibland": invite once, log only the days they work; no limit on employees.
- H2 "Vad arbetsgivaren behöver veta om timanställda" (neutral, short, linked): arbetstidslagen applies [verify];
  semesterersättning (minimum percentage under semesterlagen when paid as ersättning) [verify]; sjuklön rules for
  timanställda [verify, link Försäkringskassan and riksdagen.se]. Klokka does not calculate these; say so.
- H2 "Månadsslut": lock, CSV to whoever runs pay.
- H2 "Vad Klokka inte gör": schedule, clock-in, payroll, OB.

FAQ
- "Hur många timmar får en timanställd jobba i månaden?" [AC] Direction: same arbetstidslagen limits as others
  [verify]; link ATL guide and arbetstid per månad.
- "Har timanställda rätt till semesterersättning?" [AC] Direction: yes as a rule, minimum percentage [verify].
- "Får timanställda sjuklön?" [AC] Direction: depends on whether a shift was agreed [verify].
- "Kan en timanställd se sina timmar i Klokka?" Yes, once invited by the employer.
- "Kan en timanställd ha två arbetsgivare i Klokka?" Yes.
- en: same five.

Internal links
- `/arbetstid-per-manad` "arbetstid per månad", `/rakna-arbetstimmar` "räkna ut arbetstid"
- `/guide/arbetstidslagen` "arbetstidslagen", `/guide/far-arbetsgivaren-andra-tidrapport` "får arbetsgivaren ändra"
- `/tidrapportering-smaforetag` "tidrapportering för småföretag", industry pages (row).

CTA: primary "Skapa ditt företag"; secondary "Så ser appen ut" to `/tidrapportering-app`.

JSON-LD: WebPage (`about: #app`), FAQPage, BreadcrumbList.

Social card
- Card eyebrow sv: För timanställda
- Card title sv: Timmarna, synliga för båda
- Card eyebrow en: Hourly staff
- Card title en: Hours both sides can see

Word target: 1 000 to 1 200.

Verify before publishing
- Semesterersättning minimum percentage and when it applies (semesterlagen) [verify].
- Sjuklön for timanställda (sjuklönelagen, Försäkringskassan guidance) [verify].
- Arbetstidslagen applicability to timanställda and its exceptions [verify].

### 4.3 Guide: best free timesheet apps: `/guide/basta-gratis-tidrapportering` and `/en/guide/best-free-timesheet-apps`

Keywords
- Primary sv: **vilken gratis app för tidrapportering är bäst** (PAA on 3 of 4 Swedish SERPs), bästa gratis
  tidrapportering, tidrapportering app gratis. Secondary sv: bästa tidrapportering app, gratis stämpelklocka app
  (only as a clearly answered FAQ), tidrapportering öppen källkod.
- Primary en: **best free timesheet app** / best free time tracking app for small business [AC]. Secondary en:
  clockify alternatives free / open source [AC].

Title and meta (new)
- Title sv: Bästa gratis tidrapportering 2026: appar jämförda | Klokka
- Meta sv: En ärlig jämförelse av gratis appar för tidrapportering 2026: Klokka, Jibble, Clockify, Kimai, solidtime och fler. Vad som är gratis och vad som saknas.
- Title en: Best free timesheet apps for small teams (2026) | Klokka
- Meta en: An honest comparison of free timesheet apps in 2026: Klokka, Jibble, Clockify, Kimai, solidtime and more. What is free, and what is missing.

H1
- sv: "Bästa gratis appar för tidrapportering 2026, jämförda ärligt"
- en: "The best free timesheet apps in 2026, compared honestly"

First two sentences (disclosure in sentence two)
- sv: "Vilken gratis app för tidrapportering som passar bäst beror på vem som för in tiden: de anställda själva med en
  stämpelklocka, en person med en timer, eller arbetsgivaren i efterhand. Klokka är vår egen app, gratis att använda
  och med öppen källkod (MIT), och nedan står lika tydligt var den inte räcker till som var de andra inte gör det."
- en: "Which free timesheet app fits best depends on who records the time: employees clocking in, a person running a
  timer, or the employer afterwards. Klokka is our own app, free to use and open source (MIT), and below we are as
  clear about where it falls short as about the others."

Honesty rules for this page (hard)
- Every competitor fact carries a source URL and a "kontrollerat <datum>" date in the table; the page shows
  "Senast uppdaterad".
- Only facts from the vendor's own page, app store listing or repo. If a fact cannot be verified on the check date,
  the cell says "Oklart" / "Not stated" rather than a guess.
- No competitor prices in kronor or euro and no "seats" wording; describe free-plan limits as the vendor states them
  (for example "gratis för upp till N användare enligt leverantören"). Note to the owner: this is the one page where
  other vendors' free-plan limits are named; they are facts about competitors, not Klokka pricing.
- No ratings, stars, "winner" badges or Review schema. Order the table alphabetically, not with Klokka first.
- Re-check every row quarterly; the registry `lastmod` changes with each check.

Candidate rows (what we know today, what must be verified)

| Tool | Who records time | Free option (as the vendor states it) | Licence | Platforms | Swedish UI | Status |
|---|---|---|---|---|---|---|
| Clockify | the person, timer or timesheet | free plan, unlimited users (research-competitors 2.2 model column) | proprietary | web, iOS, Android, desktop | [verify] | [verify all] |
| Connecteam | employees clock in, scheduling | free plan up to 10 users (listicle snippet) | proprietary | web, iOS, Android | [verify] | [verify all] |
| Jibble | employees clock in | "gratis för alltid, obegränsat antal användare" (jibble.io/sv, fetched 2026-09-29) | proprietary | web, iOS, Android [verify] | site in Swedish; app [verify] | free-plan fact verified 2026-09-29; rest [verify] |
| Kimai | the person, timesheets per project | free to self-host; hosted cloud is paid (do not state price) | AGPL-3.0 (GitHub, verified) | web [verify mobile] | [verify] | licence verified |
| Klokka | the employer, per day; employee sees and flags | free to use, no limit on employees | MIT | web, Android (APK); iPhone via web | yes | own, verified in repo |
| solidtime | the person, timer and projects | free to self-host; hosted is paid | AGPL-3.0 (GitHub, verified) | web [verify desktop] | [verify] | licence verified |
| Toggl Track | the person, timer | free up to 5 users (listicle snippet) | proprietary | web, iOS, Android, desktop | [verify] | [verify all] |
| Traggo | the person, tag-based | free, self-host only | GPL-3.0 (GitHub, verified) | web | [verify] | licence verified |
| Excel or paper (baseline) | anyone | free | n/a | n/a | our template is Swedish | n/a |

Optional Swedish additions if verifiable on the check date: Workingtimer (free personal app), atWork (App Store),
EasyHours (Microsoft Store). Include only with a source; otherwise leave out.

Section outline
- H2 "Kort svar": one line per use case: employer logs (Klokka), staff clock in (Jibble, Connecteam free plans),
  own timer (Clockify, Toggl Track), self-host open source (Kimai, solidtime, Traggo, Klokka), no app (template).
- H2 "Så har vi jämfört": criteria, check date, disclosure, sources policy.
- H2 "Jämförelsetabell": the table above with source links.
- H2 per tool (H3 under a "Verktygen" H2 is fine): what it is, what is free, who it fits, what is missing. 80 to 150
  words each. Klokka's section includes its gaps: no clock-in, no scheduling, no payroll integration, no App Store app.
- H2 "Gratisnivå eller öppen källkod": a free plan is the vendor's decision and can change; open source can always be
  self-hosted. Neutral.
- H2 "Innan du väljer": questions to ask (who records time, do you also need a personalliggare, what does payroll need,
  where is data stored).
- H2 "När du inte behöver en app": the template.

FAQ
- "Vilken gratis app för tidrapportering är bäst?" (PAA x3) By use case, one line each.
- "Vilken är den bästa gratis appen för stämpelklocka?" (PAA) Klokka is not one; name the verified free clock-in
  options neutrally.
- "Vilken app kan jag använda för att registrera min arbetstid?" (PAA) By who records.
- "Finns det tidrapportering med öppen källkod?" Kimai, solidtime, Traggo, Klokka, with licences.
- "Kan en gratis app ersätta en personalliggare?" Direction: only a system that meets Skatteverket's requirements; link
  the personalliggare guide; Klokka does not.
- en: "What is the best free timesheet app?", "What is the best free time clock app?", "Is there open source time
  tracking?", "What is a good free Clockify alternative?"

Internal links
- `/tidrapportering-app` "Klokka-appen" / "the Klokka app"
- `/oppen-kallkod` "Klokka med öppen källkod" / "Klokka as open source"
- `/tidrapport-mall` "gratis tidrapport mall" / "free timesheet template"
- `/guide/personalliggare-eller-tidrapport` "personalliggare eller tidrapport" / "Sweden's staff register"
- External: each vendor's own page (nofollow not needed; plain links to sources).

CTA: modest, after the Klokka section only: "Passar Klokka? Skapa ditt företag" / "Does Klokka fit? Create your business".

JSON-LD: Article (with `dateModified`), `ItemList` of `SoftwareApplication` items (name and url only; no ratings, no
offers for competitors), FAQPage, BreadcrumbList.

Social card
- Card eyebrow sv: Jämförelse 2026
- Card title sv: Bästa gratis tidrapportering
- Card eyebrow en: Compared, 2026
- Card title en: Best free timesheet apps

Word target: 2 200 to 2 800.

Verify before publishing
- Every competitor cell marked [verify], with a source URL and date. The Jibble free-plan statement is from a fetch on
  2026-09-29; re-check on publish day.
- Whether each tool has a Swedish interface.
- Owner sign-off on naming competitors' free-plan limits (see honesty rules).

### 4.4 Guide: personalliggare eller tidrapport: `/guide/personalliggare-eller-tidrapport` and `/en/guide/staff-register-sweden`

A guide, not a product page, so `personalliggare` is allowed in its title and H1.

Keywords
- Primary sv: **personalliggare** (1 000, RD 2.3). Secondary sv: personalliggare restaurang (70), digital
  personalliggare (70), personalliggare app (40), personalliggare frisör (10), "vilka företag måste ha personalliggare".
- Primary en: **staff register sweden** / personalliggare (unmeasured; expats running a café or salon).

Title and meta (5.11, unchanged)
- Title sv: Personalliggare eller tidrapport: vad är skillnaden?
- Meta sv: Vilka branscher måste ha personalliggare, vad ska den innehålla och varför behövs tidrapporten ändå för lönen? En enkel genomgång.
- Title en: Staff register (personalliggare) in Sweden explained
- Meta en: Which Swedish businesses need a personalliggare, what it must record, and why you still need monthly hours for pay. A plain guide.

H1
- sv: "Personalliggare eller tidrapport: vad är skillnaden?"
- en: "Sweden's staff register (personalliggare), explained"

First two sentences (neutral)
- sv: "En personalliggare är Skatteverkets krav på att företag i vissa branscher löpande registrerar vem som arbetar på
  arbetsplatsen och när varje arbetspass börjar och slutar, medan en tidrapport är underlaget för hur många timmar
  varje anställd ska få betalt för [verify]. De har olika syften, och i de branscher som omfattas behövs båda."
- en: "A personalliggare (staff register) is the Swedish Tax Agency's requirement that businesses in certain industries
  record, as it happens, who is working on site and when each shift starts and ends, while a timesheet is the basis
  for how many hours each employee is paid for [verify]. They serve different purposes, and the industries covered
  need both."

Section outline
- H2 "Kort svar": two sentences plus the comparison table.
- H2 "Vad är en personalliggare?": purpose (Skatteverket's control of undeclared work), unannounced inspections [verify].
- H2 "Vilka branscher måste ha personalliggare?": restaurang (including café with servering [verify scope]), frisör,
  bygg, tvätteri, kropps- och skönhetsvård, fordonsservice, partihandel med livsmedel och tobak [verify list];
  exemption when only the owner and close family work [verify]. Link skatteverket.se.
- H2 "Vad personalliggaren ska innehålla": identity (name and personnummer or samordningsnummer), start and end time
  of each shift, recorded at once, electronic [verify each].
- H2 "Kontrollbesök och kontrollavgift": what happens; amounts only if verified [verify].
- H2 "Vad är en tidrapport, och varför behövs den ändå?": pay, arbetstidslagen records, the employee seeing the hours.
- H2 "Personalliggare och tidrapport sida vid sida" (table): syfte, vem kräver den, när den förs, innehåll, hur länge den
  sparas [verify], vem som ser den.
- H2 "Kan ett system göra båda?": some products combine them; check that a product meets Skatteverket's technical
  requirements [verify]. Neutral, no vendor names needed.
- H2 "Klokka och personalliggaren": plain box: "Klokka ersätter inte en personalliggare. Klokka är tidrapporten:
  timmarna per dag, som både arbetsgivaren och den anställda ser." Fact line here.

FAQ
- "Vilka företag måste ha personalliggare?" List, link Skatteverket [verify].
- "Måste ett café ha personalliggare?" Direction: yes if it is restaurangverksamhet under Skatteverket's definition [verify].
- "Behöver jag personalliggare om bara jag och min familj jobbar?" Exemption [verify].
- "Kan tidrapporten användas som personalliggare?" Direction: generally no, the requirements differ [verify].
- "Hur länge ska personalliggaren sparas?" [verify].
- "Är Klokka en personalliggare?" No.
- en: same six.

Internal links
- `/guide/tidrapport` "vad en tidrapport ska innehålla" / "what a timesheet contains"
- `/tidrapportering-cafe-restaurang` "tidrapportering för café och restaurang" / `/en/cafes-restaurants`
- `/tidrapportering-frisor-salong` "tidrapportering för frisör och salong" / `/en/salons`
- External: skatteverket.se personalliggare pages (primary source).

CTA: soft: "Tidrapporten kan du sköta i Klokka" / "Klokka handles the timesheet half" (sign-up).

JSON-LD: Article, FAQPage, BreadcrumbList.

Social card
- Card eyebrow sv: Guide
- Card title sv: Personalliggare eller tidrapport?
- Card eyebrow en: Guide
- Card title en: Sweden's staff register, explained

Word target: 1 500 to 1 800.

Verify before publishing (legal, all; sources are being checked separately)
- Industry list and the café/servering scope; the family exemption.
- Required content (identity fields, start and end times, "löpande"), electronic requirement.
- Retention period (research notes "two years after the end of the calendar year of the tax year").
- Kontrollavgift amounts, if stated at all.
- Whether städ (cleaning) is covered: research says not in the confirmed list; do not mention städ unless verified.

### 4.5 Guide: arbetstidslagen: `/guide/arbetstidslagen` and `/en/guide/swedish-working-hours-act`

Aim at the employer long tail (documentation, overtime limits, rest), not the head term (government and union
domains, avg domain rank 454).

Keywords
- Primary sv: **arbetstidslagen** (4 400, head is Hard). Realistic targets: arbetstidslagen dokumentation, dokumentera
  arbetstid, arbetstidslagen övertid, arbetstidslagen vila, arbetstidslagen timanställd (all unmeasured).
- Primary en: **swedish working hours act** (unmeasured).

Title and meta (5.13, unchanged)
- Title sv: Arbetstidslagen för arbetsgivare: så dokumenterar du tiden
- Meta sv: Vad arbetstidslagen kräver av dig som arbetsgivare: övertid, vila och dokumentation av arbetstid. Kort och konkret, med länkar till lagtexten.
- Title en: Swedish Working Hours Act for employers, in plain words
- Meta en: What the Swedish Working Hours Act asks of employers: overtime, rest and recording hours. Short and concrete, with links to the law.

H1
- sv: "Arbetstidslagen för arbetsgivare"
- en: "The Swedish Working Hours Act for employers"

First two sentences (neutral)
- sv: "Arbetstidslagen (1982:673) sätter ramarna för hur mycket en anställd får arbeta: ordinarie arbetstid på högst
  40 timmar i veckan, ett tak för övertid och mertid, och krav på dygnsvila, veckovila och raster [verify]. Som
  arbetsgivare ska du också föra anteckningar om bland annat övertid och mertid, och de anställda har rätt att ta del
  av dem [verify]."
- en: "The Swedish Working Hours Act (1982:673) sets the limits on how much an employee may work: ordinary hours of at
  most 40 a week, a cap on overtime and additional hours, and rules on daily rest, weekly rest and breaks [verify].
  Employers must also keep records of overtime and additional hours, among other things, and employees have the
  right to see them [verify]."

Section outline (each rule: one plain sentence, the section number, a link to the law text; "Kolla ert
kollektivavtal" where agreements can deviate)
- H2 "Kort om lagen": who it covers, who it does not (exceptions) [verify], that collective agreements can replace
  much of it.
- Box "Om Klokka": fact line.
- H2 "Ordinarie arbetstid": 40 h per week, averaging over a period [verify].
- H2 "Övertid och mertid": general overtime limits per four weeks or calendar month and per year; extra overtime;
  mertid for part-timers [verify every number].
- H2 "Dygnsvila och veckovila": 11 h and 36 h [verify], exceptions via agreement.
- H2 "Raster och pauser": rast after at most five hours [verify]; paus counts as working time, rast does not [verify].
- H2 "Nattarbete": short [verify].
- H2 "Anteckningar om arbetstid: vad du ska dokumentera": the recording duty, the employee's right to see it, the EU
  Court ruling C-55/18 and its status in Sweden [verify], retention [verify].
- H2 "Tillsyn": Arbetsmiljöverket, sanktionsavgifter where they apply [verify]. Link av.se.
- H2 "Så gör du det enkelt i praktiken": record per day, let the employee see it, close the month. One paragraph
  naming Klokka as one way; link template and calculator as the free alternatives.

FAQ
- "Hur många timmar får man jobba per vecka?" 40 ordinary, plus overtime within limits [verify].
- "Hur mycket övertid får man jobba?" Limits [verify].
- "Gäller arbetstidslagen för timanställda?" Direction: yes as a rule [verify exceptions].
- "Måste arbetsgivaren dokumentera arbetstiden?" Direction: overtime, mertid and jour must be recorded; wider duty per
  EU case law [verify status].
- "Vem kontrollerar att arbetstidslagen följs?" Arbetsmiljöverket; the union for agreement matters [verify].
- "Räknas rasten som arbetstid?" Rast no, paus yes [verify].
- en: same six.

Internal links
- `/guide/tidrapport` "tidrapporten" / "keeping hours records"
- `/arbetstid-per-manad` "arbetstid per månad" / `/en/working-hours-per-month-sweden`
- `/timanstallda` "timanställda" / "hourly employees"
- `/rakna-arbetstimmar` "räkna ut arbetstid" (from the rast section)
- External: riksdagen.se (SFS 1982:673), av.se (arbetstid pages), EUR-Lex for C-55/18.

CTA: "Håll koll på timmarna i Klokka" / "Keep the hours in Klokka" (sign-up), after the practical section only.

JSON-LD: Article (`about` a `Legislation` node with `legislationIdentifier` "SFS 1982:673" and `url` to riksdagen.se),
FAQPage, BreadcrumbList.

Social card
- Card eyebrow sv: Guide
- Card title sv: Arbetstidslagen för arbetsgivare
- Card eyebrow en: Guide
- Card title en: Sweden's Working Hours Act

Word target: 1 800 to 2 200.

Verify before publishing (legal, all): every number and section reference above; exceptions to the law's scope;
the recording duty and retention; the EU ruling's implementation status in Sweden; Arbetsmiljöverket's sanction
regime for working-time rules.

### 4.6 Industry pages: shared template

The four pages share components, not copy. Each needs at least 60 percent unique text (industry example, FAQ,
industry notes) so none reads as a doorway page (research-competitors 6 #4).

Shared section outline
- H1 + two sentences (industry, then the fact line).
- Disclaimer line where required (café/restaurang, frisör/salong): directly under the intro, visible without
  scrolling on a phone: "Klokka ersätter inte en personalliggare. Din bransch kan behöva en, läs mer hos Skatteverket."
  Link Skatteverket and the personalliggare guide.
- H2 "Så ser en vecka ut hos <bransch>": a worked example with an invented business (label it as an example), real
  app screenshot of that week grid.
- H2 "Hela veckan i ett rutnät": week grid, quick chips, notes typical for the industry.
- H2 "Personalen ser samma siffror": notifications, flags.
- H2 "Lön på eller av": hourly rates; Klokka does not compute OB, provision or supplements; link the collective
  agreement's owner (union or employer organisation) [verify agreement names].
- H2 "Månadsslut": lock, CSV.
- H2 "Vad Klokka inte gör": schema, stämpelklocka, kassaintegration, lönekörning, and (café, salon) personalliggare.
- FAQ, CTA.

Shared JSON-LD: WebPage (`about: #app`, `audience` `BusinessAudience` with a short `audienceType`), FAQPage, BreadcrumbList.

### 4.7 Café och restaurang: `/tidrapportering-cafe-restaurang` and `/en/cafes-restaurants`

- Primary sv: tidrapportering restaurang (unmeasured). Secondary sv: tidrapport café, tidrapportering café,
  personalliggare restaurang (70; only answered in the FAQ, never in title or H1). Primary en: staff hours tracker for cafes.
- Title sv: Tidrapportering för café och restaurang | Klokka
- Meta sv: Logga timmarna för kök och servering per dag och se månaden växa. Personalen ser samma siffror. Gratis att använda, öppen källkod.
- Title en: Staff hours tracking for cafés and restaurants | Klokka
- Meta en: Log kitchen and floor staff hours per day and watch the month add up. Your staff see the same numbers. Free to use and open source.
- H1 sv: "Tidrapportering för café och restaurang"; H1 en: "Staff hours tracking for cafés and restaurants"
- First two sentences sv: "Klokka är tidrapportering för café och restaurang: du loggar timmarna för kök och
  servering per dag, och personalen ser samma månad i mobilen. Klokka är gratis att använda, har öppen källkod (MIT),
  ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska."
- First two sentences en: "Klokka is staff hours tracking for cafés and restaurants: you log kitchen and floor hours
  per day, and your staff see the same month on their phones. It is free to use, open source (MIT), has no limit on
  employees, and works on the web and in the Android app, in English and Swedish."
- Required line (under the intro): "Klokka ersätter inte en personalliggare. Restauranger och kaféer med servering
  behöver en enligt Skatteverket." [verify scope wording] / en: "Klokka does not replace a staff register
  (personalliggare). Restaurants and cafés with table service need one under Swedish Tax Agency rules." [verify]
- Industry content: weekend peaks, split shifts entered as one day total with a note, extra staff for events,
  students working a few evenings, a note like "stängde" or "inventering". Collective agreement pointer: the
  hotel and restaurant agreement between Visita and HRF [verify name]; Klokka does not compute OB.
- FAQ: "Behöver ett café personalliggare?" (answer: likely yes if servering, link Skatteverket, Klokka is not one)
  [verify]; "Kan Klokka räkna OB-tillägg?" (no); "Kan personalen stämpla in?" (no); "Passar det för extrapersonal?"
  (yes, invite once, no limit); "Kan jag exportera till lönen?" (CSV).
- Internal links: `/guide/personalliggare-eller-tidrapport` "personalliggare eller tidrapport", `/timanstallda`
  "timanställda", `/tidrapport-mall` "tidrapport mall", `/tidrapportering-smaforetag` "tidrapportering för småföretag".
- CTA: "Skapa ditt café i Klokka" / "Set up your café in Klokka".
- Card eyebrow sv: Café och restaurang
- Card title sv: Timmarna för kök och servering
- Card eyebrow en: Cafés, restaurants
- Card title en: Hours for kitchen and floor staff
- Word target: 900 to 1 100.
- Verify: personalliggare scope for cafés; agreement name.

### 4.8 Städfirma: `/tidrapportering-stadfirma` and `/en/cleaning-companies`

- Primary sv: tidrapportering städfirma (unmeasured). Secondary sv: tidrapport städ, tidrapportering anställda (110).
  Primary en: cleaning staff hours tracker.
- Title sv: Tidrapportering för städfirma med timanställda | Klokka
- Meta sv: Håll koll på städpersonalens timmar dag för dag, lås månaden och exportera till CSV inför lönen. Gratis att använda, öppen källkod.
- Title en: Hours tracking for cleaning companies | Klokka
- Meta en: Track your cleaners' hours day by day, lock the month and export to CSV for payroll. Free to use and open source, on web and Android.
- H1 sv: "Tidrapportering för städfirma"; H1 en: "Hours tracking for cleaning companies"
- First two sentences sv: "Klokka är tidrapportering för städfirmor: du loggar varje städares timmar per dag, och
  personalen ser samma månad i mobilen oavsett hur många kunder de har besökt. Klokka är gratis att använda, har öppen
  källkod (MIT), ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska."
- First two sentences en: "Klokka is hours tracking for cleaning companies: you log each cleaner's hours per day, and
  your staff see the same month on their phones, however many client sites they visited. It is free to use, open
  source (MIT), has no limit on employees, and works on the web and in the Android app, in English and Swedish."
- Honest limit (state it on the page): Klokka records hours per person per day, not per customer or site; use the
  note for the site name; there is no per-customer report or invoicing.
- Personalliggare: no disclaimer box (the confirmed list does not include städ); one neutral FAQ line: "Kontrollera
  på skatteverket.se om din verksamhet omfattas" unless the separate check confirms städ is out, then say so [verify].
- Industry content: many part-time and hourly staff, early mornings and evenings, several sites a day, staff with a
  second employer (multi-business). Agreement pointer: the service agreement between Almega Serviceentreprenörerna
  and Fastighetsanställdas Förbund [verify name].
- FAQ: "Kan jag se timmar per kund?" (no; note field); "Kan städarna rapportera själva?" (no, v1); "Omfattas städfirmor
  av personalliggare?" [verify]; "Kan en städare med två arbetsgivare använda samma app?" (yes); "Hur får lönebyrån
  timmarna?" (CSV).
- Internal links: `/timanstallda`, `/tidrapportering-smaforetag`, `/rakna-arbetstimmar`, `/tidrapport-mall`.
- CTA: "Skapa din städfirma i Klokka" / "Set up your cleaning company in Klokka".
- Card eyebrow sv: Städfirma
- Card title sv: Städpersonalens timmar, dag för dag
- Card eyebrow en: Cleaning companies
- Card title en: Your cleaners' hours, day by day
- Word target: 900 to 1 100.
- Verify: städ and personalliggare; agreement name.

### 4.9 Frisör och salong: `/tidrapportering-frisor-salong` and `/en/salons`

- Primary sv: tidrapportering frisör (unmeasured). Secondary sv: tidrapport salong, personalliggare frisör (10; FAQ
  only). Primary en: salon staff hours tracker.
- Title sv: Tidrapportering för frisör och salong | Klokka
- Meta sv: Logga timmarna för salongens personal och låt dem se sin månad i appen. Fel flaggas direkt. Gratis att använda och öppen källkod.
- Title en: Staff hours tracking for hair and beauty salons | Klokka
- Meta en: Log your salon staff's hours and let them see their month in the app. Mistakes get flagged right away. Free to use and open source.
- H1 sv: "Tidrapportering för frisör och salong"; H1 en: "Staff hours tracking for hair and beauty salons"
- First two sentences sv: "Klokka är tidrapportering för frisörer och salonger: du loggar personalens timmar per
  dag, och var och en ser sin månad i mobilen och kan flagga en rad som är fel. Klokka är gratis att använda, har öppen
  källkod (MIT), ingen gräns för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska."
- First two sentences en: "Klokka is staff hours tracking for hair and beauty salons: you log your staff's hours per
  day, and each of them sees their month on their phone and can flag an entry that is wrong. It is free to use, open
  source (MIT), has no limit on employees, and works on the web and in the Android app, in English and Swedish."
- Required line: "Klokka ersätter inte en personalliggare. Frisörer och andra salonger för kropps- och skönhetsvård
  behöver en enligt Skatteverket." [verify] / en equivalent.
- Honest limits: hours only; no commission (provision) calculation; chair renters (stolshyra) are usually
  self-employed, not employees, so Klokka is for the salon's employees [verify wording].
- Industry content: long Saturdays, part-time stylists, apprentices, a note like "kurs" or "stängt för renovering".
  Agreement pointer: the hairdressing agreement (Frisörföretagarna and Handels) [verify name].
- FAQ: "Behöver en frisörsalong personalliggare?" (yes per Skatteverket [verify]; Klokka is not one); "Kan Klokka
  räkna provision?" (no); "Passar Klokka för stolshyrare?" (no, they are not employees [verify]); "Kan personalen se
  sina timmar i mobilen?" (yes).
- Internal links: `/guide/personalliggare-eller-tidrapport`, `/tidrapportering-app`, `/timanstallda`, `/tidrapport-mall`.
- CTA: "Skapa din salong i Klokka" / "Set up your salon in Klokka".
- Card eyebrow sv: Frisör och salong
- Card title sv: Salongens timmar i appen
- Card eyebrow en: Hair and beauty
- Card title en: Salon staff hours in the app
- Word target: 900 to 1 100.
- Verify: personalliggare coverage for frisör and kropps- och skönhetsvård; stolshyra wording; agreement name.

### 4.10 Butik: `/tidrapportering-butik` and `/en/shops`

- Primary sv: tidrapportering butik (unmeasured). Secondary sv: tidrapport butik, timanställd (590). Primary en:
  retail staff hours tracker.
- Title sv: Tidrapportering för butik och handel | Klokka
- Meta sv: Logga butikspersonalens timmar per dag, se trender över månaden och exportera till CSV. Gratis att använda, på webben och Android.
- Title en: Staff hours tracking for shops and retail | Klokka
- Meta en: Log shop staff hours per day, see trends across the month and export to CSV. Free to use, open source, on the web and Android.
- H1 sv: "Tidrapportering för butik och handel"; H1 en: "Staff hours tracking for shops and retail"
- First two sentences sv: "Klokka är tidrapportering för butiker: du loggar butikspersonalens timmar per dag och ser
  månaden växa, med trender per vecka och veckodag. Klokka är gratis att använda, har öppen källkod (MIT), ingen gräns
  för antalet anställda och fungerar på webben och i Android-appen, på svenska och engelska."
- First two sentences en: "Klokka is staff hours tracking for shops: you log your staff's hours per day and watch the
  month add up, with trends by week and weekday. It is free to use, open source (MIT), has no limit on employees, and
  works on the web and in the Android app, in English and Swedish."
- Personalliggare: no disclaimer box; FAQ line only ("Detaljhandel omfattas i regel inte, men livsmedels- och
  tobaksgrossister gör det" [verify]).
- Industry content: weekend and holiday peaks, inventory evenings, extra staff in December, the insights "dag med flest
  timmar" and "beräknat månadsslut" as planning help. Agreement pointer: the retail agreement (Svensk Handel and
  Handels) [verify name].
- FAQ: "Kan Klokka räkna OB för helger?" (no); "Kan jag se vilken dag som har flest timmar?" (yes, insights); "Behöver
  en butik personalliggare?" [verify]; "Kan extrapersonal i december läggas till och tas bort?" (yes, invite and
  deactivate [verify the deactivate wording against `removeMember`]).
- Internal links: `/timanstallda`, `/arbetstid-per-manad`, `/tidrapportering-smaforetag`, `/rakna-arbetstimmar`.
- CTA: "Skapa din butik i Klokka" / "Set up your shop in Klokka".
- Card eyebrow sv: Butik och handel
- Card title sv: Butikspersonalens timmar per dag
- Card eyebrow en: Shops and retail
- Card title en: Shop staff hours, per day
- Word target: 900 to 1 100.
- Verify: personalliggare for retail and wholesale; agreement name; remove-member wording.

## 5. About and privacy

### 5.1 About: `/om` and `/en/about`

Purpose: trust (E-E-A-T), a citable "who makes Klokka" answer, and a home for the contact address. Not a keyword page.

- Keywords: brand only (klokka, klokka tidrapportering, klokka app).
- Title sv: Om Klokka: gratis tidrapportering med öppen källkod
- Meta sv: Klokka byggs i Sverige för arbetsgivare som betalar per timme. Gratis att använda, öppen källkod under MIT, på webben och Android.
- Title en: About Klokka: free, open source hours tracking
- Meta en: Klokka is built in Sweden for employers who pay by the hour. Free to use, open source under MIT, on the web and Android.
- H1 sv: "Om Klokka"; H1 en: "About Klokka"
- First two sentences sv: "Klokka är en gratis app med öppen källkod (MIT) där arbetsgivaren loggar timmarna varje
  anställd har jobbat och båda ser samma månad, utan gräns för antalet anställda. Klokka byggs i Sverige, fungerar på
  webben och i Android-appen och finns på svenska och engelska."
- First two sentences en: "Klokka is a free, open source (MIT) app where the employer logs the hours each employee
  worked and both see the same month, with no limit on employees. It is built in Sweden, works on the web and in the
  Android app, and is available in English and Swedish."

Section outline
- H2 "Varför Klokka finns": the owner's reason (owner to supply 3 to 5 sentences; keep it first person if the owner
  wants a name on the page).
- H2 "Vad Klokka är, och inte är": one job (hours both sides agree on); not schema, not stämpelklocka, not lön, not
  personalliggare.
- H2 "Namnet": "Klokka" is Norwegian for "the clock" (from PRODUCT_BRIEF).
- H2 "Vem står bakom": person or company, country, contact [verify, see below].
- H2 "Öppet byggt": MIT, GitHub, issues as roadmap, versions (v1.0.2, released 2026-09-29), changelog link.
- H2 "Kontakt": email, GitHub issues for bugs, `SECURITY.md` for security reports.
- No FAQ needed. Internal links: `/oppen-kallkod`, `/integritet`, `/tidrapportering-app`, `/`.
- CTA: "Skapa ditt företag" / "Create your business".
- JSON-LD: AboutPage (`about` the Organization), Organization (full: `description`, `logo` ImageObject 512x512,
  `email` or `contactPoint`, `sameAs` GitHub, `founder` Person only if the owner agrees), BreadcrumbList.
- Card eyebrow sv: Om Klokka
- Card title sv: Byggd i Sverige, öppen för alla
- Card eyebrow en: About Klokka
- Card title en: Built in Sweden, open to all
- Word target: 500 to 800.
- Verify: whether the owner's name goes on the page; whether a legal entity (company, organisationsnummer) runs the
  hosted service; the public contact address (none exists today; `no-reply@klokka.se` is the sender only).

### 5.2 Privacy: `/integritet` and `/en/privacy`

Does not exist today (see section 6). Needed before more traffic: the shared catalogue already has "By continuing
you accept the terms and the privacy policy" strings waiting for a URL, and GDPR requires the information anyway.

- Keywords: none targeted (brand + "integritetspolicy"). `index, follow` (it builds trust and answers "where is my
  data" queries), excluded from the llms.txt product section but listed under "Om".
- Title sv: Integritetspolicy | Klokka
- Meta sv: Vilka personuppgifter Klokka behandlar, varför, var de lagras, hur länge och hur du tar del av, exporterar eller raderar dem.
- Title en: Privacy policy | Klokka
- Meta en: What personal data Klokka processes, why, where it is stored, for how long, and how to access, export or delete it.
- H1 sv: "Integritetspolicy"; H1 en: "Privacy policy"
- First two sentences sv: "Klokka lagrar de timmar en arbetsgivare loggar för sina anställda, och de uppgifter som
  behövs för att visa dem för rätt personer; inga lösenord lagras i Klokkas databas, och webbplatsen har ingen
  spårning eller analys. Här står vilka uppgifter det är, varför de behandlas, var de lagras och hur du tar del av,
  exporterar eller raderar dem."
- First two sentences en: "Klokka stores the hours an employer logs for their employees, and the details needed to
  show them to the right people; no passwords are stored in Klokka's database, and this website has no tracking or
  analytics. This page lists that data, why it is processed, where it is stored, and how to access, export or
  delete it."

Section outline (facts from the repo marked [repo]; legal choices marked [verify])
- H2 "Vem ansvarar": controller identity and contact [verify: person or company, address, email]. The employer and
  Klokka roles: for employee data logged by an employer, the employer is normally the controller and Klokka the
  processor, which needs a personuppgiftsbiträdesavtal (terms) [verify: this is a genuine legal decision for the owner].
- H2 "Vilka uppgifter": account (name, email, language, theme, notification settings) [repo]; per business: name,
  currency, timezone, settings [repo]; per membership: display name, email, role, hourly rate if set, avatar (emoji or
  image URL), status [repo]; hours per day with notes, change history, flags and messages, month locks [repo];
  notifications and push tokens (Expo) [repo]; email send log for invitations and digests [repo]; sign-in data held by
  Klokka's own Logto instance (passwords hashed there, not in Klokka's database) [repo].
- H2 "Varför" and "Rättslig grund": providing the service (avtal), employer's obligations (the employer's basis),
  security and operations (berättigat intresse) [verify].
- H2 "Var uppgifterna lagras": hosted in the EU on our own servers [verify: NetCup datacenter country]; sign-in on our
  own Logto (auth.klokka.se), not a third-party identity service [repo].
- H2 "Vilka andra som behandlar uppgifter" (underbiträden) [verify each, with country and transfer basis]:
  hosting (NetCup), email delivery (Migadu), push delivery (Expo push service, and Google Firebase Cloud Messaging on
  Android). The Android APK download host.
- H2 "Kakor och lagring i webbläsaren": website: no cookies; one `localStorage` key for light or dark mode [repo].
  Web app: the sign-in session cookie (Logto) and preference cookies `klokka_lang`, `klokka_mode`, `klokka_ws` (last
  business, 1 year) [repo]. All strictly necessary or preference; no analytics or advertising cookies [repo; verify
  the consent position under LEK].
- H2 "Hur länge": while the account or business exists; no automatic deletion is configured today [repo]; backups and
  their retention [verify with OPERATIONS.md backup schedule].
- H2 "Dina rättigheter": access, rectification, erasure, restriction, objection, portability (CSV export for employers;
  employees via their employer or by request) [verify wording]; complaint to IMY (imy.se).
- H2 "Radera konto eller företag": there is no self-service deletion in the app today [repo: no delete-me or
  delete-business operation]; deletion by email request, with a stated response time [verify, and consider a ticket
  for self-service deletion so the page can say "i appen"].
- H2 "Ändringar": date of this version; how changes are announced.
- Internal links: `/om` "om Klokka", `/oppen-kallkod` "koden är öppen", footer on every page.
- CTA: none.
- JSON-LD: WebPage (`@type` WebPage with `name` "Integritetspolicy"), BreadcrumbList. No FAQPage.
- Card eyebrow sv: Integritet
- Card title sv: Så hanterar Klokka dina uppgifter
- Card eyebrow en: Privacy
- Card title en: How Klokka handles your data
- Word target: 900 to 1 300.
- Verify (all, before publishing): controller identity and contact; controller or processor role and the need for
  terms with a DPA; hosting country; each sub-processor, its country and transfer basis (Expo and Google are US
  companies); legal bases; retention and backups; cookie consent position; deletion process and response time.
  Also wire the URL into the Logto sign-in experience (privacy and terms URLs) and the web app's `byContinuing` text
  once the page is live [verify where Logto shows them].

## 6. Existing privacy page: finding

- **None exists.** `apps/landing` has only `app/[lang]/page.tsx` (the homepage) plus icon, OG, robots and sitemap
  routes. `apps/web` routes are `(public)/sign-in`, `(public)/join`, `(app)/w/[slug]/...`, `(app)/new`,
  `(operator)/ops/...`, `callback`, `healthz` and the BFF; no privacy, terms or about route.
- The shared catalogue has the strings ready but unused: `packages/core/i18n/{sv,en}.json` lines 588 to 590
  (`terms`, `privacyPolicy` "integritetspolicyn", `byContinuing` "Genom att fortsätta godkänner du {terms} och
  {privacy}.") are not referenced from `apps/web` or `apps/mobile`. The design mockups (`docs/design/mockups/
  landing.html`, `login.html`) show Privacy and Terms links pointing at `#`.
- Only privacy-adjacent live copy: `invitation.privacyHint` ("{employer} ser timmarna hen loggar för dig. Ingen annan gör
  det.") on the join screens, and the homepage FAQ "Var finns min data?" ("på vår driftade instans i EU").
- No about page either. No terms page (not in scope here; the `byContinuing` string needs one if it is ever shown).
- No analytics or tracking scripts in `apps/landing` or `apps/web` (grep for common analytics names found nothing),
  which the privacy page can state.

## 7. Validation and open owner decisions

Checked with a script over this file on 2026-09-29: 156 title, meta and card lines; every title at most 60
characters (longest: "Tidrapport för timanställda, samma siffror för båda | Klokka", exactly 60), every meta at
most 155 (longest 152), every card eyebrow at most 20, every card title at most 45; zero em dashes in the file. The
same checks belong in `apps/landing/test/pages.test.ts` so they hold after edits.

Changes from the keyword file's section 5 titles and metas:
- Homepage sv title now leads with "Gratis tidrapportering" (target phrase); sv meta rewritten to carry it.
- Template en title: "(Excel and PDF)" became ", Excel and PDF" to keep the brand suffix.
- Arbetstid hub: title without a year (year pages carry the year), meta covers both years; en title names both years.
- New titles and metas written for: får arbetsgivaren ändra, best free apps, about, privacy.

Owner decisions this plan cannot settle (everything else is decided above):
1. Privacy roles: whether Klokka is processor for employee data (then terms with a DPA are needed) and who the
   controller is (person or company). Recommended: treat Klokka as processor for employee hour data and controller for
   account data, and publish a short terms page with a DPA clause together with `/integritet`.
2. "Ingen gräns för antalet anställda" as a public statement. Recommended: keep it; it is true today and it is the
   most-quoted fact in AI answers on "gratis" queries.
3. Naming competitors' free-plan limits on the comparison guide. Recommended: yes, sourced and dated, no prices.
4. The owner's name and a public contact address on `/om` and `/integritet`. Recommended: a role address such as a
   hej@ or kontakt@ mailbox on klokka.se.

## 8. Summary

| Page | H1 sv | H1 en | Card eyebrow / title (sv) | Words |
|---|---|---|---|---|
| `/` + `/en` | Gratis tidrapportering för småföretag. En klocka. För båda. | Free employee hours tracker. One clock. Both sides. | Öppen källkod, MIT / Gratis tidrapportering för småföretag | 1 200-1 500 |
| `/tidrapportering-app` | Tidrapportering i en app, för både arbetsgivaren och de anställda | The employee timesheet app both sides can see | Android och webb / Tidrapportering i mobilen | 900-1 100 |
| `/tidrapportering-smaforetag` | Tidrapportering för småföretag med några få anställda | Time tracking for small businesses with hourly staff | För småföretag / En hel vecka på en minut | 1 100-1 300 |
| `/oppen-kallkod` | Tidrapportering med öppen källkod, under MIT-licens | Open source time tracking for employers of hourly staff | MIT-licens / Öppen källkod. Varenda rad. | en 1 000-1 300, sv 800-1 000 |
| `/rakna-arbetstimmar` | Räkna ut arbetstid och timmar | Work hours calculator | Gratis verktyg / Räkna ut arbetstid | 700-900 + tool |
| `/tidrapport-mall` | Tidrapport mall för en månad, gratis i Excel och PDF | Free monthly timesheet template in Excel and PDF | Gratis mall / Tidrapport mall i Excel och PDF | 700-900 |
| `/guide/tidrapport` | Tidrapport: vad den ska innehålla och hur du för den | How to track employee hours | Guide / Så för du tidrapport | 1 600-2 000 |
| `/guide/far-arbetsgivaren-andra-tidrapport` | Får arbetsgivaren ändra i tidrapporten? | Can an employer change the hours on your timesheet? | Guide / Får arbetsgivaren ändra timmarna? | 1 200-1 500 |
| `/arbetstid-per-manad` (+ `/2026`, `/2027`) | Arbetstid per månad: timmar och arbetsdagar (year: Arbetstid per månad 2026) | Working hours per month in Sweden | Tabell / Arbetstid per månad (year: 2026 / Arbetstimmar och arbetsdagar 2026) | hub 700-900, year 400-600 + table, en 800-1 000 |
| `/timanstallda` | Tidrapport för timanställda | Hours tracking for hourly employees | För timanställda / Timmarna, synliga för båda | 1 000-1 200 |
| `/guide/basta-gratis-tidrapportering` | Bästa gratis appar för tidrapportering 2026, jämförda ärligt | The best free timesheet apps in 2026, compared honestly | Jämförelse 2026 / Bästa gratis tidrapportering | 2 200-2 800 |
| `/guide/personalliggare-eller-tidrapport` | Personalliggare eller tidrapport: vad är skillnaden? | Sweden's staff register (personalliggare), explained | Guide / Personalliggare eller tidrapport? | 1 500-1 800 |
| `/guide/arbetstidslagen` | Arbetstidslagen för arbetsgivare | The Swedish Working Hours Act for employers | Guide / Arbetstidslagen för arbetsgivare | 1 800-2 200 |
| `/tidrapportering-cafe-restaurang` | Tidrapportering för café och restaurang | Staff hours tracking for cafés and restaurants | Café och restaurang / Timmarna för kök och servering | 900-1 100 |
| `/tidrapportering-stadfirma` | Tidrapportering för städfirma | Hours tracking for cleaning companies | Städfirma / Städpersonalens timmar, dag för dag | 900-1 100 |
| `/tidrapportering-frisor-salong` | Tidrapportering för frisör och salong | Staff hours tracking for hair and beauty salons | Frisör och salong / Salongens timmar i appen | 900-1 100 |
| `/tidrapportering-butik` | Tidrapportering för butik och handel | Staff hours tracking for shops and retail | Butik och handel / Butikspersonalens timmar per dag | 900-1 100 |
| `/om` | Om Klokka | About Klokka | Om Klokka / Byggd i Sverige, öppen för alla | 500-800 |
| `/integritet` | Integritetspolicy | Privacy policy | Integritet / Så hanterar Klokka dina uppgifter | 900-1 300 |

