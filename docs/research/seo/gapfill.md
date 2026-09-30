# Klokka SEO gap-fill (free sources only, 2026-09-29)

Complements `research-keywords.md` and `research-competitors.md`. No DataForSEO call was made; Search Console is not
connected.

**Markers.** `[verified: URL]` = read today on that page (government text quoted from the law or the agency page).
`[signal: autocomplete]` = Google autocomplete returned it today (a demand signal, not a volume). `[inference]` =
judgement, not a fact.

**Autocomplete method.** Python `requests` against `suggestqueries.google.com/complete/search?client=firefox`,
**121 requests total** (106 in `ac.py`, 3 brand probes, 12 extra probes; cap 150), 0.5 s sleep, exit on any HTTP or
parse error, run under `timeout 300`. Raw output: `ac_results.json`, `ac_results_2.json` in this folder.
Limitation: the request comes from a Swedish IP; `gl=gb` and `gl=us` returned identical lists for 22 of 28 English
queries (and gb lists contain NZ/Australia terms), so treat the English results as "English-language demand", not
UK vs US demand [inference from the identical output].

---

## 1. Demand signals (autocomplete)

### 1.1 Swedish (hl=sv, gl=se)

| Seed | What autocomplete adds | Read |
|---|---|---|
| tidrapportering | app, app gratis, gratis, mall, mall excel, anställda, excel, företag, fortnox, i mobilen, papper, pdf, personal, timanställd, stämpelklocka, städ, restaurang, google sheets / google kalkylark, med gps, hantverkare gratis, bygg / byggföretag, konsult, projekt, åkeri, transport, flex, feriejobb; plus many employer-portal navigations (Randstad, Manpower, Poolia, Academic Work, Stockholms stad, Transpa, Medvind, a-kassa, Försäkringskassan, Arbetsförmedlingen) [signal: autocomplete] | A large share of the head term is **employees looking for their employer's or a-kassa's reporting portal**, not buyers. Confirms the plan: do not chase bare "tidrapportering". Buyer modifiers that do exist: `app gratis`, `gratis`, `anställda`, `timanställd`, `städ`, `restaurang`, `i mobilen`, `excel`/`google sheets`, `papper`. |
| tidrapport | mall pdf gratis, mall excel gratis, mall excel, mall gratis, mall månad, mall word, excel, excel formel, exempel, app, gratis, blankett (gratis), block, på papper, för timanställda, för anställda, timanställd (mall), google sheets, månad, program, system, skicka in / fylla i / godkänna tidrapport [signal: autocomplete] | The template cluster dominates the letter expansions (`mall`, `pdf`, `excel`, `word`, `blankett`, `block`, `papper`). Strong signal for a template page that ships **PDF, Excel, Word and Google Sheets** variants, plus a "för timanställda" version. |
| räkna arbetstid | timmar, i procent, i excel, app, räknas arbetstid i dagar eller timmar, räkna ut arbetstid per vecka / per dag / i timmar, räkna ut arbetstid försäkringskassan [signal: autocomplete] | The calculator must do per day, per week, hours, and "arbetstid i procent" (part-time percentage). |
| timanställd | sjuklön, semester, semesterersättning, rättigheter, engelska, pension, sjukskrivning, sjuk, löneförhöjning [signal: autocomplete] | Employee-rights intent (as the near-zero CPC suggested). Employer-side guides on `semesterersättning` and `sjuklön` are the reachable slice. |
| tidrapport mall | pdf gratis, excel gratis, excel, gratis, månad, pdf, word gratis, word, 2025, visma [signal: autocomplete] | Same as above; "månad" and a year variant ("2025") suggest a dated monthly template ("tidrapport mall 2026"). |
| arbetstid per månad | 2026, 2025, 2027, snitt, kommunal, timmar, handels, unionen [signal: autocomplete] | Year-specific pages are what people search. Build `/arbetstid-per-manad/2026` and `/2027` (section 2e has the numbers). |
| tidrapportering restaurang | only itself [signal: autocomplete] | Exists as a query, no expansions: tiny demand. |
| tidrapportering café / städfirma / frisör / butik | **no suggestions at all** [signal: autocomplete] | Below autocomplete's threshold. `tidrapportering städ` does appear as an expansion of the head term (letter s). Industry pages are for conversion and relevance, not traffic (as already planned). |

Question prefixes (sv):

| Prefix query | Suggestions [signal: autocomplete] |
|---|---|
| hur tidrapport | hur ser en tidrapport ut, hur skriver man tidrapport |
| vad är tidrapport | vad är tidrapport (a-kassa), vad är tidrapportering |
| får arbetsgivaren ändra | **får arbetsgivaren ändra tidrapport**, ... arbetstider, ... schemat hur som helst, ... mitt schema, ... arbetsuppgifter, får chefen ändra schema utan mitt medgivande (handels / kommunal) |
| måste man tidrapport | måste man tidrapportera, måste man tidrapportera varje vecka, när måste man tidrapportera |
| hur räknar man arbetstid | ... per år, hur räknar man arbetstimmar, ... ut arbetstid i procent / i timmar / i excel / per månad, förskjuten arbetstid, arbetstimmar per år |
| hur många timmar får en timanställd | ... jobba, ... jobba i månaden |
| får en timanställd | sjuklön, när får en timanställd övertid, får timanställd semesterersättning, får timanställd ob, hur mycket får en timanställd arbeta, ... i lön |
| hur många arbetstimmar | på en månad, på ett år, juni 2026, 2026, i juli 2026, i augusti 2026, per månad 2026, på en månad i snitt |
| arbetsdagar 2026 | per månad, juni, sverige, minus semester, kalender, januari, april, maj |
| arbetsdagar 2027 | per månad, antal arbetsdagar 2027, januari 2027, mars 2027, röda arbetsdagar 2027, sverige 2027 |
| vilka branscher personalliggare | vilka branscher måste ha personalliggare |
| (none) | `vad har timanställd rätt till`, `måste timanställd` returned nothing useful |

Takeaways (sv) [inference]:
- The arbetstid-per-månad page should have month-level anchors ("arbetstimmar juni 2026") and a "minus semester" line;
  those month-year strings are what people type.
- `får arbetsgivaren ändra tidrapport` is confirmed as a real query and is Klokka's best-fit guide (section 2c).
- `när får en timanställd övertid` and `hur många timmar får en timanställd jobba i månaden` both fit one employer guide
  (section 2d).

### 1.2 English (hl=en, gl=gb and gl=us; results near identical)

Each seed was queried four ways: `seed ␣`, `free seed`, `best seed`, and `seed for` (for `track employee hours`, the
fourth was `how to track employee hours`). "Contains seed" = unique suggestions that contain the exact seed phrase;
"unique" = all unique suggestions across the four queries. Both are a rough relative demand proxy, never a volume.

| Rank | Seed | Contains seed (gb / us) | Unique (gb / us) | Notable variants [signal: autocomplete] |
|---:|---|---:|---:|---|
| 1 | timesheet app | 36 / 36 | 36 / 36 | free, for employees, for small business, for multiple employees, for android, for iphone, free timesheet apps for employers, best timesheet app for small business / for employees / free; also xero, quickbooks, myob, tradies, construction |
| 2 | timesheet template | 34 / 35 | 37 / 38 | excel, google sheets, free, pdf, word, weekly, printable, for employees, **for multiple employees**, for casual employees, free ... download / editable |
| 3 | work hours calculator | 27 / 27 | 35 / 35 | with lunch, with break, pay, monthly, for month, week, 2 weeks / biweekly / fortnight, decimal, app, for employees, for year, formula |
| 4 | track employee hours | 22 / 22 | 35 / 35 | free, excel, app, software, quickbooks; **how to track employee hours** (+ for free, in excel, spreadsheet, working from home); best way / best app to track employee hours (free) |
| 5 | open source time tracking | 16 / 16 | 24 / 24 | software, app, github, **self hosted**, and invoicing, system, app android, android, windows; best / free open source time tracker |
| 6 | employee hours tracker | 10 / 10 | 25 / 25 | excel template, template, app, free, excel, tracking app, tracking spreadsheet; drifts to "work hours tracker" |
| 7 | self hosted time tracking | 4 / 4 | 14 / 14 | software, reddit, best self hosted time tracker, open source self hosted time tracking, self hosted work time tracker; `free self hosted time tracking` and `self hosted time tracking for` returned **nothing** |

Extra English probes (gb) [signal: autocomplete]:
- `working hours per month sweden` -> 2026, 2025, working days per month sweden 2026, average working hours per month sweden.
- `working days sweden` -> 2026, 2027, may 2026, june 2026, december 2025.
- `swedish working hours` -> **swedish working hours act**, per week, per day, per month, per year, for international students.
- `clockify alternative` -> alternatives free, **open source**, reddit, **self hosted clockify alternative**, alternativeto, best.
- `kimai alternative` -> open source, reddit. `jibble alternative` -> free, **jibble open source alternative**.
- `planday alternative` -> only generic "planday alternatives". `staff register sweden` -> nothing.
- `personalliggare` (English UI) -> skatteverket, restaurang, bygg, id06, mall, app, **engelska** (people want the English term).
- Swedish: `personalkollen alternativ` -> only itself; `planday alternativ` -> "planday alternative(s)". Swedish
  "alternativ till X" demand for these vendors is at or below the autocomplete threshold.

### 1.3 English primary keyword per English page

Recommendation per page of the keyword map (`research-keywords.md` section 5). Where it differs from the earlier map,
the reason is the autocomplete evidence above [inference from signal].

| Page (en URL) | Earlier primary (unmeasured) | **Recommended primary** | Secondary | Why |
|---|---|---|---|---|
| Homepage `/en` | free employee hours tracker | **free timesheet app for employees** | employee hours tracker free, free timesheet apps for employers, timesheet app for multiple employees | "timesheet app" is the strongest seed; "free timesheet app for employees" appears under both `timesheet app` and `free timesheet app`. "employee hours tracker" spawns few own variants and drifts to Excel templates. |
| App page `/en/employee-hours-app` (suggest slug `/en/timesheet-app`) | employee timesheet app free | **timesheet app for android** | employee hours tracker app, employee hours tracking app | Distinct from the homepage, matches the only native client, appears as a `timesheet app for` expansion. |
| Small business `/en/small-business-time-tracking` | time tracking for small business | **timesheet app for small business** | best timesheet app for small business, free timesheet app for small business | Appears in all three of `timesheet app`, `free timesheet app`, `best timesheet app`. |
| Hourly employees `/en/hourly-employees` | hours tracker for hourly employees | **track employee hours** | track employee hours free, track employee hours app, best app to track employee hours | "hourly employees" never appeared; "track employee hours" is the fourth-strongest seed. |
| Guide `/en/guide/how-to-track-employee-hours` | log employee hours | **how to track employee hours** | how to track employee hours for free, best way to track employee hours, how to track employee hours spreadsheet | Full 10-suggestion list; "log employee hours" was never suggested. |
| Open source `/en/open-source` | open source time tracking | **open source time tracking** (keep) | open source time tracking self hosted, open source time tracking app android, self hosted clockify alternative, jibble open source alternative | Confirmed. "self hosted time tracking" is weak on its own; use it as a secondary phrase, not a page. |
| Calculator `/en/work-hours-calculator` | work hours calculator monthly | **work hours calculator** | work hours calculator with lunch, work hours calculator monthly, work hours calculator pay | The head spawns 27 own variants; "with lunch/break" and "monthly" must be features, not the primary. |
| Template `/en/timesheet-template` | timesheet template | **timesheet template for multiple employees** | free timesheet template (excel, google sheets, pdf, printable), timesheet template for employees | The head is Microsoft/Smartsheet territory [inference]; "for multiple employees" is the variant that matches Klokka's month grid. Ship a Google Sheets copy, it is the second most common modifier. |
| Working hours `/en/working-hours-per-month-sweden` | working hours per month sweden | **working hours per month sweden 2026** | working days sweden 2026, working days sweden 2027, swedish working hours per month | Autocomplete always attaches the year. |
| Guide `/en/guide/swedish-working-hours-act` | swedish working hours act | **swedish working hours act** (keep) | swedish working hours per week, sweden working hours per day | Confirmed as the first suggestion. |
| Guide `/en/guide/staff-register-sweden` | staff register sweden | **personalliggare in english** / "personalliggare sweden" | personalliggare skatteverket, personalliggare restaurang | "staff register sweden" returns nothing; people type the Swedish word ("personalliggare engelska"). Rename slug to `/en/guide/personalliggare`. |
| Alternatives (en) | kimai / clockify / jibble / planday alternative | **open source clockify alternative** first, then jibble open source alternative | self hosted clockify alternative, clockify alternatives free, kimai alternative open source | Clockify has by far the richest alternative cluster; Planday has none in English. |

Ranking the English candidates by variant count (both geos identical): **1 timesheet app, 2 timesheet template,
3 work hours calculator, 4 track employee hours, 5 open source time tracking, 6 employee hours tracker, 7 self hosted
time tracking.** Variant count says nothing about difficulty; 1 to 3 are the hardest SERPs [inference].

---

## 2. Facts the pages must get right

Wording below is plain information for page copy, not legal advice; every page that uses it should link the source.

### 2a. Personalliggare: which industries in 2026

**Covered today (six branches)** [verified: https://www.skatteverket.se/foretag/arbetsgivare/personalliggare.4.4f3d00a710cc9ae1c9c80007271.html]:
1. Byggbranschen (electronic personalliggare mandatory)
2. Fordonsservice
3. Kropps- och skönhetsvård
4. Livsmedels- eller tobaksgrossist (wholesale, not retail)
5. Restaurangbranschen
6. Tvätteribranschen

Per branch:
- **Café: yes, if it is restaurangverksamhet.** Skatteverket counts gatukök, caféer, personalmatsalar, catering,
  centralkök and pizzerior as restaurants [verified: https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarerestaurang.4.4c6191e3115d2ea500880001977.html].
- **Hair and beauty: yes.** Kropps- och skönhetsvård = "behandling av en persons kropp eller vård av en persons
  utseende"; examples on the page include hårvård, manikyr/pedikyr, massage, tatuering, sprayturning,
  tandblekning; SNI 96.021, 96.022, 96.040 as guidance, but the actual activity decides [verified: https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarekroppsochskonhetsvard.4.2cf1b5cd163796a5c8bb517.html].
  Skatteverket's list has no separate frisör branch any more; hårvård is an example under kropps- och skönhetsvård,
  the category introduced by prop. 2017/18:82 "Personalliggare i fler verksamheter" (cited in prop. 2025/26:282
  section 7.3) [verified: Skatteverket pages above; prop. 2025/26:282 PDF below]. Correction to
  `research-keywords.md` section 2, which lists "frisör" as its own branch: say "frisör och annan kropps- och
  skönhetsvård".
- **Cleaning (städ): no.** Not in Skatteverket's list. In prop. 2025/26:282 städ appears only in the rut context
  (Skatteverket control of rut payments), not as a new personalliggare branch [verified: https://www.regeringen.se/contentassets/b387d0f4eefc4ffa8f90a5523038aaf3/effektivare-kontrollmojligheter-i-systemen-for-rot-rut-gron-teknik-och-personalliggare-prop.-202526282].
- **Retail (butik/handel): no.** Not in the list; only food and tobacco *wholesale* is covered [verified: Skatteverket list above].

**Exemptions** [verified: kropps- och skönhetsvård and restaurang pages above]:
- Only the owner, spouse and children under 16 work there (enskild firma), or the equivalent for företagsledare in a
  company.
- 75 percent or more of the business is another activity (for example restaurant revenue under 25 percent of a hotel's
  turnover).
- Mixed premises: if at least one activity in a shared lokal is covered, everyone working in the lokal is recorded
  [verified: https://www.skatteverket.se/foretagochorganisationer/arbetsgivare/personalliggare/blandadverksamhet.4.22501d9e166a8cb399f2c99.html].

**What it records, retention, fee** [verified: https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/safungerarpersonalliggare.4.3810a01c150939e893f224b.html]:
- Each day: first and last name plus personnummer/samordningsnummer of everyone active, and when each person's shift
  starts and ends. Kept current and available on site.
- Outside construction it may be manual (bound, numbered) or electronic; an electronic one must log every change with
  a timestamp.
- Kept for two years after the end of the calendar year in which the tax year ended.
- Kontrollavgift: 12 500 kr, plus 2 500 kr for each person active but not recorded.

**Rule changes 2025/2026/2027:**
- **No new branches and no new electronic requirement took effect in 2025 or 2026.** Neither Verksamt's "Lagändringar
  2026" nor Företagarna's year-end list mentions personalliggare [verified: https://verksamt.se/nyheter/lagandringar-2026, https://www.foretagarna.se/nyheter/riks/2025/november/nya-lagar-och-regler-fran-arsskiftet-20252026/].
- The 2024 inquiry (SOU 2024:61) proposed electronic personalliggare in **all** covered branches and higher fees, to
  start 2025/2026; news sites still say "föreslås träda i kraft 2026". **The government dropped both.** Prop.
  2025/26:282 (lodged 2026-06-09) states "Det bör inte införas ett krav på att personalliggare ska föras elektroniskt i
  samtliga branscher" and "Kontrollavgifterna avseende personalliggare bör inte justeras i dagsläget" [verified: prop.
  2025/26:282 sections 7.3 and 7.6, PDF above].
- What the proposition *does* propose, **from 2027-01-01** (if the Riksdag passes it): control visits may also check
  employer reporting duties, and Skatteverket may question people on site; for a worker employed by someone else
  (inhyrd), the personalliggare must identify that person's employer; data in an electronic personalliggare must be
  transferable electronically to Skatteverket [verified: prop. 2025/26:282 summary and sections 7.1, 7.2, 7.4].

Page copy consequence [inference]: Klokka records neither personnummer nor live start/end times on site, so "Klokka
ersätter inte en personalliggare" stays mandatory on the café and frisör pages; the städ and butik pages can say
"städfirmor och butiker omfattas inte av kravet på personalliggare" with the Skatteverket link.

### 2b. Arbetstidslagen (1982:673): what an employer must record

Law text as amended through SFS 2022:450 [verified: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/]:
- **11 §** "Arbetsgivare ska föra anteckningar om jourtid, övertid och mertid. Arbetstagarna har rätt att själva eller
  genom någon annan ta del av anteckningarna. Samma rätt har fackliga organisationer som företräder arbetstagare på
  arbetsstället." Arbetsmiljöverket issues the detailed rules.
- **The law requires records of jourtid, övertid and mertid, not of all ordinary hours.** Sweden has no general duty
  to register every worker's daily working time, despite the EU Court's CCOO ruling (C-55/18, 2019); Sweden, Malta
  and Cyprus are named as the EU countries without such a rule, and the government has announced no inquiry or date
  [verified: https://ingenjoren.se/2025/02/13/arbetsgivare-i-eu-ska-registrera-arbetstid-men-sverige-forhalar/,
  https://www.lag-avtal.se/nyheter/sverige-enda-landet-i-norden-utan-skyldighet-att-registrera-arbetstid/4311468].
  Copy must not claim "lagen kräver att du registrerar all arbetstid".
- Practical reason to keep all hours anyway [inference]: for hourly staff, övertid and mertid can only be computed
  from the full hours, and the hours are payroll evidence (see retention).

Detailed rules: **AFS 2023:2, chapter 9** (AFS 1982:17 is now listed by av.se under "upphävda föreskrifter"; the
switch came with the new AFS structure, in force from 2025-01-01 [inference on the date]) [verified: https://www.av.se/globalassets/filer/publikationer/foreskrifter/planering-och-organisering-av-arbetsmiljoarbete-grundlaggande-skyldigheter-for-dig-med-arbetsgivaransvar-afs2023-2.pdf, and https://www.av.se/arbetsmiljoarbete-och-inspektioner/arbetsgivarens-ansvar-for-arbetsmiljon/anteckna-uppgifter-om-jourtid-overtid-och-mertid/]:
- 9:3 For each employee, record jourtid, övertid and mertid; clear and orderly; the employer chooses the document
  (paper or digital).
- 9:4 Must contain employer name, the workplace, employee name, and **personnummer or anställningsnummer**, and the
  period (year plus dates, week number or calendar month).
- 9:5 Must separate jourtid, allmän övertid, extra övertid, allmän mertid, and nödfallsövertid/nödfallsmertid; one
  shared document is fine with a separate row or column per kind.
- 9:6 **Kept at the workplace for the calendar year they cover plus the two following calendar years.**
- 9:7 The Working Hours Act and the arbetstidsschema must be available at the workplace.
- 9:8-9 Record overtime/mertid as it happens, at the latest 14 days after the calculation period (or pay period).

Limits the pages can quote (ATL, same source):
- 5 § ordinary time max **40 h/week** (or 40 h average over at most four weeks).
- 8 § allmän övertid max 48 h per four weeks or **50 h per calendar month, 200 h per calendar year**; 8 a § extra
  övertid up to 150 h/year for special reasons, combined cap still 48/4 weeks or 50/month.
- 10 § mertid (part-time hours above the contracted hours): allmän mertid max **200 h/year**; 10 a § extra mertid 150
  h/year, combined cap 48/4 weeks or 50/month.
- 10 b § total working time max **48 h per 7 days on average** over at most four months.
- 13 § dygnsvila **11 h** in every 24 h (including midnight to 05:00 as the rule); 14 § veckovila **36 h** per 7 days;
  15 § no more than **5 h** of work in a row without a break.
- 3 § collective agreements may deviate from most of these; 2 § the Act does not cover, among others, work in the
  employer's household and staff with a company-management position.

Retention of the hours as payroll evidence: räkenskapsinformation is kept "fram till och med det sjunde året efter
utgången av det kalenderår då räkenskapsåret avslutades" (Bokföringslagen 7 kap. 2 §) [verified: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/].
Whether a given time report counts as räkenskapsinformation depends on how it is used as the basis for pay
[inference]; the safe copy is "spara underlaget för lönen i sju år, anteckningar om övertid och mertid minst tre
kalenderår".

Access: employees and the union at the workplace may see the övertid/mertid records (ATL 11 §, verified above). The
employee's general right to a copy of personal data held about them comes from GDPR article 15 [inference: not
fetched today; link IMY's page when writing].

### 2c. Får arbetsgivaren ändra en tidrapport?

What the sources say:
- **No Swedish statute forbids or regulates an employer correcting hours.** Industry guidance: "En arbetsgivare får
  korrigera i en tidrapport", but "får till exempel inte korrigera tid på ett sätt så att du inte får betalt för tid du
  har arbetat", and corrections must follow the law and agreements [verified: https://nuba.se/2024/06/24/far-arbetsgivaren-andra-tidrapport/ (vendor blog, not official)].
- **Falsification line:** Brottsbalken 14 kap. 1 §: whoever "obehörigen ... ändrar eller fyller ut en äkta urkund"
  commits urkundsförfalskning if it creates "fara i bevishänseende"; an urkund includes an electronic document made as
  evidence "som har en utställarangivelse som kan kontrolleras på ett tillförlitligt sätt" [verified: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/brottsbalk-1962700_sfs-1962-700/].
  So the legal risk is changing a report **the employee authored or signed** without authority, not correcting the
  employer's own record [inference from the statute's wording].
- **Pay:** an employer cannot use a correction to avoid paying for hours worked (nuba, above); if hours are disputed
  the employee can raise it with the union where there is a collective agreement [inference; search snippets from
  familjensjurist.se and lawline.se say the same for schedule changes, not fetched].
- The related high-volume question "får arbetsgivaren ändra arbetstider/schemat" has a firm rule: changes to the
  placement of ordinary hours must be announced at least **two weeks in advance** unless the nature of the work or
  unforeseen events justify shorter notice (ATL 12 §) [verified: ATL link in 2b].

Common practice to recommend (neutral wording) [inference]:
1. Correct openly: the employee is told what changed and why.
2. Keep the original value and the change history (who, when, from what, to what).
3. Let the employee object, and resolve disputes before the month is paid.
4. Lock the month once it is agreed and paid.
These four map one to one onto Klokka's history, push notification on change, "flagga fel rad" and month lock, which
makes this the strongest guide-to-product match on the site.

### 2d. Timanställda: hours and semesterersättning

Hours [verified: ATL link in 2b]:
- There is **no separate hour cap for timanställda**; the Working Hours Act applies to them like anyone else (1 §).
- Practical monthly answer: ordinary time up to 40 h/week; on top of that allmän övertid/mertid up to 50 h in a
  calendar month and 200 h per year; total time max 48 h/week on average over four months; 11 h daily and 36 h weekly
  rest. A collective agreement may set other limits (3 §).
- Whether extra hours of an hourly worker without contracted ordinary hours count as mertid or övertid depends on the
  employment contract [inference].

Semesterersättning (Semesterlagen 1977:480) [verified: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/]:
- 16 § Semesterlön is calculated with the **procentregeln** (16 b §) for an employee whose pay is not set per week or
  month, i.e. hourly pay.
- 16 b § "Semesterlön enligt procentregeln utgör **tolv procent** av arbetstagarens förfallna lön i en anställning
  under intjänandeåret."
- 5 § For employment meant to last at most three months (and that does not last longer), the parties may agree that no
  leave is taken; the employee then gets semesterersättning. 28 § When employment ends before earned semesterlön is
  paid, the employee gets semesterersättning; 29 § it is calculated like semesterlön; 30 § paid at the latest one month
  after employment ends.
- Collective agreements often give more than 12 percent [inference: not verified per agreement today; do not put a
  number on the page without the agreement].
- Calculator copy: "semesterersättning = 12 % av den lön som betalats ut under intjänandeåret (procentregeln), om inget
  kollektivavtal ger mer."

### 2e. Röda dagar and working hours per month, 2026 and 2027

Rule: Lag (1989:253) om allmänna helgdagar: nyårsdagen 1/1, trettondedag jul 6/1, långfredagen (Friday before
påskdagen), påskdagen, annandag påsk, första maj, Kristi himmelsfärdsdag (6th Thursday after påskdagen), pingstdagen
(7th Sunday after påskdagen), nationaldagen 6/6, midsommardagen (Saturday 20-26 June), alla helgons dag (Saturday
31 Oct-6 Nov), juldagen 25/12, annandag jul 26/12, plus all Sundays [verified: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1989253-om-allmanna-helgdagar_sfs-1989-253/].
Midsommarafton, julafton and nyårsafton are **not** allmänna helgdagar, but are de facto days off (in many collective
agreements and common practice) [inference for "de facto"; the non-holiday status is verified by the Act's list].
Full time: 40 h/week (ATL 5 §) = 8 h per working day.

Method: working days = Monday to Friday minus legal holidays that fall on a weekday ("lag"); the "praxis" count also
removes midsommarafton, julafton and nyårsafton when they fall on a weekday. Easter by the Gregorian computus.
Script: `workdays.py` in this folder; its output is `workdays.out` (pasted unchanged below).
Cross-check: several Swedish calendar sites give 251 working days and 2 008 h for 2026, matching the "praxis" total
[verified: https://www.rodadagarna.se/arbetsdagar-2026/ (title "251 dagar"), https://8till5.se/artiklar/arbetstimmar-per-manad/].
rodadagarna.se says December 2026 has 18 working days; the computation gives 20 (23 weekdays minus 24, 25 and 31
December). Its annual total still matches, so the difference is in its month split [inference]; the table below is
the arithmetic.

**2026 holidays** (weekday in Swedish):
2026-01-01 tor Nyårsdagen; 2026-01-06 tis Trettondedag jul; 2026-04-03 fre Långfredagen; 2026-04-05 sön Påskdagen;
2026-04-06 mån Annandag påsk; 2026-05-01 fre Första maj; 2026-05-14 tor Kristi himmelsfärdsdag; 2026-05-24 sön
Pingstdagen; 2026-06-06 lör Nationaldagen; 2026-06-20 lör Midsommardagen; 2026-10-31 lör Alla helgons dag;
2026-12-25 fre Juldagen; 2026-12-26 lör Annandag jul.
Aftnar: 2026-06-19 fre Midsommarafton; 2026-12-24 tor Julafton; 2026-12-31 tor Nyårsafton.

| 2026 | Mon-Fri | Holiday on weekday | Working days (lag) | Hours (lag) | Afton on weekday | Working days (praxis) | Hours (praxis) |
|---|---:|---:|---:|---:|---:|---:|---:|
| januari | 22 | 2 | 20 | 160 | 0 | 20 | 160 |
| februari | 20 | 0 | 20 | 160 | 0 | 20 | 160 |
| mars | 22 | 0 | 22 | 176 | 0 | 22 | 176 |
| april | 22 | 2 | 20 | 160 | 0 | 20 | 160 |
| maj | 21 | 2 | 19 | 152 | 0 | 19 | 152 |
| juni | 22 | 0 | 22 | 176 | 1 | 21 | 168 |
| juli | 23 | 0 | 23 | 184 | 0 | 23 | 184 |
| augusti | 21 | 0 | 21 | 168 | 0 | 21 | 168 |
| september | 22 | 0 | 22 | 176 | 0 | 22 | 176 |
| oktober | 22 | 0 | 22 | 176 | 0 | 22 | 176 |
| november | 21 | 0 | 21 | 168 | 0 | 21 | 168 |
| december | 23 | 1 | 22 | 176 | 2 | 20 | 160 |
| **Total** | **261** | **7** | **254** | **2 032** | **3** | **251** | **2 008** |

**2027 holidays:**
2027-01-01 fre Nyårsdagen; 2027-01-06 ons Trettondedag jul; 2027-03-26 fre Långfredagen; 2027-03-28 sön Påskdagen;
2027-03-29 mån Annandag påsk; 2027-05-01 lör Första maj; 2027-05-06 tor Kristi himmelsfärdsdag; 2027-05-16 sön
Pingstdagen; 2027-06-06 sön Nationaldagen; 2027-06-26 lör Midsommardagen; 2027-11-06 lör Alla helgons dag;
2027-12-25 lör Juldagen; 2027-12-26 sön Annandag jul.
Aftnar: 2027-06-25 fre Midsommarafton; 2027-12-24 fre Julafton; 2027-12-31 fre Nyårsafton.

| 2027 | Mon-Fri | Holiday on weekday | Working days (lag) | Hours (lag) | Afton on weekday | Working days (praxis) | Hours (praxis) |
|---|---:|---:|---:|---:|---:|---:|---:|
| januari | 21 | 2 | 19 | 152 | 0 | 19 | 152 |
| februari | 20 | 0 | 20 | 160 | 0 | 20 | 160 |
| mars | 23 | 2 | 21 | 168 | 0 | 21 | 168 |
| april | 22 | 0 | 22 | 176 | 0 | 22 | 176 |
| maj | 21 | 1 | 20 | 160 | 0 | 20 | 160 |
| juni | 22 | 0 | 22 | 176 | 1 | 21 | 168 |
| juli | 22 | 0 | 22 | 176 | 0 | 22 | 176 |
| augusti | 22 | 0 | 22 | 176 | 0 | 22 | 176 |
| september | 22 | 0 | 22 | 176 | 0 | 22 | 176 |
| oktober | 21 | 0 | 21 | 168 | 0 | 21 | 168 |
| november | 22 | 0 | 22 | 176 | 0 | 22 | 176 |
| december | 23 | 0 | 23 | 184 | 2 | 21 | 168 |
| **Total** | **261** | **5** | **256** | **2 048** | **3** | **253** | **2 024** |

Notes for the page [inference]:
- 2027 is a "bad" year for employees: first May, nationaldagen, juldagen and annandag jul all fall on a weekend.
- Some agreements also shorten other eves (trettondagsafton, skärtorsdag, valborgsmässoafton, dagen före Kristi
  himmelsfärd, allhelgonaafton); say so in one line and link the user to their agreement rather than modelling them.
- Part time: multiply the hours by the employment percentage (autocomplete asks "arbetstid i procent").
- Generate the table from the same holiday function at build time (deterministic, no yearly manual edit); the script
  above is the reference implementation.

---

## 3. Google Play and GitHub

**Google Play:** `https://play.google.com/store/apps/details?id=com.prasannjeet.klokka` returns **HTTP 404** (one
request, `hl=sv`) [verified: that URL, 2026-09-29]. There is no public listing. The APK is distributed from Nexus
(raw) via the landing page (`research-technical.md` P1-3 flags that host). A draft or closed-testing track would also
404 publicly, so this does not rule out a listing in progress [inference].
Consequences:
- The "tidrapport app" SERP gives 4 of 9 organic slots to store listings (`research-competitors.md` section 5); Klokka
  cannot compete for that slot until it is listed.
- A Play listing **requires a privacy policy URL** (Play Console policy; not fetched today [inference]), and Klokka has
  none on klokka.se yet (see section 4). That page is on the critical path to the listing.

**GitHub** (`gh repo view prasannjeet/klokka`, read-only) [verified: GitHub API, 2026-09-29]:
- description: "Klokka: the employer logs the hours each employee worked, both sides see the month. Free and open
  source (Expo + Next.js + Quarkus + Logto)."
- homepageUrl: **empty**
- repositoryTopics: **none**
- stargazerCount: 0; license: MIT; latestRelease: **null** (tags v1.0.x exist, but no GitHub Release objects).
Fixes (5 minutes, all reversible): set homepage to `https://klokka.se`; add topics `time-tracking`, `timesheet`,
`self-hosted`, `open-source`, `employee-hours`, `small-business`, `sweden`, `expo`, `quarkus`, `nextjs`; publish a
GitHub Release for v1.0.2 with notes (releases feed directories, "latest release" badges and awesome-selfhosted's age
check). Suggested description (no em dash): "Free, open-source (MIT) timesheet app for small employers: log each
employee's hours per day, both sides see the same month. Web and Android."

---

## 4. What the SEO plan is missing (worth doing only)

Existing site state: klokka.se is one page per locale; the landing app has only `[lang]/page.tsx`, `sitemap.ts`,
`robots.ts`, `manifest.ts` [verified: `apps/landing/src/app` in the repo]. The sign-up screen already renders
"Genom att fortsätta godkänner du villkoren och integritetspolicyn" (`packages/core/i18n/sv.json`), but no route
serves either page [verified: grep of `apps/web`, `apps/mobile`, `apps/landing` found no link target].

1. **Integritetspolicy / Privacy page (`/integritet`, `/en/privacy`)**: must do. Required for the Play listing, promised
   by the sign-up copy, and a trust signal for an app holding employees' hours and pay. Name the controller split
   (the employer's data, Klokka as processor for the hosted service) [inference on the legal framing; have it checked].
2. **Villkor / Terms page (`/villkor`, `/en/terms`)**: must do, same reason: the sign-up copy links it.
3. **Om Klokka / About (`/om`, `/en/about`)**: who builds it (named person, location, why), MIT, where the code and
   data live. The cheapest E-E-A-T signal for YMYL-adjacent labour-law guides; also the page LLMs quote for "who makes
   Klokka" [inference].
4. **Kontakt**: a real address (e-mail) on the About page and in `Organization.contactPoint`; no separate page needed.
5. **Brand SERP and spelling**: autocomplete rewrites `klokka` to **klocka** in Swedish (klocka herr/dam/barn), and in
   English it returns Norwegian "klokka nå / klokka i norge" (klokka is Norwegian for "the clock")
   [signal: autocomplete]. Always pair the brand with the category in titles, store listing and social bios
   ("Klokka tidrapport", "Klokka timesheet app"), and give `Organization` + `SoftwareApplication` JSON-LD a `sameAs`
   list (GitHub, Play, social profiles) so Google can form an entity [inference].
6. **Changelog / Nyheter (`/nyheter` or GitHub Releases rendered on the site)**: a dated trail of releases is fresh
   content, gives directories and journalists something to link, and backs "open source" with evidence
   [inference]. Low effort if generated from GitHub Releases.
7. **Self-hosting docs page (`/en/self-hosting`)**: prerequisite for the open-source page's promise and for
   awesome-selfhosted (which requires working install docs, per `research-competitors.md`). English only is fine.
8. **Press / brand kit (`/press`)**: skip for now; one "Logo och skärmdumpar" section on the About page with the SVG
   logo and 3 screenshots covers the few listicle writers who ask [inference].
9. **Wikidata item**: skip until independent coverage exists. A new product with only self-published sources is a
   deletion candidate, and a deleted item helps nothing [inference]. Revisit after the first press or listicle
   mention; then add official website, GitHub repo, license (MIT), Play package id.
10. **Google Business Profile**: does not apply (online software with no customer-facing location or service area)
    [inference; GBP guidelines not fetched today].
11. **Bing Webmaster + IndexNow, GSC**: already covered in `research-technical.md` section 8; connecting GSC is the
    single highest-value step, because it replaces every "unmeasured" cell with impressions.
12. **Store listing as a landing page**: the Play description should reuse the site's first paragraph facts (free, MIT,
    web + Android, sv/en) and link `klokka.se`; it ranks on its own for "tidrapport app" [inference from the SERP data
    in `research-competitors.md`].
13. **FAQ answers that are legally exact**: use sections 2a to 2d verbatim-in-substance; the two easiest mistakes are
    "lagen kräver att all arbetstid registreras" (false, only jour/över/mertid) and "elektronisk personalliggare krävs
    från 2026" (false, the proposal was dropped).
14. **Minderåriga (summer jobs in cafés and shops)**: one FAQ line linking Arbetsmiljöverket's rules for young
    workers; high relevance for café/butik owners, near-zero cost [inference; rules not fetched today].
15. **Dated guides**: put "Uppdaterad 2026-09-29" and the source link on every legal guide; prop. 2025/26:282
    changes personalliggare rules on 2027-01-01 if passed, so the personalliggare guide needs a review date in
    December 2026.

---

## Sources (fetched or queried today)
- Skatteverket, Personalliggare: https://www.skatteverket.se/foretag/arbetsgivare/personalliggare.4.4f3d00a710cc9ae1c9c80007271.html
- Skatteverket, Så fungerar personalliggare: https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/safungerarpersonalliggare.4.3810a01c150939e893f224b.html
- Skatteverket, kropps- och skönhetsvård: https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarekroppsochskonhetsvard.4.2cf1b5cd163796a5c8bb517.html
- Skatteverket, restaurang: https://www.skatteverket.se/foretag/arbetsgivare/personalliggare/personalliggarerestaurang.4.4c6191e3115d2ea500880001977.html
- Skatteverket, verksamhetslokaler: https://www.skatteverket.se/foretagochorganisationer/arbetsgivare/personalliggare/blandadverksamhet.4.22501d9e166a8cb399f2c99.html
- Prop. 2025/26:282: https://www.regeringen.se/rattsliga-dokument/proposition/2026/06/prop.-202526282 (PDF: https://www.regeringen.se/contentassets/b387d0f4eefc4ffa8f90a5523038aaf3/effektivare-kontrollmojligheter-i-systemen-for-rot-rut-gron-teknik-och-personalliggare-prop.-202526282)
- Verksamt, Lagändringar 2026: https://verksamt.se/nyheter/lagandringar-2026
- Företagarna, lagar från årsskiftet 2025/2026: https://www.foretagarna.se/nyheter/riks/2025/november/nya-lagar-och-regler-fran-arsskiftet-20252026/
- Arbetstidslag (1982:673): https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arbetstidslag-1982673_sfs-1982-673/
- AFS 2023:2 (PDF): https://www.av.se/globalassets/filer/publikationer/foreskrifter/planering-och-organisering-av-arbetsmiljoarbete-grundlaggande-skyldigheter-for-dig-med-arbetsgivaransvar-afs2023-2.pdf
- Arbetsmiljöverket, anteckna jourtid/övertid/mertid: https://www.av.se/arbetsmiljoarbete-och-inspektioner/arbetsgivarens-ansvar-for-arbetsmiljon/anteckna-uppgifter-om-jourtid-overtid-och-mertid/
- Ingenjören on CCOO/Sweden: https://ingenjoren.se/2025/02/13/arbetsgivare-i-eu-ska-registrera-arbetstid-men-sverige-forhalar/
- Semesterlag (1977:480): https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/semesterlag-1977480_sfs-1977-480/
- Brottsbalk 14 kap.: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/brottsbalk-1962700_sfs-1962-700/
- Bokföringslag 7 kap. 2 §: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/
- Lag (1989:253) om allmänna helgdagar: https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-1989253-om-allmanna-helgdagar_sfs-1989-253/
- nuba.se, får arbetsgivaren ändra tidrapport: https://nuba.se/2024/06/24/far-arbetsgivaren-andra-tidrapport/
- rodadagarna.se, arbetsdagar 2026 (cross-check): https://www.rodadagarna.se/arbetsdagar-2026/
- Google Play: https://play.google.com/store/apps/details?id=com.prasannjeet.klokka (404)
- GitHub: `gh repo view prasannjeet/klokka`
