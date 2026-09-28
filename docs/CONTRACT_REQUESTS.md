# Contract requests

Changes the client trains would like in `apps/api/contract/src/main/openapi/openapi.yaml`, collected
here instead of editing the spec from a client branch (`docs/DECISIONS.md` D13: spec change first,
then regenerate, then both clients in the same commit). Each entry says what the client does today
without the change. Append only; the API train picks them up.

## From the mobile train (CHQ-105 to CHQ-139, 2026-09-28)

1. **`MyWorkspace` should carry `rounding` and `defaultDayHours`.** The quick-add sheet needs both
   (the "Full day" chip and the preview of what the rule makes of a typed value) on Home, Week and
   Day. Today the app issues `getWorkspace` next to `getMe` on every workspace screen just for those
   two fields. Both are already on `Workspace`.
2. **`Entry.hourlyRate` (nullable, the rate the earnings were computed with).** The day detail shows
   "1,073 kr at 165 kr/h"; the app derives the rate as `earnings / hours`, which drifts on rounded
   hours and cannot show the rate for an entry with 0 h.
3. **`GET /workspaces/{workspaceId}/flags/{flagId}`.** The resolve screen (opened from a push, a
   notification row or the Home card) has only the flag id; it lists every flag and filters. A
   direct read also serves a flag that is older than the list's default window.
4. **Push payload shapes.** The app follows `data.url` only when it matches one of these allowlisted
   app paths, and switches the workspace first when the path names one:
   `/w/{workspaceId}/month/{yyyy-MM}`, `/w/{workspaceId}/members/{membershipId}/month/{yyyy-MM}`,
   `/w/{workspaceId}/members/{membershipId}/day/{yyyy-MM-dd}`, `/w/{workspaceId}/flags/{flagId}`,
   `/w/{workspaceId}/notifications`, `/w/{workspaceId}/employees`, `/w/{workspaceId}`, `/notifications`.
   The Android channel id in the Expo push message should be `hours` (hours added, changed, removed),
   `flags` (flagged, resolved) or `workspace` (invite accepted, month closed, month reopened); the app
   creates exactly these three channels. Please document both in the yaml's `registerPushToken` or
   `info.description` so the sender and the app cannot drift.
5. **A week read model, optional.** The phone's Week screen shows one person per page with a week
   total and "+2 h vs last week". There is no week endpoint, so the app sums the visible entries
   (`listEntries` over two weeks) on the client. It is presentation arithmetic over the entries the
   API returned, not a projection, so it is acceptable under D9; a
   `GET /workspaces/{workspaceId}/weeks/{date}` with per-member totals and the previous week would
   remove the client sum and the two-week fetch.
6. **`Notification.link` for `MONTH_CLOSED` should carry `membershipId`** (the employee's own), so
   the row can open "My month" directly; today the app falls back to the month tab from `month`
   alone, which works for the employee but not for an employer with several members.
7. **`getInvitation` `lang`.** The app passes the stored language; when the user is not signed in
   yet (first invitation, web-first per D3) the web page decides. No change needed, noted for parity.
