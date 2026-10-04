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
| `createJob` | `POST /workspaces/{workspaceId}/members/{membershipId}/entries/{date}/jobs` | employer | job sheet and dialog, any day (CHQ-156) |
| `updateJob` | `PUT /workspaces/{workspaceId}/jobs/{jobId}` | employer | job sheet and dialog |
| `deleteJob` | `DELETE /workspaces/{workspaceId}/jobs/{jobId}` | employer | job sheet and dialog "Remove" |
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
| `getMonthSummary` | `GET /workspaces/{workspaceId}/months/{month}/summary` | employer | close-month dialog, per-person totals |
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
- Push: every notification also goes out as an Expo message with `channelId` `hours`, `flags` or `workspace` and
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
