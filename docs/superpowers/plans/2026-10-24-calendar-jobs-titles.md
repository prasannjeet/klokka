# CHQ-191 Calendar jobs, job titles, phone person view, totals over 24 h: implementation plan

> For agentic workers: execute task by task with superpowers:subagent-driven-development (or inline). No code bodies
> here: the plan fixes WHAT and HOW (files, signatures, flow); the implementer writes the code.

**Ticket:** [CHQ-191](https://cleanhq.atlassian.net/browse/CHQ-191), one ticket for all five items (owner's call).
**Release:** v1.8.0 (minor: a new field in the contract), staging, end-to-end, then production and Google Play.

**Goal:** five owner requests, done with the same care for UX on web and phone as for the logic:

1. Totals of several jobs never show more than "24 h" (customer bug).
2. The employer adds a job straight from a tapped calendar date.
3. A job has an optional title, shown as its main label everywhere.
4. Phone: Back from a day opened from a person's month (or week) returns to that month (or week).
5. Phone: a person opens on Month, not Week.

**Owner's standing requirement for this ticket:** "it's not just the bug fix, UX is important for both Android and
web, so it needs to be done properly." Every item ships on both clients where it applies, looks like it was always
there, and is verified on staging in a browser at the four phone widths and on a real phone before production.

## Ground rules (repo `AGENTS.md` wins where this differs)

- **Branch and worktree.** Branch `CHQ-191-calendar-jobs-titles` in worktree
  `/home/dev/documents/projects/klokka-chq191`, cut from `main` (HEAD at planning time `07e2cf1`). Other sessions use
  the main checkout: never touch their files, stage explicit paths, never `git add -A`.
- **Java 25 for Maven:** `JAVA_HOME=/home/dev/.sdkman/candidates/java/25.0.2-amzn`, build with
  `mvn -f apps/api/pom.xml -pl contract,service ...`. **Never `mvn install` from the worktree** (it overwrites the
  shared `~/.m2` contract main uses). Gradle for the APK needs JDK 21.
- **Metro in a worktree** fails with `MODULE_NOT_FOUND expo-router/_ctx-shared` unless started with
  `NODE_PATH=apps/mobile/node_modules`.
- **Contract first:** edit `apps/api/contract/src/main/openapi/openapi.yaml`, then `npm run generate -w
  @klokka/api-client` and commit `packages/api-client/src/generated`. `npm run check` fails on drift.
- **Text:** every user-facing string in `packages/core/i18n/{sv,en}.json`, both languages, no em dash (lint enforces).
  `email.*` changes need `npm run emails` (regenerates `apps/api/service/src/main/resources/templates/digest.html`);
  CI runs `npm run emails:check`. Logto push (`npm run emails:push`) is only for the Logto templates, not the digest.
- **Bug fix needs a failing repro test first** (item 1). Features: test-after is fine.
- **Tests:** targeted (changed class or component) plus compile while working; the full API suite, web, mobile, core
  and landing suites plus `npm run lint` and `npm run check` once before the staging push (they were all green at
  1.7.0: API 210, mobile 172, landing 321, core 65).
- **Commits:** configured author only, no `Co-Authored-By`, no assistant mention, subject `CHQ-191: ...`. Two or
  three commits (API; clients; docs and release notes). One final whole-branch review (one reviewer subagent, most
  capable model) before merging.
- **Production** only after staging passes end to end; the owner authorized production and Play for this ticket
  ("if all ok, then next step is prod deploy plus android app update to play store"). Production checks are
  read-only (health, migration applied, counts). Never test on production.
- **Phones:** two adb phones (OnePlus 6T, Galaxy Z Flip 5), shared with other sessions. Take one with
  `/home/dev/documents/projects/phone-lock.sh take "CHQ-191" "<what>"`, use the `PHONE=<serial>` and `METRO=<port>`
  it prints, `release` it as soon as a check is done. Read the `android-test-phone` skill first (PINs, helper
  scripts, never tap outside the app under test: they are the owner's phones).

## Context: what exists today (verified at planning time)

### Item 1, the 24 h cap

- `packages/core/src/hours.ts`: `HOURS_MAX = 24`; `splitHours(hours, rule)` clamps to `HOURS_MAX * 60` minutes and
  returns `{ hours: 24, minutes: 0 }` for anything at or above 24. Right for one day or one job, wrong for a sum.
- `apps/web/src/lib/jobs.ts`: `formatDuration(hours, t)` ("3 h 15 min") is built on `splitHours`.
- Production evidence (read-only, 2026-10-24): membership `e7500620-9af8-43f9-86b7-50cd82989994` (Md Ismile Hossin
  Linkon, workspace STÄDMINATOR Golv och Puts, `employees_see_insights = false`) has 60.25 h on 1 to 23 Oct; a 3 h job
  on 24 Oct existed until 15:29:20 on 23 Oct. `getMemberMonth` returned total 63.25, planned 3; the web showed
  `formatDuration(60.25)` = "24 h". The owner's Android hero uses `MemberInsights.totalHours` with `formatHours`.
- Every call that formats a SUM through `formatDuration` (all must change):
  - `apps/web/src/components/employee-month.tsx:194`, `:200`, `:201` (employee month card when insights are off).
  - `apps/web/src/app/(app)/w/[slug]/month/employer-month-view.tsx:156`, `:157` ("so far, planned").
  - `apps/web/src/app/(app)/w/[slug]/calendar/team-calendar-view.tsx:114` (team day total).
  - `apps/mobile/src/features/team/TeamDayScreen.tsx:99` (team day total).
  - `apps/mobile/src/features/home/HomeScreen.tsx:134` (today's bar on the employer Home; `dayHours` reads the team's
    `currentWeek`, so it is a team sum).
  - Single-job and single-day uses (job editor durations, a day's hours, the editor's "day total so far") are
    correct and stay.

### Item 2, calendar date to new job

- Web: `apps/web/src/app/(app)/w/[slug]/calendar/team-calendar-view.tsx` renders `CalendarHeatmap` with `selected` /
  `onSelect`, then a panel for the selected date (heading `formatDate(selected, ...)`, a list of people with links to
  `/w/<slug>/month?member=...&month=...&day=...`, then `<TeamJobs entries={worked} date={selected} />`). No add action.
- Web editor routes: `apps/web/src/app/(app)/w/[slug]/jobs/new/page.tsx` reads `parseEditorParams(search)` from
  `apps/web/src/lib/job-links.ts` (`member`, `date`, `back`, plus the mode via `parseNewJobMode`) and
  `jobEditorHref(...)` builds the URL; `safeBack(back, slug)` validates the return path. Members come from
  `useMembers(workspaceId, month)` in `apps/web/src/lib/queries.ts`.
- Phone: `apps/mobile/src/features/team/TeamCalendarScreen.tsx` pushes `/team-day/[date]` on a day tap;
  `apps/mobile/src/features/team/TeamDayScreen.tsx` lists people (chips open `/member/[id]` with `view: 'day'`) and
  jobs (tap opens the editor in `edit` mode). No add action.
- Phone editor: `apps/mobile/src/features/jobs/jobEditorHref.ts` `jobEditorHref({ membershipId, date, mode, jobId? })`
  to `/job`; modes `single` (a day's plus: fixed date, no repeat), `full` (New job: date and repeat), `edit`.
  Members: `useMembers(workspaceId, month?)` in `apps/mobile/src/data/workspace.ts`. Bottom sheets follow
  `MemberActionsSheets` (`@expo/ui` bottom sheet).
- The API already accepts single jobs on past dates; a recurring series cannot start in the past (by design); a
  closed (locked) month refuses writes.

### Item 3, job title

- API job model: `JobEntity` / `JobRecurrenceEntity` (`apps/api/service/.../persistence/`), tables `job` (V3) and
  `job_recurrence` (template columns added in V6: hours, start_time, note, place_*). Latest migration is
  `V7__digest_on_by_default.sql`; this ticket adds **V8**.
- Write path: `entry/EntryWriter.java` `record JobInput(BigDecimal hours, LocalTime startTime, String note,
  JobLocation location)`; `newJob(...)` copies input to the row (`:361` onward); `notifyJob` builds
  `NotificationService.JobChange(jobId, date, kind, startTime, placeName, hours)` (`:377`); the "did anything change"
  list (`:382`) holds hours, start, note, place fields; `clean(String)` trims and blanks to null.
- `entry/JobService.java`: `input(Access, JobWrite)` (`:414`) maps the body; `setTemplate(row, JobInput)` (`:299`) and
  `templateOf(row)` (`:311`) are the series template the nightly `entry/RecurrenceExtender.java` replays;
  `entry/JobRequestHash.java` hashes the whole `JobWrite` body (a new field is hashed automatically; verify).
- Read path: `entry/EntryViews.java` `toJob(JobEntity, series)` (`:90` onward) maps to the contract `Job`.
- Push: `notification/NotificationService.java` (`JobChange`, the merged payload puts `placeName`, `:135`; the reminder
  payload `:225`), `notification/NotificationTexts.java` (`JobNews(date, kind, startTime, placeName)`, the
  `jobs.when*` lines at `:188` to `:256`, the reminder title/body at `:92` to `:114`),
  `notification/JobReminderJob.java` + `JobReminderRepository.java` (reminder rows carry place name, address, note).
- Digest: `mail/DigestJob.java` (job line `:349`: place name or `email.digest.noPlace`), `mail/DigestWorkbook.java`
  (Jobs sheet columns: Employee, Date, Weekday, Start, End, Hours, Place, Address, Note, Recurring; `text(...)` writes
  string cells), `mail/DigestWeek.java` (the week's rows), template `templates/digest.html` from
  `scripts/emails/build.mjs`.
- The month CSV export (`month/MonthService.csv`) is per day (hours and the day's joined note), no job rows: unchanged.
- Clients label a job by its place today: web `placesOf(jobs)` in `apps/web/src/lib/jobs.ts` (used by
  `components/day-list.tsx:66`, `components/employee-month.tsx:366` with the `jobs.jobCount` fallback), web
  `components/jobs/job-card.tsx`, `components/jobs/day-jobs.tsx`, `components/team-jobs.tsx`,
  `components/employee-week.tsx`; phone `features/jobs/JobCard.tsx`, `features/day/DayScreen.tsx`,
  `features/home/HomeScreen.tsx`, `features/month/MemberMonthView.tsx`, `features/week/WeekCard.tsx`,
  `features/team/TeamJobs.tsx`, `features/flags/ResolveFlagScreen.tsx`. `grep -rn "location?.name\|location\.name"`
  in both apps is the checklist; every hit decides title first.
- Editors: web `components/jobs/job-editor.tsx` (+ `job-editor.test.tsx`), phone
  `features/jobs/JobEditorScreen.tsx` (+ test). Both already have hours, start time, location, note, repeat, the
  discard guard and the scope step (`scope-step.tsx`, `ScopeStep.tsx`).

### Items 4 and 5, the phone person screen

- `apps/mobile/app/member/[membershipId].tsx`: `initialView = personViewOf(view) ?? (initialMonth ? 'month' : 'week')`.
- `apps/mobile/src/features/person/PersonScreen.tsx`: `view` is local state (`useState<PersonView>`), the Day / Week /
  Month `Segmented` switches it, and `openDay(date)` (from a week line or a month date) does `setDate` +
  `setView('day')`. The `Header` back button (`src/ui/Header.tsx:47`) calls `router.back()`, which leaves the whole
  screen, so Back after a date tap lands on People (or wherever the screen was opened from).
- `usePreventRemove` from `expo-router/react-navigation` is already used by `JobEditorScreen.tsx:314` to turn Back
  into an in-screen step; the same mechanism fixes item 4 for the button and the Android gesture.
- The employee's own app already opens on My month (`app/(tabs)/_layout.tsx`, `app/index.tsx`); the Day/Week/Month
  switch exists only on the employer's person screen. Item 5 is that screen's default.

## Locked decisions

1. **Totals use `formatHours`, never `formatDuration`.** Every sum listed under item 1 switches to `formatHours`
   from `@klokka/core` (decimal "60.25 h"), the format the owner's app, the phone's month pill and the digest
   already use, so an employee and an employer comparing screens see the same figure. `formatDuration` and
   `splitHours` stay as they are (their cap is right for one job or one day); `formatDuration` gets a one-line
   comment saying it is for one job or one day only.
2. **Calendar date opens the single-job editor.** The new action opens the editor in `single` mode for the tapped
   date: the same thing a day's plus does everywhere else (CHQ-185 rule: a day's plus adds one job, New job has a
   date and a repeat). Repeats stay on the person's New job.
3. **Who can be picked:** exactly the members the existing employer New job flows accept (read how the web employees
   list's "New job" item and the phone person screen decide; DEACTIVATED never). One eligible member: no picker,
   straight to the editor. None: the action is hidden and the empty state says why (catalogue text).
4. **Closed month:** the action stays visible but disabled, with the existing month-closed text next to it, so the
   employer learns why instead of finding nothing.
5. **Title:** optional, single line, trimmed, blank saved as null, at most **120** characters (API `maxLength: 120`,
   DB `varchar(120)`, inputs `maxLength` 120). It is a regular job field: part of `JobWrite`, the series template,
   the request hash and the "which jobs" scope, exactly like `note`.
6. **One display rule on every surface:** main label = title; place name becomes the second line (or follows after a
   comma where there is one line); with no title everything looks as today (place, or "1 job" / "No place").
   Shared helper in `packages/core` (`jobLabel`, `jobLabels`, below) for both clients; one Java helper for push,
   digest and workbook. Lists clip a long title to one line with an ellipsis; cards and the editor wrap it.
7. **Push texts with a title** use new keys that name the title instead of the place (the place is still in the
   reminder body's address). Old notification payloads without `title` render exactly as before.
8. **Workbook:** a **Title** column right after Hours (before Place) in the Jobs sheet, both versions.
9. **The week-grid batch never clears a title.** The legacy day write (`EntryWriter.write`, hours and note for a
   day) updates the day's single job's hours and note only; its title is left alone.
10. **Phone Back after a date tap:** returns to the view the day was opened from (Week or Month) on the same date's
    week or month. A Day view the screen was opened ON (team day chip, `view: 'day'`) keeps today's Back, which
    leaves the screen. Choosing a view in the switch clears the "came from" memory.
11. **Person screen default:** Month when no `view` is passed (People list, Employees list); `view` and `month`
    params keep working as today.
12. **Web parity for 4 and 5:** none needed. The web employer views are pages with their own URLs, and Back already
    works there; verify it once on staging rather than building anything.

## Task 1: API (contract, V8, title end to end)

**Files**
- Modify `apps/api/contract/src/main/openapi/openapi.yaml`: `Job.title` and `JobWrite.title`, both
  `type: [string, 'null']`, `maxLength: 120`, an example ("Window cleaning") added to both examples. `JobWrite`
  keeps "a field left out is cleared". Regenerate the TS client (`npm run generate -w @klokka/api-client`).
- Create `apps/api/service/src/main/resources/db/migration/V8__job_title.sql`: `job.title varchar(120)` and
  `job_recurrence.title varchar(120)`, nullable, additive (v1.7.0 keeps running on V8: rollback stays a tag pin).
- Modify `persistence/JobEntity.java`, `persistence/JobRecurrenceEntity.java`: `public String title;`.
- Modify `entry/EntryWriter.java`: `JobInput(BigDecimal hours, LocalTime startTime, String title, String note,
  JobLocation location)`; `newJob` and the job-update path copy `clean(input.title())`; the change-detection list
  includes `title`; `notifyJob` passes the title into `JobChange`; the legacy day write keeps the existing title
  (decision 9).
- Modify `entry/JobService.java`: `input(...)` maps `body.getTitle()`; `setTemplate` and `templateOf` carry `title`;
  check `JobRequestHash` covers the new field (it hashes the body; add a test that two bodies differing only in
  title hash differently).
- Modify `entry/EntryViews.java` `toJob`: `.title(j.title)`.
- Add one Java label helper (e.g. `static String label(String title, String placeName)` in `entry/EntryViews` or a
  small `entry/JobLabels` final class): title if present, else place name, else null. Push, digest and workbook use it.
- Modify `notification/NotificationService.java`: `JobChange(UUID jobId, LocalDate date, JobChangeKind kind, String
  startTime, String title, String placeName, BigDecimal hours)`; merged payload adds `title`; the reminder payload
  adds `title`.
- Modify `notification/NotificationTexts.java`: `JobNews(LocalDate date, String kind, String startTime, String title,
  String placeName)`; one-job lines pick `jobs.whenTitle` / `jobs.whenTimeTitle` when a title exists, else today's
  keys; reminder title picks `jobReminder.titleNamed` / `titleNamedTomorrow` when a title exists. Payloads without
  `title` take today's branches.
- Modify `notification/JobReminderRepository.java` and `JobReminderJob.java`: select and pass the job's title.
- Modify `mail/DigestWeek.java` (job rows gain `title`), `mail/DigestJob.java` (job line: title, then the place in
  the line's muted part when both exist; `email.digest.noPlace` only when neither), `mail/DigestWorkbook.java`
  (Title column, decision 8).
- Catalogue (`packages/core/i18n/{sv,en}.json`): `notifications.jobs.whenTitle` ("{workspace}: {date}, {title}"),
  `notifications.jobs.whenTimeTitle` ("{workspace}: {date}, {time}, {title}"), `notifications.jobReminder.titleNamed`
  ("{title} in {lead}"), `notifications.jobReminder.titleNamedTomorrow` ("{title} tomorrow at {time}"),
  `api.xlsx.title` ("Title" / "Titel"), any digest line key the new layout needs. Swedish written by hand, natural
  ("{title} om {lead}", "{title} i morgon kl. {time}"). If the API's `Text` enum lists keys, add them there.
  Run `npm run emails` if any `email.*` key changes.

**Tests (targeted)**
- Job create/update/read with a title, blank title saved as null, 121 characters refused with the standard
  validation problem; series create carries the title to every job and to the template; `RecurrenceExtender` plans
  new jobs with it; a "this and following" title change touches only those jobs; the week-grid batch keeps a title.
- Push: one-job change with a title renders the title line; without a title, today's text (positive control);
  reminder with a title.
- Digest: a job with a title shows it in the email text; workbook has the Title column at the right index (update
  existing column assertions).
- Then the full API suite once.

## Task 2: core and web (24 h fix, title, calendar new job)

**Item 1 first, failing test first.**
- Add a failing test that renders the employee month card (insights off) for 60.25 h so far and 3 h planned and
  expects "60.25 h" and "3 h" (today it shows "24 h"); same for the employer month "so far, planned" line and the team
  calendar day total over 24 h (several people). Then switch the five web call sites to `formatHours` (decision 1).

**Core helper.** `packages/core/src/jobs.ts` (or the existing module that fits; export from the package index):
- `jobLabel(job: { title?: string | null; location?: { name: string } | null }): string | null`
- `jobLabels(jobs: readonly JobLike[]): string[]` (unique, in order; replaces web `placesOf`).
- Unit tests in core. Delete `placesOf` from `apps/web/src/lib/jobs.ts` once nothing uses it.

**Title in the web editor** (`components/jobs/job-editor.tsx`): a Title field as the first field of the job panel,
label and placeholder from the catalogue (`jobs.title`, `jobs.titlePlaceholder`, e.g. "For example: Window
cleaning"), `maxLength` 120, one line, Enter does not submit, included in the dirty check and in the request body (and
in scope edits). Update `job-editor.test.tsx`.

**Title in web lists:** every surface from the item 3 context list uses `jobLabel`/`jobLabels`: job card (title as
heading, place as second line), day jobs, team jobs, day list, employee month "Jobs this month"
(`jobLabels(day.jobs).join(', ') || jobCount`), employee week. Long titles ellipsize in lists. Check both themes.

**Calendar new job** (`calendar/team-calendar-view.tsx`):
- In the selected-day panel header, a primary "New job" button (`jobs.newJob`, testID `calendar-new-job`), disabled
  with the month-closed text when the month is locked (decision 4).
- With one eligible member it navigates directly; otherwise it opens a picker anchored to the button (use the
  project's existing shadcn/Base UI menu or popover component; check `components/ui/` first): one row per member with
  avatar and name, keyboard navigable, focus visible, closes on Escape. At phone width the picker must fit the screen
  (a sheet-like full-width list is fine; size from content, cap with `dvh`, never `vh`).
- Choosing a member goes to `jobEditorHref({ member, date: selected, mode: 'single', back })` where `back` is the
  calendar URL with that date selected, so Save and Cancel return to the same day with the new job visible.
- Empty day: the panel's empty state also offers the action (one primary button), so an empty date is never a dead end.
- Catalogue keys for the picker title ("Who is the job for?") and the no-employees state, sv and en.
- Component test: one member skips the picker; several show it; locked month disables it; the link carries
  member, date, mode and back.

## Task 3: mobile (24 h fix, title, team day new job, person screen)

**Item 1, failing test first.** A test for `TeamDayScreen` with a team total over 24 h (expects "26.5 h", not
"24 h") and for the Home today bar; then switch `TeamDayScreen.tsx:99` and `HomeScreen.tsx:134` to `formatHours`.
Check `src/features` for any other sum through `formatDuration` the same way.

**Title in the phone editor** (`features/jobs/JobEditorScreen.tsx`): a Title `TextInput` as the first field of the
job panel, catalogue label and placeholder (same keys as web), `maxLength` 120, `autoCapitalize="sentences"`,
`returnKeyType="next"`, part of the dirty check (the discard prompt fires for a typed title) and of the body and
scope edits. The keyboard must not cover the field or the Save button (the screen uses the keyboard-controller
components; verify with the keyboard open and closed). Update `JobEditorScreen.test.tsx`.

**Title in phone lists:** `JobCard.tsx` (title as heading, place on the second line), `DayScreen.tsx`,
`HomeScreen.tsx`, `MemberMonthView.tsx`, `WeekCard.tsx`, `TeamJobs.tsx`, `ResolveFlagScreen.tsx`, all through
`jobLabel`/`jobLabels` from `@klokka/core`; one line with `numberOfLines={1}` in lists. Font scaling at 1.3 must not
break rows.

**Team day new job** (`features/team/TeamDayScreen.tsx`):
- A "New job" pill in the header's trailing slot, the same component and look as `PersonScreen`'s `person-new-job`
  (testID `team-day-new-job`), disabled with the month-closed text for a locked month.
- One eligible member: push `jobEditorHref({ membershipId, date, mode: 'single' })` directly. Several: open a new
  bottom sheet `features/team/PickPersonSheet.tsx` (built like `MemberActionsSheets`, `@expo/ui` bottom sheet): a
  title ("Who is the job for?"), one row per member (avatar, name, tap target at least `tapMin`, testID
  `pick-person-<membershipId>`), scrolls when the team is long; choosing closes the sheet and opens the editor.
- The empty-day state gets a primary "Add a job" button that does the same.
- After Save the editor's `router.back()` lands on the team day, and the new job shows without a manual refresh
  (check the job mutation invalidates the team-day query key; add the key if it does not).
- Tests: header action with one and several members, the sheet's rows, locked month disabled.

**Person screen** (`features/person/PersonScreen.tsx`, `app/member/[membershipId].tsx`):
- Item 5: the route's fallback becomes `'month'`; the comment above `MemberRoute` updated.
- Item 4: `PersonScreenInner` keeps `cameFrom: PersonView | null`. `openDay(date)` records the current view
  ('week' or 'month') before switching to Day; the `Segmented` `onChange` clears it.
  `usePreventRemove(view === 'day' && cameFrom !== null, () => { setView(cameFrom); clear cameFrom })` turns both the
  Header back button and the Android back gesture into "return to Week/Month" (the Header's `router.back()` triggers
  the same remove event, so no Header change is needed; verify).
- Tests: Month by default; month date tap, Back returns to Month (not `router.back()` out); week line tap, Back
  returns to Week; opened with `view: 'day'`, Back leaves the screen (positive control).

## Task 4: docs, release notes, review, merge

- `CHANGELOG.md` 1.8.0 entry (user-facing wording, no em dash).
- Play release notes `apps/mobile/fastlane/metadata/android/{en-US,sv-SE}/changelogs/21.txt` (the release bumps
  versionCode to 21; `npm run lint` runs `scripts/check-play-metadata.sh`, which checks their length).
- `docs/CONTRACT.md`: if it lists Job fields, add `title`. `docs/DECISIONS.md` only if a decision above is
  cross-cutting (the display rule, decision 6, is a good D23 candidate: one line).
- Landing site: if the app page or a guide lists job fields or shows a job card, add the title; otherwise nothing.
- Full local verification (below), then one final whole-branch review (most capable model, given the diff
  `main...CHQ-191-calendar-jobs-titles` and this plan, not your conclusions). Fix every Important finding with a test.
- Merge to `main` (fast-forward or merge commit, as CHQ-185/189 were), push. CI builds, deploys staging and builds
  the staging APK. If a path-filtered job is skipped, deploy that app by hand with
  `.github/scripts/coolify-deploy.sh` (token from env via Python; it contains a `|`, never `eval` it).

## Local verification (before the merge)

- API: full suite. Web: `vitest run`, `npm run lint`, `npm run check`. Mobile: `jest --ci --no-watchman
  --forceExit`. Core and landing suites. `npm run emails:check`.
- Web in a real browser on the LAN URL (`http://192.168.0.16:3000`, `allowedDevOrigins` set), local API on Dev
  Services or docker compose: Playwright at 360x640, 390x844, 412x915, 430x932 and 1280 wide, light and dark:
  - employee month card with insights off and more than 24 h: shows the real total;
  - employer calendar: tap a date, New job, picker, editor with that date, save, back on that date with the job;
    empty date; locked month disabled; a long title in the lists and the card; the title field with the soft
    keyboard (mobile viewport) opened and closed.
- Phone (take a phone from `phone-lock.sh`, debug build against the local API or staging, Metro on the `METRO` port
  the lock prints): editor title with the keyboard, the discard prompt with only a title typed, team day New job
  with the sheet, team total over 24 h, People to employee opens on Month, month date tap then Back (button and
  gesture) returns to Month, week line then Back returns to Week. Release the phone.
- Digest rendered locally through Mailpit with a titled job (email at 360 px light and dark, workbook read back with
  `uv run --with openpyxl`): Title column present, no formula cells.

## Staging end to end (after the merge; fix and repeat until everything passes)

Staging: web `https://klokka-app.coolify.ooguy.com`, API `https://klokka-api.coolify.ooguy.com`, accounts in
`.agents/local-credentials/staging-accounts.json` (employer `admin@blixo.ai`, employee `test@blixo.ai`, workspace
Kafé Nord). Staging APK from the CI run (Nexus raw). Do the whole list; anything broken is fixed on a branch commit,
pushed, redeployed and the list re-run from the failing step.

1. V8 applied (`flyway_schema_history` on the staging DB, `ssh testenv`), API healthy, web healthy.
2. Web as employer: calendar, tap a date with jobs, New job, pick Test Testsson, enter a title, save; the calendar
   shows the day with the titled job; tap an empty date, add from the empty state; a closed month shows the action
   disabled with the reason. At 390 px and 1280 px.
3. Web as employer: a repeating job with a title from the person's New job; change the title for "this and
   following"; earlier jobs keep the old title.
4. Web as employee (`test@blixo.ai`): the month card shows the real total when over 24 h (log enough hours on
   staging to pass 24), titles visible in Jobs this month and the week.
5. Phone, staging APK (take a phone): the employer's team day New job with the sheet; editor title; the employee's
   push for the titled job reads the title ("Job updates" notification; prove it with `dumpsys notification
   --noredact`); People to employee opens on Month; date tap then Back returns to Month; team total over 24 h
   correct. Release the phone.
6. Digest with a titled job: temporarily set `KLOKKA_DIGEST_CATCH_UP_DAYS=6` on staging and clear the test users'
   last `digest_run` rows (the method in `docs/releases/1.7.0.md`), trigger, check the email in the `blixo-admin` and
   `blixo-test` mailboxes (email MCP) and the attached workbook's Title column; then remove the override. A handful
   of emails only (Migadu allows about 100 a day).
7. Everything still works that 1.7.0 shipped: discard prompt, scope step, monthly repeats, job updates setting.

## Release (only when staging passed every step)

- From a clean worktree of `main`: `./release.sh minor` (v1.8.0; bumps the Maven versions and the mobile version and
  versionCode to 21, tags, pushes). The release workflow builds `klokka-{api,web,landing}:v1.8.0`, the production
  APK and AAB, and uploads the AAB to Play.
- Production (owner authorized): dump the database first (`ssh netcup docker exec gual64hodx8mn2x4xr04lbhm pg_dump
  -U postgres -Fc klokka > .agents/local-credentials/klokka-prod-before-v1.8.0-<stamp>.dump`), record job, entry,
  membership and recurrence counts, then pin `v1.8.0` in production Coolify with `coolify-prod-rw` in the order API,
  web, landing (`docs/RELEASING.md`, `docs/OPERATIONS.md`). Read-only checks after: API readiness, web health,
  landing `/` and `/en`, Logto discovery, `/v1/me` 401 without a token, V8 in `flyway_schema_history`, counts
  unchanged, landing still indexable.
- Google Play: **the release run leaves the internal release as a DRAFT** (`PLAY_RELEASE_STATUS=draft`). Read the
  tracks with a read-only edit (Android Publisher API with the Firebase service account: edits.insert, tracks.list,
  edits.delete), then set the internal release of versionCode 21 to `completed` (tracks.get, update the release's
  status, keep its release notes, commit). Read the tracks again and report what Play says, not what you expect.
  Closed testing (alpha) gets 21 as a draft like 20 (CHQ-161 gates it); a production promote is still refused until
  CHQ-161's steps are done.
- Record `docs/releases/1.8.0.md` (what changed, tests, deployment evidence, Play state, rollback = pin `v1.7.0`, V8
  is additive), update the status lines in `AGENTS.md` and `docs/OPERATIONS.md` ("Production is live (v1.8.0, ...)"),
  `docs/PLAY_STORE.md` if it records the current versionCode, run `agents sync` after the `AGENTS.md` edit, commit
  and push.
- Jira: walk CHQ-191 to Done (Start work, Send to review, Approve & merge, Close) with a release comment linking the
  session. Tell the customer-facing owner in the final report that the employee's month total is fixed in
  production (web), so they can tell STÄDMINATOR.
- If the test phone had the staging APK replaced during testing, put the staging APK back and release the phone.

## Done means

All five items work on staging and production, on web at the four phone widths and desktop in both themes, and on a
real phone; the full suites are green; Play internal testing serves versionCode 21 (`completed`); the release record
and the Jira ticket say what was verified.
