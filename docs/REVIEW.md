# Klokka v1 review (CHQ-144)

The one whole-repository review before the `v1` tag, done 2026-09-28 on `train/review` (based on `main`
`e66580f`, the CHQ-143 integration train). Every file of `apps/api/service/src/main`, the web app's auth, BFF,
join and money paths, the phone's auth, push and deep-link code, `packages/core`, the CI workflow, the deploy
scripts, the Dockerfiles and the docs were read; every suspected defect below was confirmed in the code (and,
for the one P1, with a failing test) before it was recorded. Staging was not touched: no finding needed a
live probe, and the Kafé Nord workspace stays as the smoke pass left it.

Baseline before any change, all green: `mvn -f apps/api/pom.xml clean install` (102 tests + `HealthIT`),
root `npm test` (mobile 64, web 46, core, tokens, api-client), `npm run lint`, `npm run check`,
`npm run typecheck -w apps/mobile`, `npm run build -w apps/web -w apps/landing`.

## Summary

| Severity | Found | Fixed on this branch | Deferred (`docs/BACKLOG.md`) |
| --- | --- | --- | --- |
| P0 (security, data loss, wrong money or hours, broken parity, crash) | 0 | 0 | 0 |
| P1 | 1 | 1 | 0 |
| P2 | 1 | 0 | 1 |
| P3 | 17 | 3 (documentation) | 14 |
| Total | 19 | 4 | 15 |

Fix commits: `bb1f52d` (R1, the CSV formula guard, with a failing test first) and the documentation commit
that carries this file (R2, R3, R4). Nothing was pushed.

v1 blockers: none. The first follow-up to take is R5 (CI never typechecks the phone app).

## What was verified

Security and isolation (API)

- Authorization comes from the `membership` table on every workspace route: `WorkspaceAccess.member` /
  `employer` / `employerOrSelf` read `membership` by `(workspaceId, userId)`, a non-member gets 404, a member
  without the role 403; nothing reads a workspace role from the token (`auth/CurrentUser.java` exposes `sub`,
  `email`, `name` and the global role only).
- Every workspace repository method takes a `WorkspaceId` (`ArchitectureTest.everyWorkspaceRepositoryMethodTakesAWorkspaceId`,
  with a positive control) and every entity query filters on it; the exempt packages (`me`, `operator`,
  `webhook`, `notification`, `mail`, `invitation`) are keyed by user, token or job row and were read one by one:
  `NotificationRepository` always filters on `userId`, `MeRepository` on the caller's id, `InvitationRepository`
  on the token.
- Operator routes: `@RolesAllowed({platform-admin, operator})` on `OperatorResource`, roles from
  `roles,scope` claims; `quarkus.security.jaxrs.deny-unannotated-endpoints=true` and the ArchUnit guard rule
  cover the rest. `OperatorService` returns aggregates only.
- Logto webhook: HMAC-SHA256 over the raw bytes, `MessageDigest.isEqual` (constant time), signature checked
  before anything is applied, replay bounded by the `webhook_event (hook_id, event, created_at)` primary key.
- Invitation tokens: `inv_` + 16 bytes of `SecureRandom` (128 bits); accept is bound to the invitee email,
  repeat-safe for the same account and 403 for another; a revoked invitation deletes the row.
- `ProblemMapper`: one seam, stack traces never leave the process, unmapped throwables become a generic
  `INTERNAL`; the two clients render problems by `code` only (`apps/web/src/lib/problem.ts`,
  `apps/mobile/src/lib/problems.ts`), never `detail`.
- SQL: every native query uses named parameters; the operator sort is a switch over a fixed list.
- Bounds: batch 500 items (`klokka.entries.batch-max`), entry listing 62 days, notifications `limit` 1..100,
  operator `pageSize` 1..100, jobs `SKIP LOCKED` with configured batch sizes, insight loops bounded by the month.
- Flyway runs as `KLOKKA_DB_MIGRATE_USER`, the app as `KLOKKA_DB_USER` (`%prod` in `application.properties`),
  and the `%prod` secrets have no defaults.
- No secret is logged or returned; the Expo token filter is registered on the Expo client only (`ExpoAuthHeadersTest`).

Web app

- The BFF (`src/lib/bff.ts`) forwards only to `KLOKKA_API_BASE_URL`, encodes every path segment, refuses `.`,
  `..` and empty segments, whitelists request and response headers, follows no redirects, and demands a session
  for everything but `GET invitations/{token}`. The token is read server-side (`session.ts`); the browser holds
  the Logto session cookie only.
- Session cookie: `@logto/node` sets `httpOnly: true, sameSite: 'lax'`; `cookieSecure` is on for every
  `https://` base URL (`src/lib/logto.ts`). The mode and language cookies carry a theme and a locale only.
- `NEXT_PUBLIC_*`: the web app inlines nothing but `NEXT_PUBLIC_APP_URL`; the landing inlines three public URLs.
- The persona cookie is dead in production: `fakeSessionEnabled()` requires `NODE_ENV !== 'production'`,
  `next build` inlines `NODE_ENV`, so the built route handler
  (`.next/standalone/apps/web/.next/server/app/api/k/[...path]/route.js`) no longer contains the strings
  `KLOKKA_DEV_FAKE_SESSION` or `klokka_dev_persona` at all (checked on the built output), and the standalone
  `server.js` pins `process.env.NODE_ENV = 'production'` on its first lines.
- XSS: the only `dangerouslySetInnerHTML` sinks are static SVG paths (`components/icons.tsx`) and the landing's
  own constant scripts and the JSON-LD (with `<` escaped). Notes, names and notification text are rendered as
  React text.
- Open redirect: `safeNext()` allows only a same-origin path (`/...`, no `//`, no backslash) for `next`; the
  post-sign-in return goes through `postRedirectUri` (honoured by `@logto/next` 4.2.11 `handleSignIn`); the join
  page's return address is built from the token only.
- `/healthz` is unauthenticated, `force-dynamic`, touches nothing.

Mobile

- Tokens live in `expo-secure-store` under one key (`auth/tokenStorage.ts`); sign-out clears the store first,
  then the query cache and the push token, then ends the Logto session (`AuthProvider.signOut`,
  `features/shell/useSignOut.ts`); `android.allowBackup` is false.
- Deep links: push `data.url` goes through the shape allowlist in `features/push/notificationLinks.ts`; the OIDC
  redirect and logout URIs are the only paths the router ignores (`auth/authDeepLink.ts`).
- `resource` rides the authorize request, the code exchange and every refresh (`auth/oidcRequests.ts`, pinned
  by tests); PKCE S256, system browser, single-flight refresh.
- `EXPO_PUBLIC_*` holds the API URL, the Logto endpoint, the app id and the resource: public client values only.
- Release signing: CI injects `android.injected.signing.*` and then compares the APK's signer SHA-256 with the
  keystore's, failing the job on a mismatch or an empty keystore; a debug-signed APK cannot reach Nexus.

Correctness

- Money: the API is the only place that multiplies (`MemberViews.earnings`, `BigDecimal`, scale 2, `HALF_UP`);
  neither client computes an amount (`grep` for rate multiplications in `apps/web`, `apps/mobile`,
  `packages/core` finds only chart-width percentages). `packages/core/format.ts` formats what the API sends.
- Hours: `HoursRounding.apply` (API) and `roundHours` (core) round half up to the same steps and to two decimals;
  `parseHours` accepts at most two decimals, so the float path never sees a third.
- Time zones: work dates are plain dates end to end; "today" comes from the workspace zone on the API
  (`Months.today`), the web (`lib/time.ts` `todayIn`/`isoOf` via `serializeDate`) and the phone
  (`lib/dates.ts`, local getters); `MeService.toMyWorkspace`, the digest (`DigestJob`, workspace zone) and the
  month lock (keyed by the entry's `LocalDate`) have no UTC-day read left. The remaining `toISOString()` calls in
  the clients format instants (times of day), never work dates.
- Coalescing: one row per (recipient, workspace, actor) while unpushed, sliding quiet window capped by
  `max-delay`, a sitting that nets to nothing is dropped, `notification_coalesce_uk` keeps it to one bucket.
- Idempotency: `acceptInvitation` (same account returns the accepted view), `lockMonth`/`unlockMonth` (no second
  row, no second notification), a repeated batch (unchanged cells write no history and no notification).
- Soft-deleted entries: every read (`listLive`, `hoursPerDay`, `hoursPerMember`, `daysPerMember`,
  `lastEntryDates`, `countLiveInMonth`, `membersLoggedOn`, `weekdaysEverLogged`, `MeRepository.hoursBetween`,
  the operator's `month_hours`) filters `deleted_at is null`; the CSV goes through `listLive`.
- Deactivated members: refused as batch targets and single writes (`MEMBER_NOT_ACTIVE`), counted in insights
  only when they have hours, listed with their status in the month summary, filtered out of both week grids.

Parity

- Every operation of `docs/CONTRACT.md` is called by both clients, except by decision: the six operator
  routes and `batchUpsertEntries` are web-only (E10, D8), `registerPushToken`/`deletePushToken` and the single
  `upsertEntry`/`deleteEntry` are phone-only (no web push in v1, D8). `getMember` and `getFlag` are phone-only
  reads of what the web takes from `listMembers`/`listFlags`; the web downloads the CSV through the BFF URL.
- Pay off hides every money figure: the API nulls money unless `showPay` and the caller may see it
  (`MemberViews.maySeeRate`); the web renders money only through `<Money showPay>` (second lock) or behind
  `showPay &&`; every phone site is behind `showPay &&` (`MemberMonthView`, `DayScreen`, `InsightsScreen`,
  `EmployeesScreen`); the share card is hours-only.
- Languages: 883 keys in `sv.json` and `en.json`, identical key sets, no em dash; every literal `t('...')` key
  on the web is checked by `apps/web/src/lib/i18n.test.ts`; the phone's keys are checked by the typed `t()`
  (`npm run typecheck -w apps/mobile` is clean); the dynamic keys (`web.colour.*`, `web.emoji.*`,
  `web.operator.health.*`, `web.operator.kind.*`, `errors.*`) were enumerated against both catalogues. The
  only literal strings in JSX are keyboard key names (`Tab`, `Enter`, `Esc`) and the brand name.

CI/CD and ops

- Secrets are read from `secrets.*` into step env only; the docker login uses a job-local `DOCKER_CONFIG`; the
  keystore and `google-services.json` are removed with `if: always()`; `permissions: contents: read`.
- `coolify-deploy.sh` refuses any Coolify but staging, validates the uuid and the tag, reads the PATCH body,
  follows the deployment record and polls the health URL with bounded loops. `release.sh` refuses a dirty tree
  and reads the token from the gitignored credential file.
- The three images run as uid 1001; web and landing have container health checks, the API is polled externally
  (documented, in the backlog).
- `git ls-files | grep -i -E "cred|secret|keystore|google-services|\.env"` lists only the four `.env.example`
  files; `.gitignore` covers `.agents/local-credentials`, `*.keystore`, `*.jks`, `google-services.json`, `.env*`.

Quality

- No `TODO`/`FIXME` in shipped sources; `npm run lint` (ESLint em dash rules incl. JSX, Prettier, the repo-wide
  em dash grep) is clean; the docs the apps ship are the catalogues, which are clean too.
- No duplicated domain helper: hours, month geometry and formatting live in `packages/core`; the clients keep
  only their transport glue.

## Findings

Fixed on this branch

- **R1 (P1, fixed, `bb1f52d`)**: CSV formula injection.
  `apps/api/service/src/main/java/com/prasannjeet/klokka/month/CsvExport.java:42` (before the fix) wrote the
  member name and the note as typed; a cell starting with `=`, `+`, `-`, `@` (or a tab or CR) is evaluated by
  Excel, LibreOffice and Numbers. The name is chosen by the employee (`PATCH /me` copies it onto every
  membership, `MeService.updateProfile`), so an employee could plant `=HYPERLINK(...)` or a DDE payload in the
  employer's export. Fix: `CsvExport.text()` prefixes such a free-text cell with an apostrophe (CWE-1236);
  dates, numbers and the catalogue headers are untouched. Tests: `CsvExportTest` (the guard) and
  `MonthResourceTest.theCsvNeutralisesSpreadsheetFormulasInNamesAndNotes` (the rendered line), red before,
  green after.
- **R2 (P3, fixed)**: `README.md:11` said "design phase, nothing is implemented" and `AGENTS.md:26` "E0
  Foundations landed"; both now say v1 candidate and point at the smoke pass and this review.
- **R3 (P3, fixed)**: `docs/MOBILE.md:78` and the comment in `apps/mobile/plugins/withReleaseSigning.js:3`
  said the runners sign through the `KLOKKA_RELEASE_*` variables; CI signs with `android.injected.signing.*`
  and verifies the certificate (`.github/workflows/ci.yml`). The plugin serves local signed builds only; both
  texts say so now.
- **R4 (P3, fixed)**: `docs/STAGING_SMOKE.md:216` listed `batchUpsertEntries (Week)` among the phone's
  operations; the phone has no grid and writes one day at a time through `upsertEntry`/`deleteEntry`
  (`apps/mobile/src/features/entry/AddHoursSheet.tsx:69`), which D8 allows. Notifications still coalesce per
  sitting on the API, so the behaviour matches the web's.

Deferred (one line each in `docs/BACKLOG.md`)

- **R5 (P2)**: the `mobile` CI job runs jest only (`.github/workflows/ci.yml`, "Test" step); jest-expo strips
  types, so a wrong catalogue key or a type error in the phone app ships and surfaces as
  `RangeError: i18n: unknown key` on the device. `npm run typecheck -w apps/mobile` is clean today. Fix: add
  that step before the jest step (the `web` job gets this from `next build`, `packages` from `tsc`).
- **R6 (P3)**: coalescing race. `NotificationService.hoursChanged`
  (`notification/NotificationService.java:64`) reads the open row without a lock while `PushSweeper.sweep`
  (`push/PushSweeper.java:77`, `:85`) claims it with `FOR UPDATE SKIP LOCKED` and sets `pushedAt`; the
  entity has no `@Version` and Hibernate writes the full row back, so a merge that commits just after the
  sweep resets `pushed_at` to null and the sitting is pushed a second time. Milliseconds once per quiet
  window, in-app rows stay right. Fix: `findOpenByKey` with `LockModeType.PESSIMISTIC_WRITE` (or `@Version`).
- **R7 (P3)**: `ProblemMapper.klokka` (`error/ProblemMapper.java:42`) renders `KlokkaException.getMessage()`
  as `detail` for `INTERNAL` too, so `LogtoService.call` (`logto/LogtoService.java:141`) puts Logto's HTTP
  status and response body on the wire, and `MeService.zone` the stored time zone. No secret is in those
  bodies and neither client shows `detail`; a direct API caller sees internals. Fix: a generic detail for
  `INTERNAL` (the log line already keeps the cause).
- **R8 (P3)**: `application.properties:35,37,40,65,94,109` give `KLOKKA_AUTH_ISSUER`, `KLOKKA_AUTH_JWKS`,
  `KLOKKA_AUTH_AUDIENCE`, `KLOKKA_LOGTO_ENDPOINT` and `KLOKKA_WEB_BASE_URL` `.invalid`/localhost defaults in
  every profile, so a production pod missing one boots and then fails every request (or mints localhost invite
  links) instead of failing startup like the DB and M2M secrets do. Fix: `%prod.` keys without defaults.
- **R9 (P3)**: a deactivated member keeps `WorkspaceAccess.member` (`auth/WorkspaceAccess.java:35`, by design
  for reading history) and can still raise a flag (`flag/FlagService.java:71` checks self only) that the
  employer cannot FIX (`EntryWriter.requireWritable` answers `MEMBER_NOT_ACTIVE`), only dismiss. Fix: refuse
  `raise` for `DEACTIVATED` with `MEMBER_NOT_ACTIVE`.
- **R10 (P3)**: `GET /workspaces/{id}/flags` without `status` returns every flag ever raised
  (`persistence/FlagRepository.java:27`, no paging). Bounded by one workspace's history; add a limit or a
  default of open plus the latest resolved.
- **R11 (P3)**: week read models are ISO weeks (`month/Months.java:75,80`, `MonthService.weekTotals`,
  `bestWeek`) while the grids, the calendar and `currentWeek` follow the workspace `weekStart`; a
  Sunday-start workspace sees Monday-to-Sunday "week by week" bars next to a Sunday-to-Saturday grid. Decide
  (document "ISO weeks" on the charts, or key the read model on `weekStart`).
- **R12 (P3)**: `DigestJob.run` (`mail/DigestJob.java:74`) is one transaction for the whole batch: a database
  failure after some emails went out rolls back their `digest_run` and `email_send` rows, and the next sweep
  sends them again; a Monday-long outage skips that week (no catch-up). Fix: one `REQUIRES_NEW` transaction
  per user and a "due since" rule instead of "is Monday".
- **R13 (P3)**: CI hardening on self-hosted runners that hold the secrets: the actions are pinned by major
  tag only (`ci.yml:51,120,174` and the rest), and `curl -u "$NEXUS_USERNAME:$NEXUS_PASSWORD"` puts the
  password in argv (`ci.yml` "Publish the APK", `publish-contract.sh:50`), as does the Coolify bearer
  (`coolify-deploy.sh:37`); `ps` on the shared host sees them for the call's duration. Fix: pin to commit
  SHAs, pass credentials through `--netrc-file` or `-K -` on stdin.
- **R14 (P3)**: `OperatorRepository.like` (`operator/OperatorRepository.java:159`) passes `%` and `_` from the
  search box into `LIKE` unescaped (operator only, cosmetic).
- **R15 (P3)**: `errors.INVALID_SIGNATURE` is missing from both catalogues although `docs/CONTRACT.md`
  promises an `errors.*` key per `ProblemCode`; only Logto ever receives that code. Add the key or exempt it.
- **R16 (P3)**: `apps/landing/AGENTS.md` is Next's auto-generated agent-rules block (the landing's
  `next.config.ts` lacks `agentRules: false`; `apps/web/next.config.ts:18` sets it); and the landing's strings
  live in `apps/landing/src/lib/i18n/dictionaries.ts` (695 lines), outside the one catalogue D2 names. Set the
  flag and delete the file; record the landing's own dictionary as a decision or move it.
- **R17 (P3)**: `docs/INFRA.md` sections 2 and 8 still list the provisional env names (`LOGTO_ISSUER`,
  `DB_URL`, `API_BASE_URL`, ...) that `docs/DEPLOYMENT.md:108` says were replaced. Replace them in place.
- **R18 (P3)**: `GET /invitations/{token}` (`invitation/InvitationService.java:68`) keeps answering for an
  accepted invitation, with the invitee's email, the workspace and the inviter, for as long as the row exists;
  single use is enforced on accept only. Fix: 404 (or 410) once accepted, or clear the token on accept.
- **R19 (P3)**: `MailService.send` (`mail/MailService.java:66`) logs the recipient address on a failure; PII
  in the logs. Log the membership or user id instead.
