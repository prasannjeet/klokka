# Klokka API contract: the index

The contract is ONE file, `apps/api/contract/src/main/openapi/openapi.yaml` (OpenAPI 3.1). Everything that
crosses the client/API boundary is defined there first; the Quarkus server interfaces
(`com.prasannjeet.klokka:klokka-api-contract`) and the TypeScript client (`@klokka/api-client`) are generated
from it and never hand-written (docs/DECISIONS.md D13). This page is the plain-language index: one line per
operation, who may call it, which screen uses it.

Conventions (in full in the yaml's `info.description`): dates `2026-09-27`, months `2026-09`, hours as numbers
with two decimals, money as numbers in the workspace currency's major unit (null when pay is off), ids are
UUIDs except the Logto user id, errors are RFC 9457 `application/problem+json` with a stable `code`
(`ProblemCode`), and every localized string comes back in the user's stored language.

Roles: **user** = any signed-in person, **member** = a member of the workspace in the path, **employer** = the
workspace's employer, **self** = the member the path names, **operator** = the global `platform-admin` role,
**public** = no token.

## Operations

| Operation | Method and path | Who | Screens |
|---|---|---|---|
| `getMe` | `GET /me` | user | every app start, workspace switcher, profile |
| `updateMe` | `PATCH /me` | user | profile (name, emoji avatar) |
| `deleteMe` | `DELETE /me` | user | profile (web), Settings or Profile (mobile): delete the account and every owned workspace (CHQ-157) |
| `updateMyPreferences` | `PATCH /me/preferences` | user | profile and settings (language, push, digest, theme, job reminders and their lead time) |
| `registerPushToken` | `POST /me/push-tokens` | user | mobile sign-in |
| `deletePushToken` | `DELETE /me/push-tokens/{token}` | user | mobile sign-out |
| `createWorkspace` | `POST /workspaces` | user | sign-up step 2, "Create workspace" |
| `getWorkspace` | `GET /workspaces/{workspaceId}` | member | settings, every workspace screen's header |
| `updateWorkspace` | `PATCH /workspaces/{workspaceId}` | employer | settings (name, colour, emoji, time zone, week start, currency, rounding, day length, show pay, tell employees about a declined flag, show analysis to employees) |
| `listMembers` | `GET /workspaces/{workspaceId}/members` | member (rates: employer or self) | employees table, week grid rows, mobile People and Employees |
| `inviteMember` | `POST /workspaces/{workspaceId}/members` | employer | add employee |
| `getMember` | `GET /workspaces/{workspaceId}/members/{membershipId}` | employer or self | employee month header |
| `updateMember` | `PATCH /workspaces/{workspaceId}/members/{membershipId}` | employer | edit rate, deactivate, reactivate |
| `removeMember` | `DELETE /workspaces/{workspaceId}/members/{membershipId}` | employer | revoke invitation, remove |
| `resendInvitation` | `POST /workspaces/{workspaceId}/members/{membershipId}/invitation/resend` | employer | employees table "Resend" |
| `getInvitation` | `GET /invitations/{token}?lang=` | public | join page before sign-in, mobile invitation screen |
| `acceptInvitation` | `POST /invitations/{token}/accept` | user | join page after sign-in, mobile "Join" |
| `listEntries` | `GET /workspaces/{workspaceId}/entries?from&to&membershipId` | member (employees: own only) | week grid, mobile Week and Home cards |
| `upsertEntry` | `PUT /workspaces/{workspaceId}/members/{membershipId}/entries/{date}` | employer | week grid single cell (a day with 2+ jobs answers `409 ENTRY_HAS_JOBS`) |
| `deleteEntry` | `DELETE /workspaces/{workspaceId}/members/{membershipId}/entries/{date}` | employer | clear a day |
| `previewJobRecurrence` | `POST /workspaces/{workspaceId}/jobs/recurrence-preview` | employer | job editor's Repeat step: first four dates, count, last date and end (planned-through date for no end date); a schedule change sends `fromDate` |
| `createJob` | `POST /workspaces/{workspaceId}/members/{membershipId}/entries/{date}/jobs` | employer | job editor page: a day's plus (single job) and New job (date and repeat), any day (CHQ-156, CHQ-185) |
| `updateJob` | `PUT /workspaces/{workspaceId}/jobs/{jobId}?scope=` | employer | job editor page Save; a series edit goes through the scope step (ONLY_THIS, THIS_AND_FUTURE, ALL), a schedule change is THIS_AND_FUTURE only (CHQ-187) |
| `deleteJob` | `DELETE /workspaces/{workspaceId}/jobs/{jobId}?scope=` | employer | job editor page "Remove", with the same scope step; ALL asks a second time (CHQ-187) |
| `getJobScopeCounts` | `GET /workspaces/{workspaceId}/jobs/{jobId}/scope-counts` | employer | scope step: how many jobs each scope reaches and how many sit in closed months (CHQ-187) |
| `autocompletePlaces` | `GET /workspaces/{workspaceId}/places/autocomplete?input&session` | employer | location search (Google Places through the API) |
| `getPlace` | `GET /workspaces/{workspaceId}/places/{placeId}?session` | employer | picking a search result |
| `reverseGeocode` | `GET /workspaces/{workspaceId}/places/reverse?latitude&longitude` | employer | "Use where I am now" |
| `listRecentPlaces` | `GET /workspaces/{workspaceId}/places/recent` | employer | location search, empty box |
| `getMapImage` | `GET /workspaces/{workspaceId}/map.png?latitude&longitude&width&height&dark` | member | job cards (cached a week) |
| `batchUpsertEntries` | `POST /workspaces/{workspaceId}/entries/batch` | employer | week grid Save (D8) |
| `getEntryHistory` | `GET /workspaces/{workspaceId}/entries/{entryId}/history` | employer or self | day detail history, employee month day list |
| `getMonth` | `GET /workspaces/{workspaceId}/months/{month}` | member | month header lock badge |
| `lockMonth` | `PUT /workspaces/{workspaceId}/months/{month}/lock` | employer | "Close September" |
| `unlockMonth` | `DELETE /workspaces/{workspaceId}/months/{month}/lock` | employer | "Unlock September" |
| `getMonthSummary` | `GET /workspaces/{workspaceId}/months/{month}/summary` | employer | close-month dialog, per-person totals, team calendar (`days`) |
| `exportMonthCsv` | `GET /workspaces/{workspaceId}/months/{month}/export.csv?membershipId` | employer (self for own) | "Export CSV", mobile share sheet |
| `getMemberMonth` | `GET /workspaces/{workspaceId}/members/{membershipId}/months/{month}` | employer or self | employee month (web), My month and employee month (mobile), calendar heat-map |
| `getWorkspaceInsights` | `GET /workspaces/{workspaceId}/insights?month=` | employer | overview dashboard, mobile Insights and Home strip |
| `getMemberInsights` | `GET /workspaces/{workspaceId}/members/{membershipId}/insights?month=` | employer or self | employee dashboard figures, shareable card |
| `raiseFlag` | `POST /workspaces/{workspaceId}/entries/{entryId}/flags` | self | "Flag this entry" sheet |
| `listFlags` | `GET /workspaces/{workspaceId}/flags?status=` | employer (employees: own) | overview open-flag card, mobile flag rows |
| `getFlag` | `GET /workspaces/{workspaceId}/flags/{flagId}` | employer or the flag's member (others: 404) | mobile resolve screen opened from a push or a notification row |
| `resolveFlag` | `POST /workspaces/{workspaceId}/flags/{flagId}/resolve` | employer | "Set to 6 h" / "Dismiss", mobile resolve screen |
| `listNotifications` | `GET /notifications?workspaceId&unreadOnly&cursor&limit` | user | notification centre, badge |
| `markNotificationRead` | `POST /notifications/{notificationId}/read` | user | opening a row |
| `markAllNotificationsRead` | `POST /notifications/read-all?workspaceId` | user | "Mark all as read" |
| `operatorListWorkspaces` | `GET /operator/workspaces?q&pay&month&page&pageSize&sort` | operator | console: Workspaces |
| `operatorListUsers` | `GET /operator/users?q&role&page&pageSize` | operator | console: Users |
| `operatorListInvitations` | `GET /operator/invitations?status&month&page&pageSize` | operator | console: Invitations |
| `operatorResendInvitation` | `POST /operator/invitations/{invitationId}/resend` | operator | console: Invitations "Resend" |
| `operatorVolume` | `GET /operator/volume?month=` | operator | console: Volume |
| `operatorHealth` | `GET /operator/health` | operator | console: Health |
| `logtoWebhook` | `POST /webhooks/logto` | public, HMAC signed | Logto (membership and user events) |

Problem codes (`ProblemCode`): `VALIDATION` 400, `UNAUTHENTICATED` 401, `INVALID_SIGNATURE` 401, `FORBIDDEN` 403,
`INVITATION_EMAIL_MISMATCH` 403, `NOT_FOUND` 404, `CONFLICT` 409, `MONTH_LOCKED` 409, `MEMBER_NOT_ACTIVE` 409,
`FLAG_ALREADY_OPEN` 409, `INVITATION_EXPIRED` 410, `INTERNAL` 500, `NOT_IMPLEMENTED` 501. Clients localize
them with the `errors.*` keys of the catalogue; `detail` is for developers.

## Where it runs

- Real API: the paths above under `/v1` (`quarkus.rest.path`), e.g. `https://klokka-api.coolify.ooguy.com/v1/me`.
  The server also serves the yaml verbatim at `/q/openapi` and health at `/q/health/ready`.
- Web app: through the BFF at `/api/k/...` (the route handler adds the bearer, the browser never holds a token).
- Prism mock (`npm run mock:api`): `http://localhost:4010/me` and friends, WITHOUT the `/v1` prefix (Prism
  ignores the `servers` entry). Every schema carries an example, so every route answers with realistic data.
- Every operation not yet implemented answers `501 NOT_IMPLEMENTED` on the real API. As of the E1 to E10 API
  train (CHQ-109 to CHQ-141) every operation is implemented.
- PATCH bodies (`*Update` schemas): a property left out is unchanged; an explicit `null` clears it where the
  schema allows null (`MemberUpdate.hourlyRate`). The server reads the raw body to tell the two apart.
- `EntryBatchItem.hours` is optional as well as nullable: absent or `null` removes that day (a required
  nullable property would be rejected by the generated server validation).
- Money fields (`earnings`, `hourlyRate`, `labourCost`, `money` in payloads) are `null` unless the workspace has
  `showPay` on, the caller is the employer or the member themselves, and the member has an hourly rate (CHQ-145).
  `showPay` on a member's month or insights, and on an employee's `MyWorkspace`, is that effective value: an
  employee without a rate sees hours only until the employer sets one. `labourCost` is `null` while nobody in the
  month has a rate.
- Operator routes accept the `platform-admin` role from the `roles` claim or the `operator` scope from `scope`.
- Batch problems name the cells: `errors[].field` is `items[<index>].<field>` for `400 VALIDATION`, and a
  `409 MONTH_LOCKED` on `POST entries/batch` lists every item in a closed month as `items[<index>].workDate`.
- Push: every notification also goes out as an Expo message with `channelId` `hours`, `flags`, `workspace`,
  `reminders` or `jobs` (JOB_CHANGED, "Job updates", CHQ-188) and
  `data.url` set to one of the app paths listed on `registerPushToken`; the phone follows only those shapes.
- `WorkspaceInsights.nothingLoggedDays` is a list of `{ date }` objects (bare `format: date` strings in an array are
  left unconverted by the typescript-fetch runtime).

## Regenerating

- Server interfaces and models: `mvn -f apps/api/pom.xml install` (the contract module runs openapi-generator
  `jaxrs-spec`, `library=quarkus`, `interfaceOnly`; output under `target/`, never committed).
- TypeScript client: `npm run generate -w @klokka/api-client` (typescript-fetch into
  `packages/api-client/src/generated`, committed). `npm run check` fails when the committed client is stale.
- Both come from the same yaml, so a spec change is: edit the yaml, run both, implement against the new types.

## Versioning rule

- One version for the contract, the API and the client: `info.version` in the yaml equals the Maven version
  (`0.1.0-SNAPSHOT` is the moving `0.1.0`) and the npm version of `@klokka/api-client`. A release tags all three.
- While the version is `0.x`, breaking changes are allowed and bump the minor; the monorepo changes both
  clients in the same commit, so nothing outside the repo can be left behind.
- From `1.0.0`, `/v1` is additive only: new optional fields, new operations, new enum values (clients must have
  a default branch for unknown enum values and ignore unknown fields). A breaking change opens `/v2` next to
  `/v1`; the old prefix stays until every shipped mobile version has moved.
- Removing or renaming anything is a major bump; making a required field optional is minor; making an optional
  field required is breaking.

## Recurring jobs (CHQ-159, reworked in CHQ-186 to CHQ-188)

**Rules.** `JobWrite.recurrence` is WEEKLY (one or more weekdays, every 1 to 12 weeks) or MONTHLY (every 1 to
12 months), either on a day of the month (`monthlyBy` DAY_OF_MONTH, `dayOfMonth` 1 to 31, 31 meaning the last
day, clamped in shorter months without drift) or on the nth weekday (`monthlyBy` WEEKDAY_OF_MONTH,
`weekOfMonth` FIRST to FOURTH or LAST plus `weekday`, e.g. the third Wednesday). Older clients that send
`lastDayOfMonth: true` are read as `dayOfMonth: 31`, and responses still set `lastDayOfMonth` for them. An
interval counts from the series' first date (its week's Monday, or its month). Creating a series needs a
retry-safe `requestId`; it starts today or later in the workspace time zone, and the preview and the series come
from the same code (`RecurrencePattern`), up to 500 jobs and 10 years by default.

**Ends.** At most one of `endDate` (inclusive) or `periodCount` (calendar weeks or months from the first date,
regardless of interval). With neither, the series is open-ended: a rolling window, jobs materialised
`klokka.recurrence.horizon-months` (12) ahead, and the nightly `RecurrenceExtender` tops every open, running
series up to the horizon with the series' template values (hours, start, note, place, kept current by range
edits), skipping closed months and sending no notifications. `job_recurrence.end_date` then means "planned
through", and the preview's `endDate` is that date. Employees read jobs through the normal entries and month
operations; future hours count as planned in the read models. A day total over 24 hours rolls back the whole
write.

**Scopes.** `updateJob` and `deleteJob` take `scope`: `ONLY_THIS` (default), `THIS_AND_FUTURE` (from the
selected job on, past jobs included) or `ALL` (the whole series, past included). A schedule change splits a
series into parts that point back with `previous_id`; THIS_AND_FUTURE also reaches the later parts and ALL walks
the chain back to the first part and forward to the current one (bounded by `klokka.recurrence.max-parts`, 100;
a longer chain is a data error). Field changes on a range also become the current part's template. Range scopes
skip jobs in closed months and count them (`getJobScopeCounts` shows `jobs` and `skippedClosed` per scope); a range
that is entirely closed answers `409 MONTH_LOCKED`, as ONLY_THIS on a job in a closed month does. Removing with
THIS_AND_FUTURE or ALL removes the writable jobs and stops the parts it covers.

**Schedule change.** A body with `recurrence` on `updateJob` changes the schedule: THIS_AND_FUTURE only, with a
`requestId`, from `from` = the later of the selected job's date and today. Past jobs never move. The new rule is
anchored at the selected job's date (an on-period of the old series), so "every 2 weeks" or "every 2 months"
keeps its rhythm when the change is made from a past job; only the dates on or after `from` are written, a
`periodCount` and the end check count from `from`, and the stored first date is the first planned date (on the
same rhythm, so the extender plans the same dates). The old part's jobs from `from` on are removed (closed months
kept). If live jobs remain before `from`, the series splits: the old part ends the day before and is stopped, and
a new part with `previous_id` starts; otherwise the part is rewritten in place. A stopped series (ended by an
earlier change or a removal) answers `409 CONFLICT`; the clients only offer a schedule change on a running one.
The clients preview a change with `firstDate` = the selected job's date and `fromDate` = `from`, so the preview
lists exactly the dates the change writes.

**Retries.** The series row is locked first, so a retry that waited finds the first attempt's row by
`requestId` and answers the same day without writing; the same key with another body is `400 VALIDATION` on
`requestId`. Accepted gap: an in-place rewrite replaces the series' creation `requestId` with the change's, so a
creation retry that arrives after a schedule change on the same series is no longer recognised (a narrow window,
since the creation answered long before).

**Notifications.** Every job write (add, edit, remove, series creation, schedule change, stop), past dates
included, produces `JOB_CHANGED` instead of `HOURS_CHANGED`, coalesced per sitting like hours and keyed per job:
added then removed is no news, added then changed stays added. Titles count jobs; on a date where one job was
removed and another added (as a schedule change leaves it) the pair reads as one changed job. One date links to
that day, several to the month of the first. Day-level writes (the week grid) keep `HOURS_CHANGED`; the extender
never notifies. The `jobUpdates` preference (default on) gates the push only; the row still appears in the
notification centre.
