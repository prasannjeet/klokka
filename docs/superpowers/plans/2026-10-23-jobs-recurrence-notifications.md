# Jobs, recurrence and job notifications (CHQ-185 to CHQ-188) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> House rules override the skill defaults: this plan names files, flow, signatures and types but contains no code
> bodies; tasks are large coherent chunks; one final whole-branch review, no per-task reviewer; 3 commits in total.

**Goal:** the job editor becomes a page that cannot be lost by a stray tap; monthly repeats gain a chosen day and the
nth weekday, plus "no end date"; a recurring job's schedule and any range of its jobs (past included) can be edited;
employees get a "Job updates" notification for every change, with its own Android channel and setting.

**Architecture:** contract first (`openapi.yaml`), one Flyway migration (V6), then the API (a `RecurrencePattern`
value type shared by the preview, creation, schedule change and a nightly `RecurrenceExtender`; scoped writes with
closed-month skipping; a coalesced `JOB_CHANGED` notification), then `@klokka/core` helpers and catalogue text, then
the phone (an Expo Router job editor screen replacing `JobSheet`) and the web (page routes replacing `JobDialog`).

**Tech stack:** Java 25 / Quarkus 3.39 / Hibernate Panache / Flyway / quarkus-scheduler; Expo SDK 57, Expo Router
(`usePreventRemove` from `expo-router/react-navigation`), TanStack Query 5; Next.js 16 App Router, TanStack Query 5;
Vitest, Jest, JUnit 6 + RestAssured.

**Tickets:** CHQ-185 (editor page, single vs New job), CHQ-186 (monthly modes, no end date), CHQ-187 (series editing
and scopes), CHQ-188 (job updates notifications). CHQ-189 (digest + Excel) is a separate, later plan.

---

## 0. Ground rules for this work

- **Not to staging yet.** A push to `main` deploys staging (`.github/workflows/ci.yml`, `on: push: branches: [main]`).
  So: create branch `CHQ-185-jobs-recurrence-notifications` from `main` (in a worktree if the shared checkout is
  dirty: `git worktree add ../klokka-chq185 -b CHQ-185-jobs-recurrence-notifications main`). Commit there. Pushing the
  branch is safe (CI ignores branches); never merge or push to `main` until the owner says so.
- Verification is local only: API on Quarkus Dev Services / `docker compose` (Postgres 5434, Mailpit 8025), web dev
  server on `http://192.168.0.16:3000`, Metro on 8083 with `EXPO_PUBLIC_API_URL=http://192.168.0.16:8080`, auth
  against the staging Logto (already allowed: `http://localhost:3000/callback` is registered). No staging or
  production probes.
- Java needs `JAVA_HOME=~/.sdkman/candidates/java/25.0.2-amzn` (shell default is 21). Gradle (APK) needs JDK 21. This
  plan adds no native dependency, so the installed debug APK + a Metro reload is enough on the phone.
- Other sessions share the checkout: stage explicit paths, read `git diff` per file before committing, never
  `git add -A`. Commit subjects start with the ticket keys; single author, no Co-Authored-By, no assistant mention.
- No em dash in any user-facing string (lint enforces it on TS, JSX and the catalogue).
- Tests: targeted (the classes/components changed) + compile/typecheck of every workspace touched. Full suites only
  if the owner asks.
- Commits (3): (A) contract + migration + API, (B) core + mobile + web, (C) docs.

## 1. Locked decisions (from the tickets and the owner, 2026-10-23)

1. **Editor is a page** on both clients. Unsaved changes ask "Discard changes?" on every way out. An untouched form
   leaves silently. Panels (location, start time, date, repeat, scope) are steps inside the page.
2. **Two entry points.** A day's plus = **single job** (no date row, no repeat row, title "New single job for
   {name}", subtitle "{date}, does not repeat"). **New job** (person header button, People per-person plus, web
   person view header and Employees row) = full editor with a Date row (default today) and a Repeat row.
3. **Monthly rule:** `monthlyBy` = `DAY_OF_MONTH` (`dayOfMonth` 1..31, 31 = last day, clamped in short months) or
   `WEEKDAY_OF_MONTH` (`weekOfMonth` FIRST..FOURTH or LAST, + `weekday`). "Third Wednesday" = the third Wednesday of
   the month. `lastDayOfMonth=true` from older clients is read as `dayOfMonth=31`; responses still set
   `lastDayOfMonth` (= `dayOfMonth == 31`) for older clients.
4. **No end date = rolling window.** Neither `endDate` nor `periodCount` -> open-ended series. Jobs are materialised
   12 months ahead (`klokka.recurrence.horizon-months`, default 12); a nightly `RecurrenceExtender` tops each open,
   unstopped series up to the horizon, without notifications, skipping closed months. `job_recurrence.end_date` stays
   NOT NULL and means "planned through" for an open series. New jobs take the series' **template values** (hours,
   start, note, place) stored on the series row, kept current by range edits.
5. **Scopes:** `ONLY_THIS`, `THIS_AND_FUTURE` (now also from a past job), `ALL` (whole series, past included).
   Jobs in closed months are skipped and counted; a range that is entirely closed is refused with `MONTH_LOCKED`
   (unchanged for `ONLY_THIS`).
6. **Schedule change** (body carries `recurrence`) is only `THIS_AND_FUTURE`, takes effect from
   `from = max(selected job's date, today)`, and needs a `requestId` (retry-safe). If the series has live jobs before
   `from`, it **splits**: old series ends at `from - 1` and is stopped; a new series (`previous_id` = old) starts at
   `from`. If not, the series row is **rewritten in place**. Past jobs never move.
7. **Removing:** `ONLY_THIS` removes one; `THIS_AND_FUTURE` removes from that job on and stops the series; `ALL`
   removes every unlocked job and stops the series (client asks a second time).
8. **`JOB_CHANGED`** replaces `HOURS_CHANGED` for every job write (add, edit, remove, series create, schedule change,
   stop), past dates included, coalesced per sitting (same quiet window/max delay as hours). Day-level writes (week
   grid single cell and batch) keep `HOURS_CHANGED`. The extender never notifies. Preference `jobUpdates` (default on,
   also for existing users) gates the **push** only; the row still appears in the notification centre. Android
   channel `jobs` "Job updates".
9. Single job -> recurring conversion while editing: out of scope.

## 2. File map

API contract and schema
- Modify `apps/api/contract/src/main/openapi/openapi.yaml` (schemas, `updateJob`/`deleteJob` text, new operation).
- Create `apps/api/service/src/main/resources/db/migration/V6__recurrence_modes_open_series_job_updates.sql`.

API service (`apps/api/service/src/main/java/com/prasannjeet/klokka/...`)
- Create `entry/RecurrencePattern.java` (the one place that knows which dates a rule produces).
- Modify `entry/JobRecurrenceDates.java` (uses the pattern; open-ended horizon).
- Create `entry/RecurrenceExtender.java` (nightly top-up).
- Modify `entry/JobService.java` (scopes, schedule change, scope counts), `entry/JobResource.java` (new operation),
  `entry/EntryWriter.java` (series write options, `JOB_CHANGED` producers), `entry/JobRequestHash.java` only if the
  canonical form needs the new fields (it hashes the JSON body, so likely no change; confirm with a test).
- Modify `persistence/JobRecurrenceEntity.java`, `persistence/JobRecurrenceRepository.java`,
  `persistence/JobRepository.java`, `persistence/UserPreferenceEntity.java`.
- Modify `config/KlokkaConfig.java` + `src/main/resources/application.properties` (recurrence horizon, extender).
- Modify `notification/NotificationService.java`, `notification/NotificationTexts.java`,
  `notification/NotificationLinks.java`, `notification/NotificationRepository.java` (`Recipient.jobUpdates`),
  `push/PushSweeper.java`, `me/MeService.java` (+ wherever `Preferences` is mapped), `i18n/Text.java`.
- Tests (`apps/api/service/src/test/java/com/prasannjeet/klokka/...`): create `entry/RecurrencePatternTest.java`
  (plain JUnit), `entry/RecurrenceExtenderTest.java`, `entry/JobScopeTest.java`; modify `entry/JobRecurrenceTest.java`,
  `entry/JobResourceTest.java`, `notification/NotificationAndPushTest.java`,
  `notification/JobReminderAndSettingsTest.java`, `persistence/SchemaMigrationTest.java`, `me/MeResourceTest.java`.

Shared
- `packages/api-client/src/generated/**` (regenerated, committed).
- Create `packages/core/src/recurrence.ts` (+ `recurrence.test.ts`), export from the core index.
- Modify `packages/core/i18n/en.json`, `packages/core/i18n/sv.json` (+ regenerated typed keys).

Mobile (`apps/mobile/...`)
- Create `app/job.tsx` (route), `src/features/jobs/JobEditorScreen.tsx` (+ `.test.tsx`),
  `src/features/jobs/jobEditorHref.ts`, `src/features/jobs/DateWheels.tsx`, `src/features/jobs/ScopeStep.tsx`,
  `src/features/jobs/MonthlyRule.tsx`.
- Modify `app/_layout.tsx` (job screen options), `src/features/jobs/RecurrenceEditor.tsx` (+ test),
  `src/features/jobs/RecurrenceSummary.tsx`, `src/data/workspace.ts` (scope counts query),
  `src/features/people/PeopleScreen.tsx`, `src/features/person/PersonScreen.tsx`, `src/features/day/DayScreen.tsx`,
  `src/features/team/TeamDayScreen.tsx`, `src/features/week/WeekScreen.tsx`,
  `src/features/push/usePush.ts`, `src/features/profile/PreferenceRows.tsx` (+ test), the notification row icon map.
- Delete `src/features/jobs/JobSheet.tsx` and its test once nothing imports it.

Web (`apps/web/src/...`)
- Create `app/(app)/w/[slug]/jobs/new/page.tsx`, `app/(app)/w/[slug]/jobs/[jobId]/page.tsx`,
  `components/jobs/job-editor.tsx` (+ test), `components/jobs/scope-step.tsx`, `components/jobs/monthly-rule.tsx`,
  `lib/use-unsaved-guard.ts` (+ test), `lib/job-links.ts` (+ test).
- Modify `components/jobs/day-jobs.tsx`, `components/jobs/recurrence-editor.tsx` (+ test),
  `components/jobs/recurrence-summary.tsx`, `components/jobs/jobs.css`,
  `app/(app)/w/[slug]/month/employer-month-view.tsx` (New job), `app/(app)/w/[slug]/employees/employees-view.tsx`
  or `member-actions.tsx` (New job per person), `components/settings/job-reminder-prefs.tsx`,
  `components/notification-item.tsx`.
- Delete `components/jobs/job-dialog.tsx` once nothing imports it.

Docs: `docs/CONTRACT.md`, `docs/DECISIONS.md` (D21), `docs/MOBILE.md` if it lists channels.

---

## Task 1: Contract and migration (CHQ-186, 187, 188)

**Files:** `openapi.yaml`, `V6__recurrence_modes_open_series_job_updates.sql`, regenerated `packages/api-client`.

- [ ] **Contract, schemas.** In `openapi.yaml`:
  - New `MonthlyBy` enum `[DAY_OF_MONTH, WEEKDAY_OF_MONTH]`; new `WeekOfMonth` enum
    `[FIRST, SECOND, THIRD, FOURTH, LAST]`.
  - `JobRecurrenceRule` gains optional `monthlyBy` (`MonthlyBy`), `dayOfMonth` (integer 1..31, "31 means the last
    day"), `weekOfMonth` (`WeekOfMonth`), `weekday` (`Weekday`). Rewrite its description: "At most one of endDate or
    periodCount; neither means no end date (open-ended, planned `horizon` months ahead and extended nightly)."
    `lastDayOfMonth` description: "Older clients; same as dayOfMonth 31."
  - `JobRecurrence` gains required `openEnded` (boolean); `endDate` description: "Inclusive end; for an open-ended
    series, the date jobs are planned through."
  - `JobChangeScope` enum becomes `[ONLY_THIS, THIS_AND_FUTURE, ALL]`.
  - `JobWrite.requestId` description: "Required with recurrence (creation, or a schedule change on update)."
  - `NotificationKind` gains `JOB_CHANGED`; update its description (employees receive it for every job an employer
    adds, changes or removes, coalesced per sitting).
  - `Preferences` gains required `jobUpdates` (boolean, default true); `PreferencesUpdate` gains optional `jobUpdates`.
    `digestEnabled` text unchanged here (CHQ-189 changes it).
  - New `JobScopeCount` `{ jobs: integer >= 0, skippedClosed: integer >= 0 }` (both required) and `JobScopeCounts`
    `{ onlyThis, thisAndFuture, all: JobScopeCount }` (all required).
- [ ] **Contract, operations.**
  - New `GET /workspaces/{workspaceId}/jobs/{jobId}/scope-counts`, `operationId: getJobScopeCounts`, tag `jobs`,
    employer only, 200 `JobScopeCounts`, 401/403/404/default like `updateJob`. Description: how many jobs each scope
    would change and how many of those sit in closed months; for a single job all three are `{1, 0}` (or `{0, 1}`).
  - `updateJob` description: field changes accept all three scopes (`THIS_AND_FUTURE` and `ALL` include past jobs);
    a body with `recurrence` changes the schedule, needs `requestId` and `THIS_AND_FUTURE`, and applies from the later
    of the job's date and today; earlier jobs keep their dates; closed months are skipped; a range that is entirely
    closed answers `409 MONTH_LOCKED`.
  - `deleteJob` description: `ALL` removes every job of the series outside closed months and stops it;
    `THIS_AND_FUTURE` is allowed from a past job.
  - `previewJobRecurrence` description: drop "Exactly one of endDate or periodCount is required"; add the open-ended
    rule and the monthly modes.
- [ ] **Migration V6** (additive; existing rows keep working):
  - `job_recurrence`: add `monthly_by varchar(20) NOT NULL DEFAULT 'DAY_OF_MONTH'` with a CHECK on the two values;
    `day_of_month integer CHECK (day_of_month BETWEEN 1 AND 31)`; `week_of_month varchar(10)` CHECK on the five
    values; `month_weekday varchar(10)` CHECK on the seven `Weekday` names; `open_ended boolean NOT NULL DEFAULT
    false`; `previous_id uuid` with FK `(workspace_id, previous_id) REFERENCES job_recurrence(workspace_id, id)`;
    template columns `hours numeric(5,2)`, `start_time time`, `note varchar(500)`, `place_id varchar(300)`,
    `place_name varchar(200)`, `place_address varchar(300)`, `latitude numeric(9,6)`, `longitude numeric(9,6)`
    (same CHECKs as `job`).
  - Backfill: monthly rows get `day_of_month = 31` when `last_day_of_month`, else `extract(day from first_date)`;
    every row gets its template from its earliest live job (join `job` -> `hour_entry` on the series, lowest
    `work_date`, `deleted_at IS NULL`); then `hours SET NOT NULL` is **not** applied (a fully removed old series may
    have no live job; the extender only reads open series, which are all new).
  - Partial index `job_recurrence_open_ix ON job_recurrence (end_date) WHERE open_ended AND NOT stopped`.
  - `user_preference`: add `job_updates boolean NOT NULL DEFAULT true`.
  - `notification`: drop and re-add `notification_kind_check` with `'JOB_CHANGED'` added to the V3 list.
- [ ] **Regenerate:** `JAVA_HOME=~/.sdkman/candidates/java/25.0.2-amzn mvn -B -ntp -f apps/api/pom.xml -pl contract
  install` and `npm run generate -w packages/api-client`. Expected: new `MonthlyBy`, `WeekOfMonth`, `JobScopeCounts`,
  `JobScopeCount` models, `getJobScopeCounts` on `JobsApi` (Java interface and TS client). The service will not
  compile until Task 3 implements `getJobScopeCounts` in `JobResource`; that is fine inside this commit.
- [ ] `npm run check -w packages/api-client` passes (no drift).

## Task 2: Recurrence rules, open-ended series and the nightly extender (CHQ-186)

**Files:** create `entry/RecurrencePattern.java`, `entry/RecurrenceExtender.java`, tests `RecurrencePatternTest`,
`RecurrenceExtenderTest`; modify `JobRecurrenceDates`, `JobRecurrenceEntity`, `JobRecurrenceRepository`,
`EntryWriter`, `JobService.createSeries`, `KlokkaConfig`, `application.properties`, `JobRecurrenceTest`.

- [ ] **`RecurrencePattern`** (record, no CDI): `record RecurrencePattern(FrequencyEnum frequency, int interval,
  Set<Weekday> weekdays, MonthlyBy monthlyBy, Integer dayOfMonth, WeekOfMonth weekOfMonth, Weekday weekday,
  LocalDate anchor)`.
  - `static RecurrencePattern of(LocalDate first, JobRecurrenceRule rule)`: validates and normalises (throws
    `KlokkaException.validation(field, reason)` naming `recurrence.<field>`): weekly needs non-empty weekdays and no
    monthly fields; monthly refuses weekdays; `lastDayOfMonth=true` -> `dayOfMonth=31` (conflicting `dayOfMonth` ->
    validation); `DAY_OF_MONTH` defaults `dayOfMonth` to `first.getDayOfMonth()`; `WEEKDAY_OF_MONTH` needs both
    `weekOfMonth` and `weekday` and refuses `dayOfMonth`. `anchor = first`.
  - `static RecurrencePattern of(JobRecurrenceEntity series)` (from stored columns).
  - `boolean matches(LocalDate d)`: weekly as today (week interval anchored to the Monday of the anchor's week);
    monthly: `MONTHS.between(YearMonth(anchor), YearMonth(d)) % interval == 0` and either
    `d.getDayOfMonth() == min(dayOfMonth, lengthOfMonth)` or (`d.getDayOfWeek() == weekday` and
    `LAST -> d.plusWeeks(1)` is in the next month, `FIRST..FOURTH -> (d.getDayOfMonth() - 1) / 7 == ordinal`).
  - `List<LocalDate> datesBetween(LocalDate fromInclusive, LocalDate toInclusive, int cap)`: day walk, throws
    validation "at most {cap} jobs per series" past `cap`.
  - `void applyTo(JobRecurrenceEntity row)` and `JobRecurrenceRule toRule()` (the latter sets `lastDayOfMonth =
    dayOfMonth == 31` for monthly day mode, for older clients).
- [ ] **`JobRecurrenceDates.calculate(LocalDate first, JobRecurrenceRule rule, LocalDate today)`** (new third
  parameter; callers pass the workspace's today). Both ends present -> validation as today (`supply at most one of
  endDate or periodCount`). Neither -> open-ended: `end = max(first, today).plusMonths(config.recurrence()
  .horizonMonths())`. `Schedule` gains `boolean openEnded`. Everything else (max years, max jobs, empty result) stays.
  `preview(...)` unchanged in shape.
- [ ] **Entity/repository.** `JobRecurrenceEntity`: fields for the new columns (`monthlyBy`, `dayOfMonth`,
  `weekOfMonth`, `monthWeekday`, `openEnded`, `previousId`, template `hours`, `startTime`, `note`, `placeId`,
  `placeName`, `placeAddress`, `latitude`, `longitude`); `view()` builds the rule through `RecurrencePattern.toRule()`,
  omits `endDate`/`periodCount` when `openEnded`, sets `openEnded`. The template copy lives in `JobService`
  (`private static void setTemplate(JobRecurrenceEntity row, EntryWriter.JobInput values)` and
  `static EntryWriter.JobInput templateOf(JobRecurrenceEntity row)`, the extender calls the latter), not on the
  entity, so `persistence` does not depend on `entry` (ArchUnit). `JobRecurrenceRepository`: `List<UUID> openSeriesBefore(LocalDate
  horizonUpperBound, int limit)` (open, not stopped, `end_date < :bound`, oldest `end_date` first) and
  `Optional<JobRecurrenceEntity> lockSeriesSkipLocked(UUID id)` (native `FOR UPDATE SKIP LOCKED`).
- [ ] **`EntryWriter` series writes.** Replace `createSeriesJobs(..., JobRecurrenceEntity series)` with
  `SeriesWrite createSeriesJobs(Access access, MembershipEntity target, List<LocalDate> dates, JobInput input,
  JobRecurrenceEntity series, SeriesOptions options)` where `record SeriesOptions(boolean skipClosedMonths, boolean
  notify)` with constants `CREATE (false, true)`, `CHANGE (true, true)`, `EXTEND (true, false)` and
  `record SeriesWrite(HourEntryEntity firstEntry, int written, int skippedClosed)`. `CREATE` keeps today's
  "a closed month refuses the whole series". `insertJob` gains `boolean notify` (single-job create passes true).
- [ ] **Creation.** `JobService.createSeries` passes today, stores the pattern via `applyTo`, `openEnded`, the
  template from `values`, and uses `SeriesOptions.CREATE`.
- [ ] **`RecurrenceExtender`** (`@ApplicationScoped`): `@Scheduled(cron = "{klokka.recurrence.extend-cron}", identity =
  "recurrence-extender", concurrentExecution = SKIP)` calling `int run()`. `run()` reads
  `openSeriesBefore(todayUtc.plusMonths(horizon).plusDays(1), batchSize)` in its own transaction, then per series in
  `QuarkusTransaction.requiringNew()`: `lockSeriesSkipLocked` (absent -> skip), load workspace and target
  membership (deactivated or gone -> log at debug, skip), compute `horizon = today(workspace tz).plusMonths(h)`,
  `dates = pattern.datesBetween(series.endDate.plusDays(1), horizon, maxJobs)`, write with
  `SeriesOptions.EXTEND` and the series template through an `Access` built for the series' creator (their membership
  in that workspace; fall back to any active EMPLOYER membership; none -> skip), then `endDate = horizon`,
  `occurrenceCount += written`, `lastDate` = last written date if any. Per-series `RuntimeException` is logged with
  the series id and the loop continues. Bounded: one batch per run.
  Config in `KlokkaConfig.Recurrence`: `horizonMonths` (`@WithDefault("12") @Min(1) @Max(24)`),
  `extendBatchSize` (`@WithDefault("200") @Min(1) @Max(5000)`), `extendCron` (`@WithDefault("0 30 2 * * ?")`), and the
  matching `klokka.recurrence.*` lines in `application.properties` with `${KLOKKA_RECURRENCE_...:default}`.
- [ ] **Tests (write first for the date logic).**
  - `RecurrencePatternTest` (plain JUnit 6, no Quarkus): third Wednesday Nov 2026 = 18 Nov; LAST Friday in a
    five-Friday month; FOURTH vs LAST differ in a five-week month; second Sunday; day 31 -> 30 Nov, 28 Feb 2027,
    29 Feb 2028; interval 2 monthly; weekly unchanged; `lastDayOfMonth=true` == `dayOfMonth=31`; validation errors
    name the field (`recurrence.weekOfMonth`, `recurrence.dayOfMonth`, `recurrence.weekdays`).
  - `JobRecurrenceTest`: preview and creation for both monthly modes; open-ended preview ends at today + 12 months;
    both ends -> 400; a daily (7 weekdays) open series stays under `maxJobs`; response `openEnded: true`, no
    `endDate`/`periodCount` in the rule, `lastDayOfMonth` still set for day 31.
  - `RecurrenceExtenderTest` (`@QuarkusTest`, `MutableClock`): advance the clock a month, `run()` adds exactly the
    new dates and moves `endDate`; a second `run()` adds nothing; a stopped series is untouched; a closed month in
    the new range is skipped and later months still filled; a deactivated member is skipped; no notification row is
    written; jobs carry the template values. Assertions scoped to the test's own workspace.
- [ ] Run: `JAVA_HOME=~/.sdkman/candidates/java/25.0.2-amzn mvn -B -ntp -f apps/api/pom.xml -pl service test
  -Dtest='RecurrencePatternTest,JobRecurrenceTest,RecurrenceExtenderTest' -Dsurefire.failIfNoSpecifiedTests=false`
  (after Task 3 makes the service compile). Expected: all pass.

## Task 3: Scopes, past ranges, schedule change and scope counts (CHQ-187)

**Files:** `JobService`, `JobResource`, `JobRepository`, `JobRecurrenceRepository`, `EntryWriter`, tests
`JobScopeTest` (new), `JobResourceTest`.

Call flow after this task:
`JobResource.updateJob` -> `JobService.update(ws, jobId, body, scope)` -> if `body.recurrence != null`:
`changeSchedule(...)`, else `scoped(...)` -> `EntryWriter.updateJob` per job -> template refresh when the scope reaches
the series' last planned job. `deleteJob` -> `scoped(...)` -> `EntryWriter.deleteJob` per job (+ stop).
`getJobScopeCounts` -> `JobService.scopeCounts(ws, jobId)`.

- [ ] **Repository.** `JobRepository`: `record SeriesJob(JobEntity job, LocalDate date)` and
  `List<SeriesJob> seriesJobsFrom(WorkspaceId ws, UUID seriesId, LocalDate fromInclusive)` (live entries only,
  ordered by date then position); keep `seriesFrom` callers moved over and delete `seriesFrom` if unused.
  `JobRecurrenceRepository.findRequest` is reused for split retries.
- [ ] **`JobService` scoped selection.** `private record Scoped(List<SeriesJob> writable, int skippedClosed)` and
  `private Scoped scoped(Access a, JobEntity job, HourEntryEntity entry, JobChangeScope scope)`:
  `ONLY_THIS` -> just the job (closed month: `requireUnlocked` throws as today); `THIS_AND_FUTURE` ->
  `seriesJobsFrom(series, entry.workDate)`; `ALL` -> `seriesJobsFrom(series, series.firstDate)`; non-recurring job
  with a range scope -> validation `scope`, "this job is not recurring". Range scopes drop jobs whose month is in
  `MonthLockRepository.lockedMonthsBetween(first, last)` and count them; nothing left but something skipped ->
  `KlokkaException(MONTH_LOCKED, ...)`. Remove the "past jobs may only be changed individually" refusal. The series
  row is locked (`lockSeries`) before selecting.
- [ ] **Field changes.** `update` applies `values` to every `writable` job via `writer.updateJob`. When the scope is
  `THIS_AND_FUTURE` or `ALL`, also `setTemplate(series, values)` so the extender plans future jobs with the new values.
  `requestId` without `recurrence` stays a validation error.
- [ ] **Removal.** `delete`: `THIS_AND_FUTURE` and `ALL` set `stopped = true`; `ALL` and `THIS_AND_FUTURE` remove the
  writable jobs; `occurrenceCount`/`lastDate` recomputed from the remaining live jobs (if none remain, keep the
  values; the row is stopped and only read for history).
- [ ] **Schedule change.** `private Entry changeSchedule(Access a, MembershipEntity target, JobEntity job,
  HourEntryEntity entry, JobWrite body, JobChangeScope scope)`:
  1. `scope` must be `THIS_AND_FUTURE` (else validation `scope`, "a schedule change applies to this and following
     jobs"); `requestId` required; job must be recurring.
  2. Replay: `findRequest(requestId)` present -> must have `previousId == job.recurrenceId` or be the same series
     rewritten with the same `requestHash`; return the view of the job's entry (or the new series' first entry).
  3. `from = max(entry.workDate, today)`; `pattern = RecurrencePattern.of(from, body.recurrence)`; `schedule =
     recurrenceDates.calculate(from, body.recurrence, today)`.
  4. Remove the old series' writable jobs dated `>= from` (`scoped` logic with `fromInclusive = from`), each through
     `writer.deleteJob` (notifies REMOVED, merged with the ADDED of the same date into CHANGED by Task 4).
  5. If live jobs remain before `from`: old row `endDate = from - 1`, `stopped = true`, counts recomputed; new row
     with fresh id, `requestId`, `requestHash`, `previousId = old.id`, `firstDate = from`, pattern, `openEnded`,
     template, `createdBy/At`; else rewrite the old row in place (pattern, `firstDate = from`, end, open flag,
     template, `requestId`/`requestHash` replaced, `stopped = false`).
  6. `writer.createSeriesJobs(a, target, schedule.dates(), values, newOrRewritten, SeriesOptions.CHANGE)`; set
     `occurrenceCount`, `lastDate`, `firstEntryId` from the result. Nothing written and nothing removed -> validation
     `recurrence`, "no jobs fall in open months".
  7. Return the view of the selected job's day if it still exists, else of the new first entry.
- [ ] **Scope counts.** `JobScopeCounts scopeCounts(UUID workspaceId, UUID jobId)` (employer; same `scoped` selection
  without writing; single job -> `{1,0}` or `{0,1}` for all three). `JobResource.getJobScopeCounts` delegates.
- [ ] **Tests** (`JobScopeTest`, `@QuarkusTest`, fixed clock, own workspace rows):
  - field change `THIS_AND_FUTURE` from a past job changes it and everything after, not before;
  - `ALL` changes past and future; with one closed month in the middle those jobs keep old values and
    `scope-counts.all.skippedClosed` equals their number (positive control: unlock and rerun changes them);
  - a range entirely in a closed month -> 409 `MONTH_LOCKED`;
  - schedule change weekly(Wed) -> monthly(third Wednesday) from a future job: earlier jobs untouched, old series
    stopped with `endDate = from - 1`, new series `previousId` set, new dates exact;
  - schedule change on a series whose first job is the selected one rewrites in place (no second row);
  - schedule change from a past job starts at today;
  - replaying the same `requestId` returns 200 without new rows; a different body with the same `requestId` -> 400;
  - `deleteJob` `ALL` removes past and future jobs (closed months kept) and stops the series; the extender then adds
    nothing;
  - template refresh: `THIS_AND_FUTURE` hours change on an open series, then extender run -> new jobs carry the new
    hours.
  - `JobResourceTest`: update existing assertions that expected "past jobs may only be changed individually".
- [ ] Run: `... mvn ... -pl service test -Dtest='JobScopeTest,JobResourceTest,JobRecurrenceTest'
  -Dsurefire.failIfNoSpecifiedTests=false`. Expected: pass.

## Task 4: `JOB_CHANGED`, the job updates preference and the push channel (CHQ-188)

**Files:** `NotificationService`, `NotificationTexts`, `NotificationLinks`, `NotificationRepository`, `PushSweeper`,
`EntryWriter`, `UserPreferenceEntity`, `MeService` (preferences mapping), `i18n/Text.java`, catalogue (API reads
`packages/core/i18n/*.json`), tests `NotificationAndPushTest`, `JobReminderAndSettingsTest`, `MeResourceTest`,
`SchemaMigrationTest`.

- [ ] **Producer.** In `NotificationService`: `public enum JobChangeKind { ADDED, CHANGED, REMOVED }`,
  `public record JobChange(LocalDate date, JobChangeKind kind, String startTime, String placeName, BigDecimal hours)`,
  and `public void jobChanged(WorkspaceEntity workspace, String recipientUserId, UUID membershipId, String actorId,
  String actorName, JobChange change)`. Same coalescing as `hoursChanged` but key
  `"JOBS:" + recipient + ":" + workspace + ":" + actor` and payload `jobs: { "<date>": {kind, startTime, placeName,
  hours} }`. Merge per date: ADDED + REMOVED -> drop the date; REMOVED + ADDED -> CHANGED (new values);
  ADDED + CHANGED -> ADDED (new values); CHANGED + REMOVED -> REMOVED; otherwise the later kind. Empty map -> delete
  the pending row (as `netNothing`). Recipient null or equal to actor -> nothing.
- [ ] **Wiring in `EntryWriter`.** Job paths call a private `notifyJob(access, target, date, kind, job)` instead of
  `notifyChange`: `insertJob` (ADDED, when `notify`), `updateJob` (CHANGED, always, also when the day's total and
  note stay the same), `deleteJob` (REMOVED; `removeDay` is called with `notify=false` from here). `settle` no longer
  notifies (history row stays). `write(...)` (day-level, week grid) keeps `notifyChange` -> `HOURS_CHANGED`.
- [ ] **Texts.** `NotificationTexts.render` gets `case JOB_CHANGED -> jobChanged(payload, lang, where)`:
  one date -> title by kind (`notifications.jobs.added` "{actor} added a job for you", `.changed` "{actor} changed
  your job", `.removed` "{actor} removed your job"), body `{date}`, `{date}, {time}` or `{date}, {time} at {place}`
  (`notifications.jobs.when`, `.whenTime`, `.whenTimePlace`); several dates -> `notifications.jobs.addedMany_one/_other`
  "{actor} added {count} jobs for you", `changedMany`, `removedMany` (mixed kinds use `changedMany`), body
  `notifications.jobs.range` "{from} to {to}", detail the first five dates (`Formats` short weekday + day + month)
  plus `notifications.jobs.more` "and {count} more". Add the `Text` enum constants; `publicPayload` passes `jobs`.
  `NotificationService.link`: `singleDayOf`/`monthOf` also handle `JOB_CHANGED` from the `jobs` map.
  `NotificationLinks.channel`: `JOB_CHANGED -> "jobs"`; `url`: `JOB_CHANGED` like `HOURS_CHANGED` (member day for
  one date, member month otherwise), so the phone's allowlist needs no new shape.
- [ ] **Preference.** `UserPreferenceEntity.jobUpdates` (column `job_updates`); preferences GET/PATCH map
  `jobUpdates`; `NotificationRepository.Recipient` becomes `(Language language, boolean pushEnabled, boolean
  jobUpdates)`; `PushSweeper` skips the push (row stays, `pushedAt` set as for push-disabled) when
  `row.kind == JOB_CHANGED && !recipient.jobUpdates()`.
- [ ] **Tests.**
  - `NotificationAndPushTest`: a start-time-only edit creates one `JOB_CHANGED` row (and no `HOURS_CHANGED`); a
    place-only edit too; creating a 6-job series yields one row with six dates and the plural title; a schedule
    change that removes and re-adds the same date renders as changed; add-then-remove within the window leaves no
    row; past-date edit notifies; the week grid batch still produces `HOURS_CHANGED`; push message `channelId` is
    `jobs`; `data.url` is the member day for one date.
  - `JobReminderAndSettingsTest`: `jobUpdates=false` -> row exists, no push sent (fake Expo server sees nothing);
    default for a new user is true; a moved start time gets a new reminder (`job_reminder` keyed by start instant).
  - `MeResourceTest`: preferences include `jobUpdates: true`; PATCH toggles it.
  - `SchemaMigrationTest`: V6 applies on a database at V5 with a monthly last-day series and a plain monthly series;
    backfilled `day_of_month` is 31 and the first date's day; template copied from the earliest job.
- [ ] Run: `... -Dtest='NotificationAndPushTest,JobReminderAndSettingsTest,MeResourceTest,SchemaMigrationTest,
  CatalogueTest,ArchitectureTest'`. Expected: pass. Then the whole service compiles and these plus Tasks 2 and 3
  tests pass: `mvn -B -ntp -f apps/api/pom.xml -pl service test -Dtest='Recurrence*Test,Job*Test,Notification*Test,
  JobReminder*Test,MeResourceTest,SchemaMigrationTest,CatalogueTest,ArchitectureTest'
  -Dsurefire.failIfNoSpecifiedTests=false`.
- [ ] **Commit A** on the branch: stage `openapi.yaml`, `V6__...sql`, the API files above, `packages/api-client/src/
  generated`, and `packages/core/i18n/{en,sv}.json` with the `notifications.jobs.*` keys this task added (the API
  renders push text from them; `CatalogueTest` checks both languages). Subject:
  `CHQ-186, CHQ-187, CHQ-188: monthly weekday and day rules, open-ended series with a nightly top-up, scoped series edits incl. past and schedule changes, JOB_CHANGED notifications with a job updates preference`.

## Task 5: `@klokka/core` recurrence helpers and catalogue text (CHQ-185 to 188)

**Files:** create `packages/core/src/recurrence.ts`, `packages/core/src/recurrence.test.ts`; modify the core index
export, `packages/core/i18n/en.json`, `packages/core/i18n/sv.json`, regenerated typed keys.

- [ ] **Helpers** (pure presentation, D9 allows them in core; both clients use them so the sentences match):
  - `defaultMonthly(date: IsoDate): { dayOfMonth: number; weekOfMonth: WeekOfMonth; weekday: Weekday }` (24 Oct
    2026 -> 24, FOURTH, SATURDAY; a date in the last seven days of its month whose ordinal would be FIFTH -> LAST).
  - `describeRecurrence(rule: JobRecurrenceRule, firstDate: IsoDate, t: Translator, locale: string): string`
    -> "Every month on the third Wednesday, from 18 November 2026, no end date" / "Every 2 weeks on Mon, Wed, until
    31 March 2027" / "Every month on day 15, for 6 months". Built only from catalogue keys + `formatDate`/
    `formatWeekday`; no hardcoded words.
  - `describeEnd(series: JobRecurrence, t, locale): string` for job cards ("No end date" / "Ends {date}" /
    "Stopped").
  - `packages/core` has no dependencies and stays that way: define narrow structural types in `recurrence.ts`
    (`RecurrenceRuleLike`, `RecurrenceLike`, string unions for frequency, monthly mode, week of month and weekday)
    that the generated `JobRecurrenceRule`/`JobRecurrence` objects satisfy; the clients pass the generated objects.
- [ ] **Tests** (`recurrence.test.ts`, Vitest, both languages): the three sentences above in en and sv (Swedish:
  "Varje månad den tredje onsdagen, från 18 november 2026, inget slutdatum"), interval > 1, day 31 -> "last day",
  `defaultMonthly` for 24 Oct 2026, 31 Oct 2026 (LAST), 1 Nov 2026 (FIRST).
- [ ] **Catalogue keys** (en shown; write natural Swedish for each; plurals as `_one`/`_other`; no em dash):
  - `jobs.newJob` "New job"; `jobs.newSingleJobFor` "New single job for {name}"; `jobs.singleSubtitle` "{date}, does
    not repeat"; `jobs.date` "Date"; `jobs.discardTitle` "Discard changes?"; `jobs.discardBody` "What you entered for
    this job will be lost."; `jobs.keepEditing` "Keep editing"; `jobs.discard` "Discard"; `jobs.loadingJob`
    "Loading the job"; `jobs.jobGone` "This job no longer exists."
  - `recurrence.ends` becomes "Ends"; new `recurrence.never` "No end date"; `recurrence.neverHint` "Repeats until you
    stop it. Jobs are planned {months} months ahead."; `recurrence.afterCount` "After a number of weeks/months";
    `recurrence.onDate` "On a date"; `recurrence.byDay` "On a day of the month"; `recurrence.byWeekday` "On a weekday
    of the month"; `recurrence.onDay` "On day {day}"; `recurrence.lastDayShort` "Last day";
    `recurrence.ordinal.{FIRST,SECOND,THIRD,FOURTH,LAST}` "first".."last"; `recurrence.weekdayInMonth.{MONDAY..SUNDAY}`
    "Monday".."Sunday" (sv definite: "måndagen".."söndagen"); `recurrence.onWeekday` "On the {ordinal} {weekday}";
    sentence keys `recurrence.sentence.{weekly,monthlyDay,monthlyLast,monthlyWeekday,from,until,forCount,noEnd}`;
    `recurrence.endsNever` "No end date"; `recurrence.endedOn` "Ended {date}".
  - Scope step: `recurrence.scopeTitle` "Which jobs?"; `recurrence.onlyThis` "Only this job";
    `recurrence.futureCount_one/_other` "This and the following job" / "This and the {count} following jobs";
    `recurrence.allCount_one/_other` "All {count} jobs in the series"; `recurrence.skippedClosed_one/_other`
    "{count} in a closed month stays unchanged" / "{count} in closed months stay unchanged";
    `recurrence.saveCount_one/_other` "Save changes to {count} job(s)" (two real sentences);
    `recurrence.removeCount_one/_other`; `recurrence.scheduleFrom` "The new schedule starts {date}. Earlier jobs keep
    their dates."; `recurrence.removeAllConfirm` "This also removes past jobs. Their hours leave the totals; the
    history keeps them.".
  - Settings: `settings.jobUpdates` "Job updates"; `settings.jobUpdatesHint` "A notification when your employer adds,
    changes or removes one of your jobs."; `settings.jobNotifications` "Job notifications" (section title);
    `settings.systemCategories` "Notification categories"; `settings.systemCategoriesHint` "Turn single kinds on or
    off in your phone's settings."; `mobile.push.channelJobUpdates` "Job updates"; `notifications.filterJobs` only if
    the centre's filter lists kinds.
  - Remove keys nothing uses any more (`recurrence.requiredEnd`, `recurrence.sameDate`, `recurrence.lastDay`,
    `recurrence.future`, `recurrence.only`, `recurrence.stop`, `recurrence.scope`, `recurrence.removeScope`,
    `recurrence.scopeHint`, `recurrence.confirmStop`, if unreferenced after Tasks 6 and 7; grep both clients).
- [ ] Run: `npm run generate -w packages/core && npm run check -w packages/core && npm test -w packages/core &&
  npm run typecheck -w packages/core`. Expected: pass.

## Task 6: Phone (CHQ-185 to 188)

**Files:** see the file map (mobile). Tests: `JobEditorScreen.test.tsx`, `RecurrenceEditor.test.tsx`,
`PreferenceRows.test.tsx`, existing screen tests that opened `JobSheet` (`PeopleScreen`, `PersonScreen`, `DayScreen`,
`TeamDayScreen`, `WeekScreen` tests: assert navigation to the job route instead of a sheet).

- [ ] **Route and href.** `src/features/jobs/jobEditorHref.ts`: `type JobEditorMode = 'single' | 'full' | 'edit'`;
  `jobEditorHref(p: { membershipId: string; date: IsoDate; mode: JobEditorMode; jobId?: string }): Href`
  -> `/job?membershipId=..&date=..&mode=..[&jobId=..]`. `app/job.tsx` reads the params with `useLocalSearchParams`,
  validates them (bad params -> `router.back()` + error toast), renders `<JobEditorScreen .../>`. In `app/_layout.tsx`
  add `<Stack.Screen name="job" options={{ presentation: 'card', gestureEnabled: true }} />` (a full page, not a
  modal sheet; `headerBackButtonMenuEnabled` left unset, see `usePreventRemove` caveat).
- [ ] **`JobEditorScreen`** (replaces `JobSheet`; move its body, keep its look and test ids where sensible):
  props `{ membershipId: string; date: IsoDate; mode: JobEditorMode; jobId?: string }`. Data: `useActiveWorkspace`,
  `useWorkspace` (rounding, default day hours), `useMember` (name), `useEntries(ws, addDays(date,-1), date,
  membershipId)` (day total, yesterday, the job for `edit`). Loading -> skeleton with `jobs.loadingJob`; `edit` with no
  such job -> `jobs.jobGone` and a Back button.
  - Layout: `Screen` with a header: leading Cancel (text button), title (`jobs.newSingleJobFor` / `jobs.newJobFor` /
    `jobs.editJobFor`), subtitle (`jobs.singleSubtitle` for single, else the date line), trailing Save (disabled until
    valid). Body = the old sheet's main panel (location, start, [date row in `full`], [repeat row in `full`, or in
    `edit` for a recurring job], hours wheels, chips, note). A sticky bottom Save button as today for thumb reach.
    Remove stays a ghost button at the bottom in `edit`.
  - Panels as state `type Panel = 'job' | 'start' | 'date' | 'repeat' | 'scope'`; each non-job panel shows Back.
    Android back / iOS swipe on a non-job panel returns to `'job'` instead of leaving (handled in the prevent-remove
    callback).
  - `dirty`: any field differs from what the screen opened with (hours, minutes, start, note, location, date,
    recurrence). `usePreventRemove(dirty && !saved.current || panel !== 'job', ({ data }) => ...)` from
    `expo-router/react-navigation`: on a panel -> `setPanel('job')`; else `Alert.alert(t('jobs.discardTitle'),
    t('jobs.discardBody'), [{ text: t('jobs.keepEditing'), style: 'cancel' }, { text: t('jobs.discard'), style:
    'destructive', onPress: () => navigation.dispatch(data.action) }])`. Cancel calls `router.back()` (the guard
    asks). After a successful save set `saved.current = true` then `router.back()`.
  - `full` mode: Date row opens the `'date'` panel with `DateWheels` (extracted from `RecurrenceEditor`'s end-date
    wheels: `DateWheels({ value: Date; min?: Date; onChange(d: Date): void })`). Repeat row shown only when the
    chosen date is today or later (as now).
  - `edit` of a recurring job: Repeat row shows `describeRecurrence` and opens `RecurrenceEditor` prefilled with
    `job.recurrence.recurrence` (`openEnded` -> "No end date"). Save: if the rule changed -> scope panel in
    schedule mode (only "This and following", `recurrence.scheduleFrom` with `max(date, today)`), body carries
    `recurrence` + a `requestId` generated when the editor opened (stable across retries); if only fields changed ->
    scope panel with all three options. Non-recurring edit saves directly.
- [ ] **`ScopeStep`** (`src/features/jobs/ScopeStep.tsx`): props `{ workspaceId: string; jobId: string; action:
  'save' | 'remove'; scheduleChange: boolean; onConfirm(scope: JobChangeScope): void; busy: boolean; error: string |
  null }`. Fetches `useJobScopeCounts(workspaceId, jobId)` (new hook in `src/data/workspace.ts`: `useQuery` on
  `api.jobs.getJobScopeCounts`, key `['job-scope-counts', ws, jobId]`, `staleTime: 0`). Renders a radio list (three
  rows, or one in schedule mode) with counts and the closed-month line, then one primary button whose label says
  what happens (`recurrence.saveCount` / `recurrence.removeCount`). `ALL` on remove asks `recurrence.removeAllConfirm`
  in an `Alert` first.
- [ ] **`RecurrenceEditor`** rewrite of the monthly and end sections (weekly part unchanged):
  - Monthly: `MonthlyRule` component with two selectable cards (`recurrence.byDay`, `recurrence.byWeekday`), each
    showing its sentence; the selected one expands: day mode = a 7-column grid of 1..31 plus a "Last day" cell (31),
    caption `recurrence.shortMonths` when 29..31; weekday mode = two wheels (ordinal FIRST..LAST, weekday Mon..Sun)
    in a `WheelGroup`. Defaults from `defaultMonthly(date)`.
  - Ends: `Segmented` with three options `never` (default) / `date` / `count`; `never` shows
    `recurrence.neverHint`; switching frequency keeps `never` and `date`, resets `count` as today.
  - Validity: `never` is valid without `endDate`/`periodCount`.
  - Preview card: `describeRecurrence` sentence, then the next four dates, then the total only when not open-ended.
  - Initial value prop accepts a `JobRecurrenceRule` from an existing series (edit).
- [ ] **`RecurrenceSummary`** uses `describeRecurrence` + `describeEnd`.
- [ ] **Call sites** replace `sheet.current?.open(...)` with `router.push(jobEditorHref(...))` and drop their
  `<JobSheet>`:
  - `PeopleScreen` per-person plus -> `mode: 'full'`, `date: today`.
  - `PersonScreen`: empty day tap -> `single`; header gets a "New job" button (`Icon name="plus"` + label, next to
    the More button, `testID="person-new-job"`) -> `full` with today.
  - `DayScreen`: Add / Add another -> `single`; job card edit -> `edit`.
  - `TeamDayScreen`, `WeekScreen`: add -> `single`, edit -> `edit`.
- [ ] **Push channel and settings.** `usePush.ts`: `CHANNELS.jobs = { id: 'jobs', importance: HIGH }`, created first
  in `ensureChannels` with `t('mobile.push.channelJobUpdates')`. `PreferenceRows.tsx`: `JobReminderRows` becomes
  `JobNotificationRows` with a "Job updates" switch (`jobUpdates`, `settings.jobUpdatesHint`) above the existing
  reminder rows, and on Android a `Row` "Notification categories" (`Linking.openSettings()`), shown where the reminder
  rows are shown today (employee Profile). Notification row icon map: `JOB_CHANGED` -> the calendar/briefcase icon
  used for jobs; unknown kinds keep the default icon.
- [ ] **Tests (Jest + the repo's `renderApp` helper):**
  - `JobEditorScreen.test.tsx`: single mode has no Repeat/Date row and shows the single title; full mode has both;
    typing a note then pressing Cancel shows the discard alert and stays; Keep editing keeps text; Discard leaves;
    untouched Cancel leaves without an alert; save posts `createJob` with the right body; edit of a recurring job with
    a changed rule shows only "This and following" and sends `recurrence` + `requestId` + `THIS_AND_FUTURE`; a field
    change shows three scope rows with counts from the mocked `getJobScopeCounts`.
  - `RecurrenceEditor.test.tsx`: third-Wednesday rule body, day 15 body, Last day = 31, `never` sends neither end.
  - `PreferenceRows.test.tsx`: Job updates toggle PATCHes `jobUpdates`.
  - Screen tests: the plus/New job/day tap push `/job` with the expected params.
- [ ] Run: `npm run typecheck -w apps/mobile && npm test -w apps/mobile -- JobEditorScreen RecurrenceEditor
  PreferenceRows PeopleScreen PersonScreen DayScreen TeamDayScreen WeekScreen && npm run lint`. Expected: pass.

## Task 7: Web (CHQ-185 to 188)

**Files:** see the file map (web). Tests: `job-editor.test.tsx`, `recurrence-editor.test.tsx`,
`use-unsaved-guard.test.ts`, `job-links.test.ts`, `employer-day-panel.test.tsx` (adds now link to the page).

- [ ] **Links.** `lib/job-links.ts`: `jobEditorHref(slug: string, p: { member: string; date: IsoDate; mode:
  'single' | 'full' | 'edit'; jobId?: string; back: string }): string` -> `/w/{slug}/jobs/new?member=..&date=..
  &mode=..&back=..` or `/w/{slug}/jobs/{jobId}?member=..&date=..&back=..`; `safeBack(back: string | null, slug:
  string): string` accepts only paths starting with `/w/{slug}/`, else `/w/{slug}/week`.
- [ ] **Pages.** `app/(app)/w/[slug]/jobs/new/page.tsx` and `.../jobs/[jobId]/page.tsx`: server components that call
  `requireEmployer(slug)` (as `month/page.tsx` does) and render `<Suspense><JobEditor .../></Suspense>` with the
  parsed search params; invalid params -> `notFound()`.
- [ ] **`components/jobs/job-editor.tsx`** (client; replaces `JobDialog`, moves `JobForm` out of
  `job-dialog.tsx`): same fields, data via the existing query helpers in `lib/queries.ts`/`lib/entries.ts` (member
  name, the day's and yesterday's entries, workspace settings). Layout: a page with a top bar (Cancel link-button
  with back arrow, title, subtitle), a single centred column (max width of the existing dialog body), the form, and
  a footer with Save (primary) and, in edit, Remove (ghost). On phone widths the footer sticks to the bottom inside
  `100dvh`; no fixed heights; content sets the size. Modes, titles, Date row (`<input type="date">`, `min` = today
  for repeats) and Repeat row as in Task 6. Save success -> toast + `router.push(safeBack(back))` +
  `invalidateFigures`. Recurring edits go through `ScopeStep` (below) before the mutation.
- [ ] **`lib/use-unsaved-guard.ts`**: `useUnsavedGuard(dirty: boolean): { requestLeave(href: string): void;
  dialog: ReactNode }`. When `dirty`: `beforeunload` listener (browser prompt on reload/close); a capture-phase
  click listener on `document` that intercepts same-origin `a[href]` clicks (no modifier keys, no `target`), stores
  the href and opens the app `Dialog` ("Discard changes?", Keep editing / Discard -> `router.push(href)`); browser
  Back: on becoming dirty push one sentinel history entry, on `popstate` while dirty re-push it and open the same
  dialog (Discard -> `history.go(-2)` to leave). Cancel and Remove-free leaves call `requestLeave(back)`. All
  listeners removed when clean or unmounted.
- [ ] **`components/jobs/scope-step.tsx`**: same contract as the phone's `ScopeStep` (props `{ workspaceId, jobId,
  action, scheduleChange, onConfirm(scope), busy, error }`), radio group with counts from
  `api.jobs.getJobScopeCounts` (TanStack `useQuery`), one primary button with the counted label, `ALL` removal
  confirmation. Rendered inside the editor page (save) and inside the existing remove confirmation `Dialog` in
  `day-jobs.tsx` (remove; a confirm with no typed data may stay a dialog).
- [ ] **`recurrence-editor.tsx` + `monthly-rule.tsx`**: same behaviour as the phone (two radio cards; day mode = a
  1..31 button grid + Last day; weekday mode = two `<select>`s ordinal + weekday; Ends = three radios, `never`
  default with the hint; preview sentence from `describeRecurrence`). Accessible: radio groups with labels, grid
  buttons with `aria-pressed`, focus states from tokens.
- [ ] **`recurrence-summary.tsx`**: `describeRecurrence` + `describeEnd`.
- [ ] **Entry points.** `day-jobs.tsx`: Add / Add another become links (`jobEditorHref(..., mode: 'single')`), card
  Edit links to `mode: 'edit'`; drop `JobDialog`. `employer-month-view.tsx` (the person's view) gets a "New job"
  button in its `ViewHeader` actions -> `mode: 'full'`, `date: today`. Employees list: a "New job" item in the
  member's actions (`member-actions.tsx`) -> `mode: 'full'`. `back` is the current path + query.
- [ ] **Settings and notifications.** `job-reminder-prefs.tsx`: section title `settings.jobNotifications`, a
  "Job updates" switch (`jobUpdates`) above the reminder switch and lead select. `notification-item.tsx`
  `KIND_ICON.JOB_CHANGED` = the jobs icon; its link handling uses `n.link` like `HOURS_CHANGED`.
- [ ] **Tests (Vitest):** `job-links` (hrefs, `safeBack` refuses `//evil`, `https://...`, other slugs);
  `use-unsaved-guard` (dirty + link click opens dialog, Discard navigates, clean click passes through, listeners
  removed); `job-editor` (single vs full rows, discard on Cancel when dirty, save body, recurring edit scope flow
  with mocked counts, schedule change sends `recurrence` + `requestId` + `THIS_AND_FUTURE`); `recurrence-editor`
  (third Wednesday, day 15, Last day = 31, never); `employer-day-panel` (Add is a link to the single editor).
- [ ] Run: `npm run typecheck -w apps/web && npm test -w apps/web -- job-editor recurrence-editor use-unsaved-guard
  job-links employer-day-panel && npm run lint -w apps/web && npm run build -w apps/web`. Expected: pass.
- [ ] **Commit B**: stage `packages/core` (src, i18n, generated), `apps/mobile` and `apps/web` files from Tasks 5 to 7
  (explicit paths, deleted `JobSheet.tsx`/`job-dialog.tsx` and their tests). Subject:
  `CHQ-185, CHQ-186, CHQ-187, CHQ-188: the job editor is a page on phone and web (single job from a day, New job with date and repeat, discard guard), monthly day and weekday rules with no end date, scoped series edits, job updates setting and Android channel`.

## Task 8: Local end-to-end verification, docs, final review

- [ ] **Run the stack locally** (never staging): `docker compose up -d` (Postgres 5434, Mailpit); API
  `JAVA_HOME=... mvn -f apps/api/pom.xml -pl service quarkus:dev` with `.env` pointing auth at the staging Logto;
  web `npm run dev -w apps/web` bound to `0.0.0.0` (LAN URL `http://192.168.0.16:3000`, already in
  `allowedDevOrigins`); Metro on 8083 with `EXPO_PUBLIC_API_URL=http://192.168.0.16:8080`; reload the installed debug
  APK on the test phone (skill `android-test-phone`).
- [ ] **Web, Playwright on the LAN URL** at 360x640, 390x844, 412x915, 430x932 and a desktop width: open New job
  from the person view and from a day; single mode has no repeat; type a note, click a nav link -> discard dialog,
  Keep editing keeps the text; browser Back -> dialog; Discard leaves; reload while dirty -> browser prompt; create a
  "third Wednesday, no end date" series and check the preview sentence and the calendar; edit one job's start time
  with "All jobs" across a closed month and check the skipped count; change the schedule weekly -> monthly from a
  future job; screenshots of each state in light and dark into the scratchpad.
- [ ] **Phone (OnePlus 6T over adb):** the same flows; Android back and the gesture on a dirty form ask to discard;
  the soft keyboard opened and closed on the note field leaves the Save button reachable; Settings shows Job
  updates and Notification categories; after the JS reload the system's app notification settings list "Job
  updates"; an edit made on the web as the employer arrives on the phone as one `JOB_CHANGED` push after the quiet
  window (the employee account signed in on the phone), and turning Job updates off stops the push but keeps the item
  in the notification centre.
- [ ] **Extender:** covered by `RecurrenceExtenderTest` (it needs a moved clock); locally only confirm the scheduled
  job is registered (`recurrence-extender` in the Quarkus dev UI scheduler list or the startup log).
- [ ] **Docs.** `docs/CONTRACT.md`: index rows (`getJobScopeCounts`, `updateJob`/`deleteJob` text), the "Recurring
  jobs" section rewritten for monthly modes, open-ended series, scopes and schedule change. `docs/DECISIONS.md` D21
  "Recurring jobs: open-ended series as a 12-month rolling window, schedule changes split the series, closed months
  are skipped" (owner, 2026-10-23, CHQ-186/187). `docs/MOBILE.md` channel list if present. Run `agents sync` only if
  `AGENTS.md`/`.agents/` changed (they should not).
- [ ] **Commit C**: docs only. Subject: `CHQ-185, CHQ-186, CHQ-187, CHQ-188: contract index, recurring jobs section and D21`.
- [ ] **Final review:** one whole-branch review (`/code-review` at high, or the `superpowers:requesting-code-review`
  flow) against `main`, fix what it confirms, re-run the targeted tests of the touched areas. The branch is not on
  `main`, so fold each fix into its commit (`git commit --fixup <A|B|C>` then `git rebase --autosquash main`) and keep
  three commits.
- [ ] **Hand back to the owner:** branch name, the three commits, test results, screenshots, and what remains for a
  staging pass (merge to `main` deploys staging; the owner decides when). Jira: comment on CHQ-185 to 188 with the
  branch and session link; leave the tickets in their current status until the staging pass.

## Self-review notes (plan author)

- Ticket coverage: CHQ-185 -> Tasks 6, 7 (page, guard, single vs New job, all call sites); CHQ-186 -> Tasks 1, 2, 5,
  6, 7 (rule fields, pattern, open-ended + extender, UI); CHQ-187 -> Tasks 1, 3, 6, 7 (scopes incl. past, ALL,
  schedule change, counts, remove ALL); CHQ-188 -> Tasks 1, 4, 5, 6, 7 (kind, coalescing, texts, channel,
  preference, settings, icons).
- Deviation from CHQ-186's text: the extender is repeat-safe through the series' `end_date` cursor under a row lock
  (`FOR UPDATE SKIP LOCKED`) rather than a unique `(recurrence_id, work_date)` index; `job` has no date column and a
  re-run starts after the stored `end_date`, so the index is not needed.
- Old app versions in the wild: they ignore the new rule fields and `openEnded`, still read `endDate` (planned-through
  date) and `lastDayOfMonth`; a `JOB_CHANGED` row renders from server text with the default icon; they cannot send
  `ALL`. Nothing breaks.
