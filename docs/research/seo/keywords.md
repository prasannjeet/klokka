# Klokka keyword research (klokka.se, launch day 2026-09-29)

## 0. Read this first: data coverage

- **DataForSEO balance ran out after 4 calls.** The account balance is now **-0.16 USD** (checked through the free
  `/v3/appendix/user_data` endpoint); every further call returns `HTTP 402 Payment Required`.
- What was fetched (all **Sweden, location 2752, language sv**):
  1. `dataforseo_labs_google_keyword_overview`, 40 keywords (volume, CPC, competition, KD where available, intent,
     average backlinks of the ranking pages). 27 came back with data.
  2. `kw_data_google_ads_search_volume`, 3 calls x 10 keywords (volume, CPC, competition; no KD, no intent).
- What was **not** fetched: every English keyword (UK, US, English-in-Sweden), keyword ideas/suggestions/related
  (the first ideas call already hit 402), SERP pulls, KD for keywords outside the Labs database.
- Marking convention in all tables:
  - a plain number = from DataForSEO.
  - `n/a` = DataForSEO returned no value for that field (keyword not in its database, or no Ads data).
  - `(unmeasured)` = never queried because the balance ran out. **No number in this document is invented.**
  - Anything marked **[web]** comes from a web search, not DataForSEO.
- Difficulty proxy: DataForSEO KD is missing for most Swedish keywords, so the "RD top10" column gives the **average
  referring domains of the pages currently ranking** (Labs `avg_backlinks_info.referring_domains`) and "Dom rank" their
  average main-domain rank. Low RD (under ~3) = beatable by a new domain with a genuinely good page.
- Google Ads buckets close variants: `tidsrapportering` returns exactly the numbers of `tidrapportering`, and
  `timrapport mall` exactly those of `tidrapport mall`. Treat each pair as one search demand, never add them up.
- Several `tidrapportering*` keywords spiked in **2025-09** (2 400 / 1 600 / 480 against a ~1 000 baseline). Treat
  the 12-month average, not the spike, as demand.

## 1. Swedish keyword data (Sweden, sv)

Source column: **L** = Labs keyword overview, **A** = Google Ads search volume.

### 1.1 Core product terms

| Keyword | Vol/mo | KD | CPC (USD) | Comp | Intent | RD top10 | Dom rank | Src |
|---|---:|---:|---:|---|---|---:|---:|---|
| tidrapportering | 1 300 | n/a | 23.68 | MEDIUM 0.65 | informational | 6.6 | 297 | L |
| tidsrapportering (same bucket as above) | 1 300 | n/a | 23.68 | MEDIUM | n/a | n/a | n/a | A |
| tidrapport | 1 000 | 2 | 10.13 | MEDIUM 0.55 | informational | 11.1 | 333 | L |
| tidrapportering app | 320 | n/a | 23.93 | HIGH 0.69 | navigational (+transactional) | 1.6 | 416 | L |
| tidrapporteringssystem | 210 | n/a | 37.02 | MEDIUM 0.65 | transactional (+commercial) | 2.2 | 293 | L |
| timrapport | 210 | n/a | 7.89 | LOW | n/a | n/a | n/a | A |
| tidrapportering anställda | 110 | n/a | 16.65 | HIGH | n/a | n/a | n/a | A |
| tidrapport app | 70 | 6 | 16.47 | HIGH 0.76 | informational (+transactional) | 6.7 | 512 | L |
| tidrapportering gratis | 70 | n/a | 2.97 | HIGH | n/a | n/a | n/a | A |
| tidrapport gratis | 20 | n/a | 5.79 | HIGH 0.69 | informational | n/a | n/a | L |
| tidrapportering företag | 20 | n/a | 32.85 | MEDIUM | n/a | n/a | n/a | A |
| gratis tidrapportering | 10 | n/a | 1.44 | HIGH 0.86 | informational | 1.3 | 344 | L |
| tidrapport app gratis | 10 | n/a | 6.87 | HIGH | n/a | n/a | n/a | A |
| tidrapportering personal | 10 | n/a | n/a | n/a | n/a | n/a | n/a | A |
| tidrapport program | 10 | n/a | 3.46 | HIGH | n/a | n/a | n/a | A |
| arbetstidsrapport | 10 | n/a | 4.55 | MEDIUM | n/a | n/a | n/a | A |
| arbetstid app | 10 | n/a | n/a | HIGH 0.86 | navigational | n/a | n/a | L |
| registrera arbetstid | 10 | n/a | 33.68 | MEDIUM 0.54 | informational | n/a | n/a | L |
| tidrapportering småföretag | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| tidrapport timanställda | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| tidrapport anställda | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| logga arbetstimmar | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| öppen källkod tidrapport | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| arbetstidsregistrering | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| tidstämpling app | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |

Reading: demand concentrates in three head terms (`tidrapportering`, `tidrapport`, `tidrapportering app`); the
"småföretag / timanställda / anställda" long tail the product is built for is close to zero measured volume. CPCs of
16-37 USD show that paying competitors (Visma/Spiris, Fortnox, Jibble, Nuba, TimeTjek and others) fight for exactly
these terms, which is why the free-and-open-source angle is the differentiator, not the head term.

### 1.2 Tools and templates (calculators, mallar)

| Keyword | Vol/mo | KD | CPC (USD) | Comp | Intent | RD top10 | Dom rank | Src |
|---|---:|---:|---:|---|---|---:|---:|---|
| räkna timmar | 590 | n/a | n/a | LOW 0.00 | informational | 1.7 | 164 | L |
| timräknare | 590 | n/a | 0.73 | HIGH 1.00 | transactional (+informational) | 1.9 | 320 | L |
| räkna ut arbetstid | 390 | n/a | n/a | LOW | n/a | n/a | n/a | A |
| tidrapport mall | 260 | n/a | 4.99 | MEDIUM 0.51 | informational | **0.3** | 412 | L |
| timrapport mall (same bucket as above) | 260 | n/a | 4.99 | MEDIUM | n/a | n/a | n/a | A |
| arbetstid per månad | 210 | 43 | n/a | LOW 0.00 | informational | 7.8 | 213 | L |
| räkna arbetstimmar | 210 | n/a | 1.30 | LOW 0.01 | informational | 1.5 | 170 | L |
| timmar per månad | 170 | n/a | n/a | LOW | n/a | n/a | n/a | A |
| tidrapport excel | 50 | n/a | n/a | LOW 0.14 | informational | **0.1** | 285 | L |
| tidrapport mall excel | 30 | n/a | 6.23 | LOW 0.22 | informational | 0.5 | 372 | L |
| timlista | 10 | n/a | n/a | LOW | n/a | n/a | n/a | A |
| timlista mall | 10 | n/a | 3.98 | LOW 0.29 | navigational | n/a | n/a | L |
| arbetstidskalkylator | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| arbetstid kalkylator | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| timlista excel | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |

Reading: this is the best cluster for a brand-new domain. Combined ~2 000 searches/month (the `räkna`/`timräknare`
group is one intent family, so expect overlap), and the pages ranking today average **0.1 to 1.9 referring domains**.
`timlista` is essentially dead in Sweden (10/mo); use `tidrapport mall` / `timrapport` wording instead.
Caveat (inference): `timräknare` and `räkna timmar` partly mean "time between two clock times / dates" (a generic
calculator); a work-hours calculator that also does that exact job will capture it, a narrow one will not.

### 1.3 Informational / legal / adjacent

| Keyword | Vol/mo | KD | CPC (USD) | Comp | Intent | RD top10 | Dom rank | Src |
|---|---:|---:|---:|---|---|---:|---:|---|
| arbetstidslagen | 4 400 | 14 | 2.15 | LOW 0.04 | informational | 13.9 | **454** | L |
| personalliggare | 1 000 | n/a | 7.03 | MEDIUM 0.60 | informational (+navigational) | 2.3 | 368 | L |
| stämpelklocka | 720 | n/a | 7.95 | HIGH 0.99 | transactional | 2.2 | 281 | L |
| timanställd | 590 | n/a | 0.26 | LOW 0.03 | transactional | 0.2 | 421 | L |
| schema app | 260 | 6 | 13.08 | LOW 0.17 | navigational | 74.1 | 542 | L |
| stämpelklocka app | 110 | n/a | 7.93 | MEDIUM 0.41 | transactional | 2.5 | 446 | L |
| digital personalliggare | 70 | n/a | 10.97 | HIGH 0.69 | navigational | 2.0 | 409 | L |
| personalliggare restaurang | 70 | n/a | 8.53 | MEDIUM | n/a | n/a | n/a | A |
| personalliggare app | 40 | n/a | 8.23 | HIGH 0.74 | navigational | 0.9 | 516 | L |
| stämpelklocka app gratis | 40 | n/a | 6.00 | HIGH 0.76 | informational (+transactional) | 3.5 | 443 | L |
| personalliggare gratis | 20 | n/a | 7.78 | HIGH 0.71 | informational | n/a | n/a | L |
| närvaroregistrering | 10 | n/a | n/a | LOW | n/a | n/a | n/a | A |
| personalliggare frisör | 10 | n/a | 9.07 | MEDIUM | n/a | n/a | n/a | A |
| stämpelklocka gratis | 10 | n/a | n/a | HIGH | n/a | n/a | n/a | A |
| arbetstidslagen dokumentation | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| dokumentera arbetstid | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |
| personalliggare städ | n/a | n/a | n/a | n/a | n/a | n/a | n/a | A |

Notes:
- `arbetstidslagen` KD 14 looks easy but the ranking pages sit on very strong domains (avg domain rank 454:
  riksdagen, Arbetsmiljöverket, unions, Verksamt). Realistic for a new domain: **no** on the head term, **yes** on
  employer-specific long tail (documentation duty, how to record hours) linked from one guide.
- `timanställd` (590) is mostly employees reading about their rights (inference from the near-zero CPC); it converts
  poorly, but an employer-side guide can pick up a slice.
- `schema app` and anything `schemaläggning` is out of scope for v1 (and the SERP is heavy, RD 74). Do not target it.
- `stämpelklocka*` is a feature Klokka does not have. Target it only with an honest comparison guide, never a
  landing page that implies clock-in.

## 2. Personalliggare: relevance, risk and opportunity

- **Fact [web]:** Skatteverket requires an electronic personalliggare in restaurang (which covers cafés with
  servering), frisör, bygg, tvätteri, and since 2021-07-01 also kropps- och skönhetsvård, fordonsservice and
  livsmedels-/tobaksgrossister. Exempt: businesses where only the owner, spouse or children under 16 work. Records
  are kept for two years after the end of the calendar year of the tax year. Cleaning firms (städ) are **not** in the
  confirmed list from these sources; verify on skatteverket.se before writing anything about städ.
- **Klokka is not a personalliggare.** A personalliggare records each person's identity (name and personnummer) and
  the start and end time *as it happens*, at the workplace, available on site for Skatteverket's unannounced
  inspections. Klokka is the employer logging daily hours afterwards, with no clock-in, no personnummer, and no
  on-site inspection view (the last three are inference from the v1 scope, and the exact legal requirements should be
  checked against Skatteverket's rules before publishing).
- **Risk:** Klokka's core verticals (café, restaurant, salon) are exactly the personalliggare industries. An owner who
  believes Klokka covers the obligation risks a kontrollavgift at inspection. Every vertical page for those industries
  must say plainly "Klokka ersätter inte en personalliggare" and link to Skatteverket. Never use `personalliggare` in a
  title or H1 of a product page.
- **Opportunity:** 1 000 searches/month with weak ranking pages (RD 2.3). An honest guide, "Personalliggare eller
  tidrapport: vad är skillnaden?", answers a real question those owners have (they need both: the ledger for
  Skatteverket, the monthly hours for pay) and positions Klokka as the second half. It can rank; it will convert
  modestly. Also a later product idea (not v1): a personalliggare mode would open a 1 000/mo + CPC 7-11 USD market,
  but it carries legal certification-like obligations. That is a product decision, not an SEO one.

## 3. English keywords (UK, US, English-in-Sweden)

**No English numbers were fetched** (balance exhausted before the first English call). Everything below is
`(unmeasured)`. Qualitative notes are inference unless marked [web].

| Keyword | Vol UK | Vol US | KD | CPC | Intent | Expected difficulty for a new domain (inference) |
|---|---|---|---|---|---|---|
| time tracking for small business | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | commercial | very hard (Toggl, Clockify, Homebase, Connecteam, review sites) |
| free employee hours tracker | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | commercial | hard |
| employee timesheet app free | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | commercial | hard |
| hours tracker for employees | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | commercial | hard |
| track employee hours app | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | commercial | hard |
| log employee hours | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | informational/commercial | medium |
| timesheet template | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | informational | very hard (Microsoft, Smartsheet, Vertex42) |
| work hours calculator monthly | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | informational | medium (tool SERP) |
| open source time tracking | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | commercial | medium; SERP is listicles naming Kimai, solidtime, Traggo, TimeTagger, Anuko [web] |
| open source timesheet software | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | commercial | medium; Kimai owns "open source timesheet" [web] |
| self-hosted time tracking | (unmeasured) | (unmeasured) | (unmeasured) | (unmeasured) | commercial | medium; best English angle, list inclusion on GitHub/awesome-selfhosted/alternativeto matters more than on-page |

English strategy (inference): the global English head terms are out of reach for a long time. The English site's
realistic wins are (1) the open-source / self-hosted cluster, where Klokka's MIT license and Docker images are a real
differentiator and the competition is a handful of open-source projects, (2) "Kimai alternative" / "Clockify
alternative for hourly staff" pages, and (3) Nordic expats searching in English for Swedish rules
("working hours sweden", "timesheet sweden"), unmeasured.

## 4. Clusters and new-domain realism (Sweden)

Realism scale for a domain with zero links: **Easy** = page-quality win in 1-3 months; **Medium** = needs a few links
and 3-9 months; **Hard** = 9+ months and real link building; **Skip** = not worth targeting now.

| Cluster | Keywords (vol/mo) | Realism | Why |
|---|---|---|---|
| (a) Homepage head | tidrapportering 1 300, tidrapport 1 000, tidrapportering app 320, tidrapporteringssystem 210, tidrapportering gratis 70 | **Hard** (head), **Medium** (gratis/app variants) | CPC 23-37 USD, paid SaaS competing; ranking pages avg 6.6-11 RD. `tidrapportering app` has RD 1.6, the best head bet. |
| (b) Solution pages | tidrapportering anställda 110, tidrapporteringssystem 210, tidrapport app 70, tidrapport timanställda n/a, tidrapportering småföretag n/a | **Medium** | Small but high-intent. The "småföretag/timanställda" words have no measured volume; they are for relevance and conversion copy, not traffic. |
| (c) Industry pages | personalliggare restaurang 70, personalliggare frisör 10; "tidrapportering restaurang/café/städfirma/frisör/butik" (unmeasured) | **Easy** to rank, low volume | Low competition long tail; value is conversion and ad landing, not traffic. Must carry the personalliggare disclaimer. |
| (d) Free tools / templates | räkna timmar 590, timräknare 590, räkna ut arbetstid 390, tidrapport mall 260, arbetstid per månad 210, räkna arbetstimmar 210, timmar per månad 170, tidrapport excel 50, tidrapport mall excel 30 | **Easy to Medium** | Ranking pages have 0.1-1.9 RD (except arbetstid per månad, 7.8, KD 43). The main traffic engine for year one and a natural link magnet. |
| (e) Comparison / alternatives | alternativ till Personalkollen, Planday, Quinyx, Jibble, Nuba, TimeTjek, Spiris (all unmeasured) | Unknown until measured | Each "alternativ till X" is usually 10-50/mo in Sweden (inference). Build 2-3 after measuring, prioritising tools whose free tier or pricing pushes small employers away. |
| (f) Guides | arbetstidslagen 4 400, personalliggare 1 000, tidrapport 1 000 (info intent), stämpelklocka 720, timanställd 590 | **Hard** (arbetstidslagen head), **Medium** (personalliggare, tidrapport, stämpelklocka guides) | Informational SERPs with weak pages except arbetstidslagen (government/union domains). |

## 5. Final keyword map

Conventions: sv slugs at root (Swedish, ASCII, no å/ä/ö), en under `/en/...`. Titles at most 60 characters,
meta descriptions at most 155 (all counted, see section 7). Brand suffix `| Klokka` where it fits. No pricing words;
"gratis", "free to use", "öppen källkod" and "open source" only. Volumes are Sweden/sv from DataForSEO; English is
unmeasured throughout.

Priority: **P1** build at launch, **P2** within 1-2 months, **P3** later / after measurement.

### 5.1 Homepage (cluster a) [P1]
- sv URL: `/` | en URL: `/en`
- Primary sv: **tidrapportering** (1 300, CPC 23.68)
- Secondary sv: tidrapportering gratis (70), tidrapport (1 000), tidrapportering anställda (110)
- Primary en: **free employee hours tracker** (unmeasured)
- Secondary en: time tracking for small business, hours tracker for employees, employee timesheet app free (all unmeasured)
- Title sv: Tidrapportering för småföretag, gratis och öppen | Klokka
- Meta sv: Logga dina anställdas timmar dag för dag och se samma månad som de gör. Gratis att använda, öppen källkod, på webben och Android.
- Title en: Free employee hours tracker for small teams | Klokka
- Meta en: Log the hours each employee worked, day by day, and both of you see the same month. Free to use, open source, on the web and Android.

### 5.2 App page (cluster a/b) [P1]
- sv URL: `/tidrapportering-app` | en URL: `/en/employee-hours-app`
- Primary sv: **tidrapportering app** (320, CPC 23.93, RD 1.6)
- Secondary sv: tidrapport app (70, KD 6), tidrapport app gratis (10), arbetstid app (10)
- Primary en: **employee timesheet app free** (unmeasured)
- Secondary en: track employee hours app, hours tracker for employees (unmeasured)
- Title sv: Tidrapportering app för Android och webben | Klokka
- Meta sv: Klokkas app visar månadens timmar direkt i mobilen. Pushnotis när timmar ändras, flagga fel rad, mörkt läge. Gratis och öppen källkod.
- Title en: Employee timesheet app for Android and web | Klokka
- Meta en: See the month's hours on your phone. Push notifications when hours change, flag a wrong entry, dark mode. Free to use and open source.

### 5.3 Small-business solution page (cluster b) [P1]
- sv URL: `/tidrapportering-smaforetag` | en URL: `/en/small-business-time-tracking`
- Primary sv: **tidrapportering anställda** (110, CPC 16.65)
- Secondary sv: tidrapporteringssystem (210, CPC 37.02), tidrapportering småföretag (n/a), tidrapportering personal (10), tidrapportering företag (20)
- Primary en: **time tracking for small business** (unmeasured)
- Secondary en: log employee hours, track employee hours (unmeasured)
- Title sv: Tidrapportering för anställda i småföretag | Klokka
- Meta sv: För dig med några få anställda: fyll i veckan på en minut, lås månaden och exportera till CSV. Alla ändringar sparas i historiken.
- Title en: Time tracking for small businesses with hourly staff
- Meta en: For employers with a handful of staff: fill in the week in a minute, lock the month and export to CSV. Every change is kept in the history.

### 5.4 Hourly staff page (cluster b) [P2]
- sv URL: `/timanstallda` | en URL: `/en/hourly-employees`
- Primary sv: **tidrapport timanställda** (n/a in DataForSEO)
- Secondary sv: timanställd (590, CPC 0.26), timrapport (210), timmar per månad (170)
- Primary en: **hours tracker for hourly employees** (unmeasured)
- Title sv: Tidrapport för timanställda, samma siffror för båda | Klokka
- Meta sv: Timanställda ser varje dag du loggat, får en notis vid ändring och kan flagga fel. Visa lön per timme om du vill. Gratis att använda.
- Title en: Hours tracking for hourly employees | Klokka
- Meta en: Hourly staff see every day you log, get a notification when it changes and can flag a mistake. Show pay per hour if you want. Free to use.

### 5.5 Open source / self-hosting page (cluster b, strongest English page) [P1]
- sv URL: `/oppen-kallkod` | en URL: `/en/open-source`
- Primary sv: **öppen källkod tidrapport** (n/a)
- Secondary sv: tidrapportering gratis (70), gratis tidrapportering (10)
- Primary en: **open source time tracking** (unmeasured)
- Secondary en: self-hosted time tracking, open source timesheet software (unmeasured)
- Title sv: Tidrapportering med öppen källkod (MIT) | Klokka
- Meta sv: Klokka är öppen källkod under MIT-licens. Använd vår tjänst gratis eller kör hela Klokka på din egen server. Koden finns på GitHub.
- Title en: Open source, self-hosted time tracking (MIT) | Klokka
- Meta en: Klokka is MIT licensed. Use the hosted service for free or run all of Klokka on your own server. The code is on GitHub.
- Note: self-hosting today needs the API, web app, PostgreSQL and a Logto instance (repo README/docs). Publish a
  self-hosting guide before this page promises "run it yourself" prominently; the page is the English SEO anchor.

### 5.6 Industry pages (cluster c) [P2]
All four carry, above the fold or in the first section, "Klokka ersätter inte en personalliggare" with a link to
Skatteverket where the industry is covered (café/restaurang, frisör/salong). Target volumes for "tidrapportering +
bransch" are **unmeasured**; the pages exist for relevance, conversion and ads, not raw traffic.

| Page | sv URL | en URL | Primary sv | Secondary sv | Primary en |
|---|---|---|---|---|---|
| Café & restaurang | `/tidrapportering-cafe-restaurang` | `/en/cafes-restaurants` | tidrapportering restaurang (unmeasured) | tidrapport café (unmeasured), personalliggare restaurang (70, only as a clearly-labelled FAQ answer) | staff hours tracker for cafes (unmeasured) |
| Städfirma | `/tidrapportering-stadfirma` | `/en/cleaning-companies` | tidrapportering städfirma (unmeasured) | tidrapport städ (unmeasured), tidrapportering anställda (110) | cleaning staff hours tracker (unmeasured) |
| Frisör & salong | `/tidrapportering-frisor-salong` | `/en/salons` | tidrapportering frisör (unmeasured) | tidrapport salong (unmeasured), personalliggare frisör (10, FAQ only) | salon staff hours tracker (unmeasured) |
| Butik | `/tidrapportering-butik` | `/en/shops` | tidrapportering butik (unmeasured) | tidrapport butik (unmeasured), timanställd (590) | retail staff hours tracker (unmeasured) |

Titles and metas:
- Café & restaurang
  - Title sv: Tidrapportering för café och restaurang | Klokka
  - Meta sv: Logga timmarna för kök och servering per dag och se månaden växa. Personalen ser samma siffror. Gratis att använda, öppen källkod.
  - Title en: Staff hours tracking for cafés and restaurants | Klokka
  - Meta en: Log kitchen and floor staff hours per day and watch the month add up. Your staff see the same numbers. Free to use and open source.
- Städfirma
  - Title sv: Tidrapportering för städfirma med timanställda | Klokka
  - Meta sv: Håll koll på städpersonalens timmar dag för dag, lås månaden och exportera till CSV inför lönen. Gratis att använda, öppen källkod.
  - Title en: Hours tracking for cleaning companies | Klokka
  - Meta en: Track your cleaners' hours day by day, lock the month and export to CSV for payroll. Free to use and open source, on web and Android.
- Frisör & salong
  - Title sv: Tidrapportering för frisör och salong | Klokka
  - Meta sv: Logga timmarna för salongens personal och låt dem se sin månad i appen. Fel flaggas direkt. Gratis att använda och öppen källkod.
  - Title en: Staff hours tracking for hair and beauty salons | Klokka
  - Meta en: Log your salon staff's hours and let them see their month in the app. Mistakes get flagged right away. Free to use and open source.
- Butik
  - Title sv: Tidrapportering för butik och handel | Klokka
  - Meta sv: Logga butikspersonalens timmar per dag, se trender över månaden och exportera till CSV. Gratis att använda, på webben och Android.
  - Title en: Staff hours tracking for shops and retail | Klokka
  - Meta en: Log shop staff hours per day, see trends across the month and export to CSV. Free to use, open source, on the web and Android.

### 5.7 Free tool: work-hours calculator (cluster d) [P1]
- sv URL: `/rakna-arbetstimmar` | en URL: `/en/work-hours-calculator`
- Primary sv: **räkna ut arbetstid** (390)
- Secondary sv: räkna timmar (590), timräknare (590, CPC 0.73), räkna arbetstimmar (210, CPC 1.30)
- Primary en: **work hours calculator monthly** (unmeasured)
- Scope: start/end/rast per day, week and month totals, optional hourly wage; must also do plain "time between two
  clock times" so it satisfies the generic `räkna timmar` intent. CTA: "Spara det i Klokka i stället".
- Title sv: Räkna ut arbetstid: gratis timräknare | Klokka
- Meta sv: Räkna ut arbetstid och timmar på sekunder. Ange start, slut och rast per dag, så summerar vi veckan och månaden. Gratis, inget konto.
- Title en: Work hours calculator: daily, weekly, monthly | Klokka
- Meta en: Work out hours worked from start, end and break times. See the week and month total instantly. Free, no account needed.

### 5.8 Free tool: working hours per month (cluster d) [P2]
- sv URL: `/arbetstid-per-manad` (with yearly children, e.g. `/arbetstid-per-manad/2026`) | en URL: `/en/working-hours-per-month-sweden`
- Primary sv: **arbetstid per månad** (210, KD 43, RD 7.8)
- Secondary sv: timmar per månad (170), arbetstimmar oktober 2026 and other month variants (unmeasured)
- Primary en: **working hours per month sweden** (unmeasured)
- Content: full-time hours per month for the current and next year with Swedish public holidays, generated from a
  holiday table (deterministic, no manual yearly edit).
- Title sv: Arbetstid per månad 2026: timmar och arbetsdagar | Klokka
- Meta sv: Hur många arbetstimmar och arbetsdagar har varje månad 2026? Tabell med röda dagar inräknade, för heltid och deltid.
- Title en: Working hours per month in Sweden, 2026 | Klokka
- Meta en: How many working hours and working days does each month of 2026 have in Sweden? Public holidays included, full time and part time.

### 5.9 Free template: tidrapport mall (cluster d) [P1]
- sv URL: `/tidrapport-mall` | en URL: `/en/timesheet-template`
- Primary sv: **tidrapport mall** (260, CPC 4.99, RD 0.3; same demand as `timrapport mall`)
- Secondary sv: tidrapport excel (50, RD 0.1), tidrapport mall excel (30), timrapport (210), timlista (10)
- Primary en: **timesheet template** (unmeasured; very hard in English, keep as a secondary English page)
- Content: downloadable monthly template (xlsx and PDF, generated at build time), how to fill it, then "or let both
  sides see it live in Klokka".
- Title sv: Tidrapport mall: gratis i Excel och PDF | Klokka
- Meta sv: Ladda ner en gratis tidrapport mall för månaden i Excel eller PDF. Fyll i timmar per dag och få summan direkt. Ingen registrering.
- Title en: Free monthly timesheet template (Excel and PDF) | Klokka
- Meta en: Download a free monthly timesheet template in Excel or PDF. Fill in hours per day and get the total automatically. No sign-up.

### 5.10 Comparison / alternatives (cluster e) [P3, measure first]
No volume was measured. Competitors seen in the Swedish SERP for "tidrapportering app gratis" [web]: Jibble, Spiris,
Nuba, atWork, TimeplanGo, Capterra listings, plus Personalkollen, TimeTjek and Kandiflow on personalliggare queries.
English open-source set [web]: Kimai, solidtime, Traggo, TimeTagger, Anuko Time Tracker.
Build the two or three with the highest measured volume, each as an honest feature table (what they do that Klokka
does not: clock-in, scheduling, payroll export).

| Page | sv URL | en URL | Primary keyword |
|---|---|---|---|
| Hub | `/alternativ` | `/en/alternatives` | alternativ tidrapportering / time tracking alternatives |
| Personalkollen | `/alternativ/personalkollen` | (sv only) | alternativ till personalkollen |
| Planday | `/alternativ/planday` | `/en/alternatives/planday` | alternativ till planday / planday alternative |
| Jibble | `/alternativ/jibble` | `/en/alternatives/jibble` | alternativ till jibble / jibble alternative |
| Kimai | (en only) | `/en/alternatives/kimai` | kimai alternative |
| Clockify | `/alternativ/clockify` | `/en/alternatives/clockify` | clockify alternative for hourly staff |

Template titles and metas (swap the name):
- Title sv: Alternativ till Planday för småföretag | Klokka
- Meta sv: Letar du efter ett enklare alternativ till Planday? Klokka loggar anställdas timmar per dag, gratis och med öppen källkod. Se skillnaderna.
- Title en: Planday alternative for small teams | Klokka
- Meta en: Looking for a simpler Planday alternative? Klokka logs employee hours per day, free to use and open source. See how the two compare.

### 5.11 Guide: personalliggare eller tidrapport (cluster f) [P1]
- sv URL: `/guide/personalliggare-eller-tidrapport` | en URL: `/en/guide/staff-register-sweden` (for expats running a café or salon)
- Primary sv: **personalliggare** (1 000, CPC 7.03, RD 2.3)
- Secondary sv: personalliggare restaurang (70), digital personalliggare (70), personalliggare app (40), personalliggare frisör (10)
- Primary en: **staff register sweden / personalliggare** (unmeasured)
- Must say clearly: which industries need one, that Klokka is not one, and why you still need monthly hours for pay.
- Title sv: Personalliggare eller tidrapport: vad är skillnaden?
- Meta sv: Vilka branscher måste ha personalliggare, vad ska den innehålla och varför behövs tidrapporten ändå för lönen? En enkel genomgång.
- Title en: Staff register (personalliggare) in Sweden explained
- Meta en: Which Swedish businesses need a personalliggare, what it must record, and why you still need monthly hours for pay. A plain guide.

### 5.12 Guide: tidrapport (cluster f) [P1]
- sv URL: `/guide/tidrapport` | en URL: `/en/guide/how-to-track-employee-hours`
- Primary sv: **tidrapport** (1 000, KD 2, CPC 10.13, informational)
- Secondary sv: hur för man tidrapport (unmeasured), timrapport (210), arbetstidsrapport (10)
- Primary en: **log employee hours** (unmeasured)
- Title sv: Tidrapport: vad den ska innehålla och hur du för den
- Meta sv: Allt en arbetsgivare behöver veta om tidrapporten: vad den ska innehålla, hur länge den sparas och hur du gör det enkelt varje månad.
- Title en: How to track employee hours: a practical guide
- Meta en: What an employee hours record should contain, how long to keep it, and a simple routine that makes month end painless.

### 5.13 Guide: arbetstidslagen för arbetsgivare (cluster f) [P2]
- sv URL: `/guide/arbetstidslagen` | en URL: `/en/guide/swedish-working-hours-act`
- Primary sv: **arbetstidslagen** (4 400, KD 14, CPC 2.15; head is Hard, domain rank 454 on the SERP)
- Secondary sv: arbetstidslagen dokumentation (n/a), dokumentera arbetstid (n/a), arbetstid per månad (210)
- Primary en: **swedish working hours act** (unmeasured)
- Angle: the employer's duty to record hours (sammanställning av arbetstid), overtime limits, rest rules, in plain
  words, linking to riksdagen.se for the law text. Aim for the long tail, not the head.
- Title sv: Arbetstidslagen för arbetsgivare: så dokumenterar du tiden
- Meta sv: Vad arbetstidslagen kräver av dig som arbetsgivare: övertid, vila och dokumentation av arbetstid. Kort och konkret, med länkar till lagtexten.
- Title en: Swedish Working Hours Act for employers, in plain words
- Meta en: What the Swedish Working Hours Act asks of employers: overtime, rest and recording hours. Short and concrete, with links to the law.

### 5.14 Guide: stämpelklocka eller tidrapport (cluster f) [P3]
- sv URL: `/guide/stampelklocka-eller-tidrapport` | en URL: none (skip)
- Primary sv: **stämpelklocka** (720, CPC 7.95, transactional, RD 2.2)
- Secondary sv: stämpelklocka app (110), stämpelklocka app gratis (40), stämpelklocka gratis (10)
- Honest angle: when a clock-in system is worth it and when the employer entering hours is simpler. Transactional SERP
  means low conversion for a product without clock-in; build last.
- Title sv: Stämpelklocka eller tidrapport: vad passar ditt företag?
- Meta sv: Stämpelklocka, app eller att arbetsgivaren loggar timmarna? Så väljer du rätt sätt att hålla koll på arbetstiden i ett litet företag.

## 6. Not recommended now
- `schema app` (260), anything schemaläggning: not in v1, heavy SERP (RD 74).
- `personalliggare` in any product title/H1: legal risk (section 2).
- English head terms ("time tracking for small business", "timesheet template") as primary targets for the homepage
  of a new domain: dominated by large SaaS and Microsoft; keep them secondary.
- `timlista` / `timlista mall` as page targets: 10/mo.

## 7. Validation and next data run
- All titles are at most 60 characters and all metas at most 155 characters (checked with a script on this file); no
  em dash anywhere in the proposed copy.
- **When DataForSEO is topped up**, three calls finish the job (about 1-2 USD):
  1. `keyword_overview`, location United Kingdom, en, and again United States, en: time tracking for small business,
     free employee hours tracker, employee timesheet app free, hours tracker for employees, open source time tracking,
     timesheet template, track employee hours app, log employee hours, work hours calculator monthly, open source
     timesheet software, self-hosted time tracking, kimai alternative, clockify alternative, planday alternative,
     jibble alternative, working hours per month sweden, personalliggare, staff register sweden.
  2. `kw_data_google_ads_search_volume`, Sweden, sv: tidrapportering restaurang, tidrapportering städfirma,
     tidrapportering frisör, tidrapportering butik, tidrapport café, alternativ till personalkollen, planday alternativ,
     quinyx alternativ, jibble alternativ, personalkollen, planday, quinyx, arbetstimmar oktober 2026,
     arbetsdagar 2026, hur för man tidrapport.
  3. `keyword_ideas` Sweden/sv on `tidrapportering`, `räkna timmar`, `tidrapport mall` with volume >= 30, to find the
     long tail this run could not.
- Once Search Console is connected, replace the unmeasured cells with real impressions after 4-6 weeks.

## Sources (web, not DataForSEO)
- [Personalliggare, Skatteverket](https://www.skatteverket.se/foretag/etjansterochblanketter/svarpavanligafragor/personalliggare.4.3dfca4f410f4fc63c8680005658.html)
- [Nya branscher och regler för personalliggare, Skatteverket via Cision](https://news.cision.com/se/skatteverket/r/nya-branscher-och-regler-for-personalliggare,c2559593)
- [Personalliggare: vad gäller? Personalkollen](https://personalkollen.se/nyheter/vad-ar-en-personalliggare/)
- [Jibble tidrapport app](https://www.jibble.io/sv/app-for-tidrapporter), [Spiris](https://www.spiris.se/ekonomiplattform/tid-projektplanering/app), [Nuba](https://nuba.se/tidrapportering-app/), [TimeplanGo](https://timeplango.com/sv/produkt/tidrapportering)
- [Kimai open-source timesheet](https://www.kimai.org/en/open-source-timesheet), [Best open-source time tracking apps 2026](https://super-productivity.com/blog/best-open-source-time-tracking-apps-2026/)
