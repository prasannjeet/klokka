# Contract requests

Status after the integration pass (CHQ-143, 2026-09-28): every request below is marked Done (with the commit),
Deferred (with the reason and a line in `docs/BACKLOG.md`) or No change needed.

Changes the client trains would like in `apps/api/contract/src/main/openapi/openapi.yaml`, collected
here instead of editing the spec from a client branch (`docs/DECISIONS.md` D13: spec change first,
then regenerate, then both clients in the same commit). Each entry says what the client does today
without the change. Append only; the API train picks them up.

## From the mobile train (CHQ-105 to CHQ-139, 2026-09-28)

1. **`MyWorkspace` should carry `rounding` and `defaultDayHours`.** The quick-add sheet needs both **Done** (`2f2d6d2`, CHQ-143)
   (the "Full day" chip and the preview of what the rule makes of a typed value) on Home, Week and
   Day. Today the app issues `getWorkspace` next to `getMe` on every workspace screen just for those
   two fields. Both are already on `Workspace`.
2. **`Entry.hourlyRate` (nullable, the rate the earnings were computed with).** The day detail shows **Done** (`2f2d6d2`, CHQ-143)
   "1,073 kr at 165 kr/h"; the app derives the rate as `earnings / hours`, which drifts on rounded
   hours and cannot show the rate for an entry with 0 h.
3. **`GET /workspaces/{workspaceId}/flags/{flagId}`.** The resolve screen (opened from a push, a **Done** (`2f2d6d2`, CHQ-143)
   notification row or the Home card) has only the flag id; it lists every flag and filters. A
   direct read also serves a flag that is older than the list's default window.
4. **Push payload shapes.** The app follows `data.url` only when it matches one of these allowlisted **Done** (`2f2d6d2`, CHQ-143): documented on `registerPushToken`; the sweeper sends `data.url` and `channelId`.
   app paths, and switches the workspace first when the path names one:
   `/w/{workspaceId}/month/{yyyy-MM}`, `/w/{workspaceId}/members/{membershipId}/month/{yyyy-MM}`,
   `/w/{workspaceId}/members/{membershipId}/day/{yyyy-MM-dd}`, `/w/{workspaceId}/flags/{flagId}`,
   `/w/{workspaceId}/notifications`, `/w/{workspaceId}/employees`, `/w/{workspaceId}`, `/notifications`.
   The Android channel id in the Expo push message should be `hours` (hours added, changed, removed),
   `flags` (flagged, resolved) or `workspace` (invite accepted, month closed, month reopened); the app
   creates exactly these three channels. Please document both in the yaml's `registerPushToken` or
   `info.description` so the sender and the app cannot drift.
5. **A week read model, optional.** The phone's Week screen shows one person per page with a week **Deferred** (post-v1, see `docs/BACKLOG.md`): the client sum is presentation arithmetic under D9.
   total and "+2 h vs last week". There is no week endpoint, so the app sums the visible entries
   (`listEntries` over two weeks) on the client. It is presentation arithmetic over the entries the
   API returned, not a projection, so it is acceptable under D9; a
   `GET /workspaces/{workspaceId}/weeks/{date}` with per-member totals and the previous week would
   remove the client sum and the two-week fetch.
6. **`Notification.link` for `MONTH_CLOSED` should carry `membershipId`** (the employee's own), so **Done** (`2f2d6d2`, CHQ-143): the link already carried `membershipId`; verified on staging.
   the row can open "My month" directly; today the app falls back to the month tab from `month`
   alone, which works for the employee but not for an employer with several members.
7. **`getInvitation` `lang`.** The app passes the stored language; when the user is not signed in **No change needed** (as noted).
   yet (first invitation, web-first per D3) the web page decides. No change needed, noted for parity.


# Contract requests

What the client trains wish `apps/api/contract/src/main/openapi/openapi.yaml` had. The API train owns the
contract and decides; clients never hand-roll a type in the meantime (AGENTS.md "API contract"). Newest at
the bottom of each section.

## From the web train (apps/web, 2026-09-28)

### Needed to match the mockups

1. **`InvitationAccepted.workspaceSlug`**. After `POST /invitations/{token}/accept` the join page needs the **Done** (`2f2d6d2`, CHQ-143)
   slug for "Continue on the web" (`/w/{slug}`); today it reads `GET /me` again and finds the workspace by id.
2. **`Member.deactivatedAt`** (nullable date-time). The employees table in the mockup says "Left 30 Jun 2026" **Done** (`2f2d6d2`, CHQ-143)
   for a deactivated person; nothing in `Member` carries that date.
3. **`OperatorWorkspace.colour`**. Every workspace tile in the console falls back to the primary colour. **Done** (`2f2d6d2`, CHQ-143)
4. **Operator sorting and search**: `operatorListWorkspaces` `sort` with `invited` and `active`; **Deferred** (post-v1, see `docs/BACKLOG.md`)
   `operatorListUsers` `sort` (`name`, `lastSeen`, `created`); `operatorListInvitations` `sort` (`sent`) and
   `q`. The mockup has sortable headers on all three.
5. **`OperatorVolumeKind.previousMonthCount`** for the "vs Aug" column of Volume, By kind. **Deferred** (post-v1, see `docs/BACKLOG.md`)
6. **Per-deployment health**: `OperatorHealth` describes the API only. The Health mockup has a card per **Deferred** (post-v1, see `docs/BACKLOG.md`)
   deployment (API, web app, landing: host, p95 latency, 30-day uptime with daily ticks, load) and a
   one-line description per `OperatorDeploy`.
7. **Avatar photo upload**: `UserProfile.avatarUrl` exists but there is no operation to set it **Deferred** (post-v1, see `docs/BACKLOG.md`)
   (`UserProfileUpdate` has `name` and `avatarEmoji` only), so the profile's "Upload photo" is left out.
8. **Account management link**: the employer's account menu promises "Avatar, language, password"; **Deferred** (post-v1, see `docs/BACKLOG.md`)
   password change happens in Logto. A `Me.accountUrl` (or a documented Logto account-centre URL) would
   let the profile link there.

### Correctness

9. **`WorkspaceInsights.nothingLoggedDays` (array of `format: date`)**: typescript-fetch types it **Done** (`2f2d6d2`, CHQ-143): `{ date }` objects.
   `Array<Date>` but leaves the strings unconverted at runtime (`json['nothingLoggedDays']` is passed through).
   The web app accepts both today (`isoOf` in `apps/web/src/lib/time.ts`). Either use objects
   (`[{ date }]`, like `CurrentWeekDay`) so the generator converts them, or make it `type: string` with a
   pattern and no `format`.
10. **Batch problems per cell**: document that `Problem.errors[].field` for `POST entries/batch` is **Done** (`2f2d6d2`, CHQ-143)
    `items[<index>].<field>` (the grid maps it back to cells), and let `409 MONTH_LOCKED` on a batch name the
    offending items or month in `errors[]`, so a week that spans a closed and an open month can ring only
    the closed cells instead of every edited one.
11. **`Entry.changeCount` / `MemberMonthDay.changeCount`**: say whether the creation counts as a change. **Done** (`2f2d6d2`, CHQ-143): doc only, the creation counts.
    The web shows "edited N times" as `changeCount - 1`.

### Nice to have

12. **`MyWorkspace.rounding` and `defaultDayHours`**: the week grid needs both and calls **Done** (`2f2d6d2`, CHQ-143)
    `GET /workspaces/{id}` for them next to `/me`.
13. **Typed notification subjects**: `Notification.payload` is free-form. A `subjectName` (the employee a **Deferred** (post-v1, see `docs/BACKLOG.md`)
    flag or an accepted invitation is about) would allow "See Jonas's month" instead of "See the month".
14. **Named examples for the mock**: Prism serves one `/me` (an employee in two workspaces). Named examples **Deferred** (post-v1, see `docs/BACKLOG.md`)
    for an employer and for a platform admin (`Prefer: example=employer`) would let both clients drive every
    role against the mock; the web app bridges it today with a development-only persona rewrite
    (`apps/web/src/lib/dev-persona.ts`, never active in production).
