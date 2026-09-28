# Contract requests

What the client trains wish `apps/api/contract/src/main/openapi/openapi.yaml` had. The API train owns the
contract and decides; clients never hand-roll a type in the meantime (AGENTS.md "API contract"). Newest at
the bottom of each section.

## From the web train (apps/web, 2026-09-28)

### Needed to match the mockups

1. **`InvitationAccepted.workspaceSlug`**. After `POST /invitations/{token}/accept` the join page needs the
   slug for "Continue on the web" (`/w/{slug}`); today it reads `GET /me` again and finds the workspace by id.
2. **`Member.deactivatedAt`** (nullable date-time). The employees table in the mockup says "Left 30 Jun 2026"
   for a deactivated person; nothing in `Member` carries that date.
3. **`OperatorWorkspace.colour`**. Every workspace tile in the console falls back to the primary colour.
4. **Operator sorting and search**: `operatorListWorkspaces` `sort` with `invited` and `active`;
   `operatorListUsers` `sort` (`name`, `lastSeen`, `created`); `operatorListInvitations` `sort` (`sent`) and
   `q`. The mockup has sortable headers on all three.
5. **`OperatorVolumeKind.previousMonthCount`** for the "vs Aug" column of Volume, By kind.
6. **Per-deployment health**: `OperatorHealth` describes the API only. The Health mockup has a card per
   deployment (API, web app, landing: host, p95 latency, 30-day uptime with daily ticks, load) and a
   one-line description per `OperatorDeploy`.
7. **Avatar photo upload**: `UserProfile.avatarUrl` exists but there is no operation to set it
   (`UserProfileUpdate` has `name` and `avatarEmoji` only), so the profile's "Upload photo" is left out.
8. **Account management link**: the employer's account menu promises "Avatar, language, password";
   password change happens in Logto. A `Me.accountUrl` (or a documented Logto account-centre URL) would
   let the profile link there.

### Correctness

9. **`WorkspaceInsights.nothingLoggedDays` (array of `format: date`)**: typescript-fetch types it
   `Array<Date>` but leaves the strings unconverted at runtime (`json['nothingLoggedDays']` is passed through).
   The web app accepts both today (`isoOf` in `apps/web/src/lib/time.ts`). Either use objects
   (`[{ date }]`, like `CurrentWeekDay`) so the generator converts them, or make it `type: string` with a
   pattern and no `format`.
10. **Batch problems per cell**: document that `Problem.errors[].field` for `POST entries/batch` is
    `items[<index>].<field>` (the grid maps it back to cells), and let `409 MONTH_LOCKED` on a batch name the
    offending items or month in `errors[]`, so a week that spans a closed and an open month can ring only
    the closed cells instead of every edited one.
11. **`Entry.changeCount` / `MemberMonthDay.changeCount`**: say whether the creation counts as a change.
    The web shows "edited N times" as `changeCount - 1`.

### Nice to have

12. **`MyWorkspace.rounding` and `defaultDayHours`**: the week grid needs both and calls
    `GET /workspaces/{id}` for them next to `/me`.
13. **Typed notification subjects**: `Notification.payload` is free-form. A `subjectName` (the employee a
    flag or an accepted invitation is about) would allow "See Jonas's month" instead of "See the month".
14. **Named examples for the mock**: Prism serves one `/me` (an employee in two workspaces). Named examples
    for an employer and for a platform admin (`Prefer: example=employer`) would let both clients drive every
    role against the mock; the web app bridges it today with a development-only persona rewrite
    (`apps/web/src/lib/dev-persona.ts`, never active in production).
