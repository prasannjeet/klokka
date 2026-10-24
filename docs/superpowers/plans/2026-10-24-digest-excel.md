# CHQ-189 Weekly digest with an Excel report: implementation plan

> For agentic workers: execute task by task with superpowers:subagent-driven-development. No code bodies here: the
> plan fixes WHAT and HOW (files, signatures, flow); the implementer writes the code.

**Goal:** the weekly digest goes to everyone by default, carries an Excel workbook of last week (jobs and hours per
day, employer and employee versions), has a redesigned template, and stays inside Migadu's 100 emails a day.

**Branch:** `CHQ-189-digest-excel` in worktree `/home/dev/documents/projects/klokka-chq189`, cut from
`CHQ-185-jobs-recurrence-notifications` (V6 is the latest migration; this adds V7). Both ship together.

## Ground rules

- Java 25 for Maven (`JAVA_HOME=/home/dev/.sdkman/candidates/java/25.0.2-amzn`). Build with
  `mvn -f apps/api/pom.xml -pl contract,service ...`. **Never `mvn install`** from this worktree: it overwrites the
  shared `~/.m2` contract that main uses.
- Contract first: change `openapi.yaml`, then regenerate the TS client with the repo's script
  (`npm run generate -w @klokka/api-client` or whatever `packages/api-client/package.json` names it) and commit the
  generated output.
- All text in `packages/core/i18n/{sv,en}.json`, both languages, no em dash. After catalogue `email.*` changes run
  `npm run emails` (writes `apps/api/service/src/main/resources/templates/digest.html` and the Logto bundle).
- No magic literals: every cap, window and reserve is a `@ConfigMapping` property with validation, listed in
  `apps/api/service/.env.example` and `application.properties`.
- Tests: targeted (`-Dtest=...`), plus project compile. Mobile jest with `--no-watchman --forceExit`.
- Commits: author is the configured one, no `Co-Authored-By`, no assistant mention, never `git add -A`. Subject
  `CHQ-189: ...`. Two commits at most (API; clients+docs).

## Locked decisions

1. **Daily quota, rolling 24 hours.** `klokka.mail.daily-quota` (`KLOKKA_MAIL_DAILY_QUOTA`, default 100, `@Min(1)`)
   replaces `monthly-quota`/`KLOKKA_MAIL_MONTHLY_QUOTA` everywhere (config, properties, `.env.example`, FakeServers,
   docs). The count is non-failed `email_send` rows with `sent_at` in `(now - 24h, now]`.
2. **Digest reserve.** `klokka.digest.reserve` (`KLOKKA_DIGEST_RESERVE`, default 20, `@Min(0)`): the digest sends
   only while `sentLast24h + 1 <= dailyQuota - reserve`, so invitations and sign-up codes always have room.
   Invitations keep using `requireBudget(n)` against the full daily quota.
3. **Due window.** Last week's digest is due from Monday at `local-hour` in any of the user's workspaces until the end
   of Monday + `klokka.digest.catch-up-days` (`KLOKKA_DIGEST_CATCH_UP_DAYS`, default 2, `@Min(0) @Max(6)`), local
   time. Default: Monday 07:00 to Wednesday 23:59. A digest held back for budget goes out on a later run inside the
   window; past the window it is dropped (never a stale digest days later). Staging may set 6 to test any day.
4. **Every user is reached.** Users are walked in keyset pages (`logto_user_id > :after order by logto_user_id limit
   :batch`) until a short page, capped by `klokka.digest.max-users-per-run` (default 5000, `@Min(1)`). The run
   stops early (one log line) when the budget is out.
5. **One transaction per user**, not one for the whole run (`QuarkusTransaction.requiringNew()`), so a slow SMTP send
   holds no long transaction and a failure rolls back only that user.
6. **Order per user:** due? -> build the week (all workspaces) -> nothing at all: record `digest_run`, no email ->
   budget left? no: stop the run without recording -> yes: record `digest_run`, send. A failed SMTP send stays
   ledgered as FAILED and recorded (no retry storm), as today.
7. **On by default.** V7 sets `user_preference.digest_enabled` default true and flips every existing row to true;
   `MeService.ensurePreferences` creates new users with true. The setting still turns it off.
8. **Workbook library:** `org.dhatim:fastexcel:0.20.2` (main), `org.dhatim:fastexcel-reader:0.20.2` (test scope).
   No Apache POI. Strings are written as string cells, which Excel never evaluates, so no formula guard is needed.
9. **One workbook per workspace** in the user's email, named `klokka-<workspace slug>-<YYYY>-W<ww>.xlsx`, MIME
   `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. A workspace with nothing last week gets no file.
10. **Pay.** Employer workbook: Pay column when `workspace.showPay`. Employee workbook: when `workspace.showPay` and
    their own `hourlyRate != null` (the rule `MeService` already uses). Amount = `MemberViews.earnings(hours, rate)`.
11. **Email size.** At most `klokka.digest.max-jobs-in-email` job lines in the whole email (default 60, `@Min(1)`); past
    that a line says the rest is in the attached file. Keeps the HTML well under Gmail's ~102 KB clip.
12. **Operator volume.** `OperatorEmailVolume` gains required `sentLast24h` (integer); `quota` now documents the
    daily allowance. The web meter shows last 24 hours against the daily quota; the month's invitation,
    verification and digest counts stay as a legend without bar shares; the "Resets" line goes (the field stays in
    the contract, unused by the web).
13. **Small fix riding along (CHQ-186):** `recurrence.afterCount` is truncated on phones; becomes en "For a period",
    sv "Under en period".

## Task 1: API (quota, default on, digest loop, workbook, attachment, template)

**Files**
- `apps/api/contract/src/main/openapi/openapi.yaml`: `OperatorEmailVolume.sentLast24h` (required, integer, example
  12), `quota` description "The daily allowance (KLOKKA_MAIL_DAILY_QUOTA), counted over the last 24 hours."
- `apps/api/service/pom.xml`: the two fastexcel dependencies (versions as properties in `apps/api/pom.xml` if the
  parent manages versions there, otherwise inline, following the file's style).
- `config/KlokkaConfig.java`: `Mail.dailyQuota()` (replaces `monthlyQuota()`); `Digest` gains `reserve()`,
  `catchUpDays()`, `maxUsersPerRun()`, `maxJobsInEmail()`. `application.properties`, `.env.example`,
  `support/FakeServers.java` follow.
- `db/migration/V7__digest_on_by_default.sql`: alter default + update all rows.
- `me/MeService.java`: `ensurePreferences` sets `digestEnabled = true`.
- `mail/MailService.java`:
  - `long sentLast24h()` replaces `sentThisMonth()`; `requireBudget(int)` checks the daily quota, message names the
    daily quota.
  - `boolean digestBudgetLeft()`: decision 2.
  - `record Attachment(String fileName, String contentType, byte[] data)`; `send(kind, to, subject, text, html, userId,
    List<Attachment> attachments)`; the existing overloads delegate with an empty list. Uses
    `Mail.addAttachment(name, data, contentType)`.
- `mail/EmailSendRepository.java`: `digestOptIns(String afterUserId, int limit)` (keyset, `afterUserId` null = from the
  start); comment updated (daily ledger).
- `operator/OperatorService.java`: `.quota(config.mail().dailyQuota())`, `.sentLast24h(...)` from `mailService.sentLast24h()`.
- `persistence/JobRepository.java` (or `EntryRepository`, whichever already joins `hour_entry`): new
  `List<WeekJob> weekJobs(WorkspaceId workspaceId, UUID membershipIdOrNull, LocalDate from, LocalDate to)` where
  `record WeekJob(UUID membershipId, String memberName, LocalDate date, LocalTime start, BigDecimal hours, String
  placeName, String placeAddress, String note, boolean recurring)`. Live entries only (as `listLive`). One row per
  job; an entry without jobs yields one row with the entry's hours and note and no start/place. Sorted by member
  name, date, start (nulls last), position. Member name is the membership's display name.
- `mail/DigestWeek.java` (new): the data both outputs read, built once per workspace:
  `record DigestWeek(WorkspaceEntity workspace, boolean employer, LocalDate monday, List<WeekJob> jobs,
  List<Member> members, boolean withPay)` with `record Member(UUID membershipId, String name, BigDecimal
  hourlyRate)`; helpers `Map<LocalDate, BigDecimal> hoursPerDay(UUID membershipId)`, `BigDecimal total(UUID
  membershipId)`, `BigDecimal teamTotal(LocalDate)`. Members listed are those with a row last week (employer: all
  of them; employee: just themself).
- `mail/DigestWorkbook.java` (new): `static byte[] build(DigestWeek week, Language lang, Catalogue catalogue)` and
  `static String fileName(DigestWeek week)`.
  - Sheet "Jobs" (`digest.xlsx.sheetJobs`): Employee, Date, Weekday, Start, End, Hours, Place, Address, Note,
    Recurring (`digest.xlsx.*` headers). Date as a real date cell (yyyy-mm-dd format), Start/End as time cells
    (End = start + hours, wrapped past midnight), Hours numeric with two decimals, Recurring = `digest.xlsx.yes`/
    `no`. After each employee's rows a bold total row (`digest.xlsx.total`, the hours summed).
  - Sheet "Hours" (`digest.xlsx.sheetHours`): Employee, Monday..Sunday (header = short weekday + day.month in the
    recipient's locale), Week total, and Pay when `withPay`. Last row: team total per day and overall (employer
    workbook only; the employee one has a single row and no team row).
  - Both sheets: frozen header row, autofilter over the header, column widths set from the longest value (capped).
- `mail/DigestMail.java`: per workspace add `List<TeamRow> team` (employer only: name, seven day values, total),
  `List<PersonJobs> people` (each: name, total, `List<DayJobs>`; DayJobs: day label, `List<JobLine>` with time,
  place, hours text), `String fileLine` (names the attachment, `email.digest.attached`), `String moreLine` (null
  unless capped, `email.digest.moreInFile`). Keep the existing fields.
- `mail/DigestJob.java`: decisions 3 to 6, 9 to 11. `run()` loses `@Transactional`; per user
  `QuarkusTransaction.requiringNew().call(() -> sendOne(...))`. `sendOne` returns an enum
  `Outcome { NOT_DUE, NOTHING, SENT, NO_BUDGET, FAILED }`; `Result` becomes
  `record Result(int considered, int sent, int skipped, boolean budgetOut)`. Week hours and month-so-far keep their
  current sources; the job lists and the workbook come from `DigestWeek`. The ISO week label in subject/title stays.
  Plain text body mirrors the HTML (team table as lines, then jobs per person per day, capped the same way).
- `scripts/emails/build.mjs` (+ `layout.mjs` only if a new primitive is needed): the digest template renders, per
  workspace: header (emoji, name, range), the existing day grid, for employers a compact "Team this week" table
  (name, Mo..Su, total; zero as a muted dash), then "Jobs" per person per day (`Mon 20 Oct` line, then
  `09:00  Café Nord  4 h` lines), the file line, the more line when present, the hours/month rows, then the button
  and footer. Table-based, inline styles, same palette as today; must stay readable at 360 px (the team table may
  scroll horizontally inside its own wrapper). Then `npm run emails`.
- Catalogue (`packages/core/i18n/{sv,en}.json`): `email.digest.teamTitle`, `email.digest.jobsTitle`,
  `email.digest.attached` ("Last week in Excel: {file}"), `email.digest.moreInFile` ("{count} more jobs are in the
  attached file"), `email.digest.noPlace`, `digest.xlsx.sheetJobs`, `.sheetHours`, `.employee`, `.date`, `.weekday`,
  `.start`, `.end`, `.hours`, `.place`, `.address`, `.note`, `.recurring`, `.yes`, `.no`, `.weekTotal`, `.pay`,
  `.total`, `.team`; `email.digest.footer` updated (no longer "because you turned it on"); `digest.intro` updated
  ("Last week in one email, with an Excel file attached."). Add any new keys to `i18n/Text.java` as the existing
  digest keys are.

**Tests** (`apps/api/service/src/test/java/com/prasannjeet/klokka/mail/`)
- `DigestWorkbookTest` (plain JUnit, no Quarkus): read the bytes back with fastexcel-reader. Employer with two
  members, pay on: sheet names, header row, one row per job in order, per-employee total rows, Hours sheet values,
  team row, Pay column. Employer pay off: no Pay column. Employee: only own rows, no team row; pay shown only with
  showPay and an own rate. An entry without jobs appears as one row. End time across midnight.
- `DigestJobTest` (extend): default-on for a new user; the attachment is on the mail (MockMailbox: name, MIME,
  non-empty, parses); due on Tuesday inside the window, not due on Thursday with catch-up 2; budget reserve stops
  the run and the held user is sent on the next run after budget frees (positive control: with budget, sent);
  more users than `batch-size` are all reached in one run; the "more in file" line when the cap is hit.
- `MailService`/quota: an invitation is refused at the daily quota over a rolling 24 h window (adjust
  `MemberResourceTest.theEmailQuotaRefusesAnInviteThatWouldExceedIt`).
- `SchemaMigrationTest`: V7 default true and existing rows flipped.
- Operator volume test (wherever `OperatorEmailVolume` is asserted today): `sentLast24h` and daily `quota`.

**Done when:** targeted tests pass, `mvn -pl contract,service -DskipTests package` compiles, `npm run emails -- --check`
(or the repo's check script) is clean, the api-client is regenerated and `npm run check` passes for it.

## Task 2: Web, mobile, docs

- `apps/web/src/components/operator/volume-view.tsx`: decision 12. Catalogue `operator.volume.subtitle` (daily
  wording: "{month}. The SMTP account sends about {quota} emails a day, so email is reserved for invitations and the
  digest. Everything else is push and in-app."), `emailsAgainstQuota` -> "Emails in the last 24 hours, against the
  daily quota", new `operator.volume.thisMonth` legend heading if needed; drop the `resets` key if nothing else uses
  it (both languages). Update its test if one exists.
- Settings copy (both clients read the catalogue, no component change expected): `settings.digestTo` becomes
  en "Every Monday, with an Excel file of last week. To {email}", sv "Varje måndag, med en Excel-fil för förra
  veckan. Till {email}". Check web and mobile settings tests that assert the old text.
- `recurrence.afterCount` (decision 13); check tests asserting it.
- Docs: `AGENTS.md` (mail line: daily quota, digest on by default), `README.md`, `docs/DEPLOYMENT.md`,
  `docs/OPERATIONS.md` (env names, the reserve, the catch-up window), `docs/CONTRACT.md` (operator volume row),
  `docs/DECISIONS.md` new D22 (digest on by default with an Excel workbook; daily rolling quota with a reserve;
  due window), `CHANGELOG.md` entry under an Unreleased heading if the file uses one.
- Run: web vitest for changed files, mobile jest for settings/recurrence tests, `npm run lint`, `npm run check`,
  web build.

## Task 3: Verification (controller)

- One whole-branch review (CHQ-189 commits only), fix findings.
- Local: run the API with Mailpit (`docker compose up -d` gives Mailpit on 8025/1025), seed a workspace with jobs
  last week, set `KLOKKA_DIGEST_CATCH_UP_DAYS=6`, confirm the email in Mailpit (HTML at 360 px and desktop with
  Playwright) and open the xlsx (LibreOffice headless convert to csv, or fastexcel-reader) for both roles and both
  languages.
- Staging (after the push to `main`): set `KLOKKA_DIGEST_CATCH_UP_DAYS=6` on the staging API temporarily, give the
  staging test accounts jobs last week, wait for the 15-minute sweep, read the emails at `admin@blixo.ai` and
  `test@blixo.ai`, check the attachment, then remove the override.
