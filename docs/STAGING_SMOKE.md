# Staging smoke (CHQ-143, integration pass)

End-to-end run of Klokka on STAGING with real accounts, 2026-09-28. Every step below was driven against
`https://klokka-app.coolify.ooguy.com` (web), `https://klokka-api.coolify.ooguy.com/v1` (API) and Klokka's own
Logto with Playwright 1.61 (headless Chromium) plus the API and the Logto Management API for the checks a
browser cannot see. Staging holds test data only; nothing here touched production.

Accounts (passwords in `.agents/local-credentials/staging-accounts.json`, gitignored, never in a doc):

| Role | Login (mailbox) | Logto user |
|---|---|---|
| Employer | `admin@blixo.ai` | `wzs936oq5rt2` |
| Employee | `test@blixo.ai` | `k67qyks2c6jh` |
| Operator (`platform-admin`) | `sleep-chooser-coma@duck.com` (password in `logto.json`) | `6uqr9falofc6` |

Workspace created: **Kafé Nord** (`kafe-nord`, id `dc4a1be0-67b1-4f58-9b17-29bc5861f174`, Logto organization
`si4b05c5c8ue`), employer Anna Admin (`admin@blixo.ai`), employee Test Testsson (`test@blixo.ai`). It stays in
place for the owner: W39 logged (8, 8, 6, 8, 8 = 38 h, one note), one flag fixed and one dismissed, pay off
(rate 165 SEK still stored), September open, both accounts in Swedish (the employer switched in step 6).

## Summary

| # | Step | Result |
|---|---|---|
| 1 | Employer sign-up, workspace, empty Overview | PASS, fixes `c3a3816` (Logto 401), `a901fa7` (employer's name) |
| 2 | Invitation, accept, "invite accepted" | PASS, fixes `547dbf3` (typed name kept, device language, Logto name mirror), `66ee2f7` |
| 3 | Hours: chips, note, Fill week, one Save, history, one coalesced notification | PASS, fix `86c51d1` (P0: dates one day early east of UTC) |
| 4 | Flag and FIX on both sides | PASS, fix `c6e6991` (history "0 h") |
| 5 | Pay on/off everywhere, CSV, month lock and unlock | PASS |
| 6 | Insights by hand, calendar, language switch incl. the next notification | PASS, fix `34dcc35` ("sep..") |
| 7 | Operator console: workspaces, users, invitations, volume, health | PASS, fixes `b12c482` + `451483a` (operator "?"), `870d37b` (version) |
| 8 | Mobile: debug APK served, CI `assembleRelease`, sign-in URL, same operations | PASS (no phone attached) |
| 9 | Contract requests | 12 done, 8 deferred, 1 no change (`2f2d6d2`, `178ff6c`) |
| 10 | Rough edges | fixed as found, list below; plus `870f355`, `adb266a` and `06b14a3` (a sitting that only cleared days, or added and cleared the same days) |

10 of 10 steps pass; 14 code commits on `train/integration` (13 fixes plus the contract change) and 6 docs commits, none pushed. Staging runs API `sha-06b14a3`, web
`sha-178ff6c` (the last web change), landing `sha-2544a8e` (unchanged).

## Stays open for the owner

- Push on a real phone (Custom Tab sign-in, token registration, a tap that deep-links): needs a device.
- The flag dialog stays available while a month is closed (a flag is not an edit); decide whether to hide it.
- Logto's email templates are still English placeholder copy (backlog); the owner's Logto password is still
  the generated one (`docs/INFRA.md` section 9).
- `OperatorUser.platformAdmin` is always false (the role lives in Logto only; backlog).
- Coolify changes made during the pass, all on staging: `KLOKKA_API_RESOURCE` and `KLOKKA_ANDROID_APK_URL` on
  `klokka-web` (replacing `LOGTO_API_RESOURCE`), `KLOKKA_OPERATOR_API_URL` and `KLOKKA_OPERATOR_LANDING_URL` on
  `klokka-api`; `KLOKKA_PUSH_QUIET_WINDOW` was set to `PT2M` for the pass and removed again (default 10 min);
  the temporary OIDC debug logging variables were removed. Logto hook events now include `User.Deleted`.
- The debug APK is served from this host at `http://192.168.0.16:8898/app-debug.apk` (python `http.server`,
  left running); the release APK is `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`,
  debug-signed (no keystore properties locally).


## Before the pass: what was broken on arrival

| # | Finding | Fix |
|---|---|---|
| A | Web app answered `500` on every page: `KLOKKA_API_RESOURCE` missing (Coolify had the provisional name `LOGTO_API_RESOURCE`). | Env renamed on Coolify (`KLOKKA_API_RESOURCE`, plus `KLOKKA_ANDROID_APK_URL`); `docs/DEPLOYMENT.md` names now match `apps/web/src/lib/env.ts`. |
| B | API `/q/health/well` reported Logto DOWN (`HTTP 401`); workspace creation and invitations would have failed. Cause: `ExpoAuthHeaders` was a `@Provider`, so Quarkus registered it on every REST client and the Expo access token replaced the Logto bearer (`ERR_JWS_INVALID` from Logto). Invisible locally because the Expo token is empty there. | `c3a3816` (regression test `ExpoAuthHeadersTest`). |
| C | Logto hook lacked `User.Deleted` (DEPLOYMENT.md asked for it). | Added through the Management API (`PATCH /api/hooks/eoeb31x3brwyfaeb5081x`). |
| D | `KLOKKA_OPERATOR_API_URL` / `KLOKKA_OPERATOR_LANDING_URL` were not set on Coolify, so the operator Health page could only probe the web app. | Set on Coolify. |

## The checklist

Legend: PASS, FAIL (with the fix commit), OPEN (stays open, with the reason).

### 1. Employer signs up and creates a workspace: PASS

Logto hosted register page from the web app's "Create a workspace" (email `admin@blixo.ai`, verification code
read from the mailbox, password set on Logto's `continue/password` page), back through `/callback` to `/new`
(step 2 of 2), workspace **Kafé Nord** (Sweden, Europe/Stockholm, SEK, Monday, slug `kafe-nord`, Logto
organization `si4b05c5c8ue`), lands on the empty Overview. The empty overview renders every tile with zeros.

Found and fixed on the way: workspace creation answered 500 until fix B above (`c3a3816`); sign-up never asks
for the employer's name, so the profile name was the email's local part ("admin") and the invitation email
read " invited you to the workspace" (Logto's `{{inviter.name}}` was empty): the first-workspace step now asks
for the name and the API mirrors chosen names to Logto (`a901fa7`, `547dbf3`). The web's "Create a workspace"
button hands over to Logto in the browser language (English here, Swedish with `sv`), as intended.

### 2. Invitation, accept, "invite accepted" notification: PASS (with fixes)

`POST /workspaces/{id}/members` sent one email through Logto's connector (subject "You are invited to Kafé
Nord on Klokka", link `https://klokka-app.coolify.ooguy.com/join?token=inv_...`, expiry 7 days); the join page
showed the workspace tile before sign-in; "Join Kafé Nord" opened Logto's register page with the invited
address prefilled (`login_hint`); after the code and the password the browser came back to
`/join?token=...&accept=1`, the invitation was accepted automatically ("You joined Kafé Nord", Logto invitation
`Accepted`, organization role EMPLOYEE) and "Continue on the web" landed on the employee's My month. The
employer's notification centre shows "accepted your invitation" with "See employees".

Found and fixed: the accept path copied the profile name (still the email's local part, "test") over the name
the employer typed ("Test Testsson") and the notification said "test accepted your invitation"; and the
employee's preferences were created without the browser's `Accept-Language`, so an English browser landed in
Swedish. Both in `547dbf3`. A later rename in Profile now reaches every membership too (`66ee2f7`).

### 3. Hours: single day with a chip and a note, week grid with Fill week and one Save: PASS (with a P0 fix)

Week grid of W39 (21 to 27 Sep): Wednesday selected, chip "4", Note "Delivery day, stayed to unload", Keep,
Save (one batch); then Monday selected, Fill week (fills the empty weekdays with the 8 h day), Save (one
batch). Toast "Saved as one batch, {name} gets one notification for this sitting".

Found and fixed (P0): the grid drew every entry one day early in Europe/Stockholm (`isoOf()` read the UTC day
of a Date the generated client had parsed as local midnight), so the 4 h landed under Tuesday on screen and
Fill week then overwrote the real Wednesday. `86c51d1`, with a round-trip test in four time zones; the host
and the web train's Playwright runs are UTC, which is why it never showed. After the fix the week was
repaired to Mon 8, Tue 8, Wed 4 (note), Thu 8, Fri 8 = 36 h.

History (employer's Employee month, day 23): "admin logged 4 h (note) / changed 4 h to 8 h / changed 8 h to
4 h (note)", "edited 2 times". Employee's My month: calendar cells "måndag 21 september, 8 h" ... "onsdag 23
september, 4 h, Anteckning: Delivery day, stayed to unload", 36 h, 1.8 h per working day (36 / 20 elapsed
working days), best week W39 36 h, streak 5.

Notifications (quiet window set to 2 minutes on staging through `KLOKKA_PUSH_QUIET_WINDOW`, restored to the
default at the end of the pass): the employee's centre shows ONE item per sitting, coalesced: "admin lade till
4 dagar, 32 h / 32 h i vecka 39. mån 21 sep. till fre 25 sep." for the first sitting (both saves, 2 minutes
apart) and "admin lade till 2 dagar, 12 h" for the repair sitting. Swedish because the employee's stored
language is `sv`.

### 4. Flag and FIX: PASS

Employee (My month, day 23): "Flagga den här posten", reason "Jag jobbade mer", 6 h, message, "Skicka flagga":
the day shows "Öppen flagga: 6 h i stället för 4 h", toast "Flaggan skickad till admin". Employer: Overview
open-flag card (4 h to 6 h, the message, Set to 6 h / Open in the grid / Dismiss) and the notification centre
item with the same actions; "Set to 6 h" opens "Set Wednesday 23 September to 6 h?" and "Fix and tell": toast
"Resolved: you changed 4 h to 6 h. test is told either way." Afterwards the employer's item keeps only "See
the month", the employee's centre shows "admin rättade din flagga. ons 23 sep. är nu 6 h.", the day is 6 h on
both sides and the history reads (newest first) changed 4 h to 6 h, fixed the flag, flagged the entry, then
the earlier edits. Insights moved from 36 to 38 h (projection 41.8, average 1.9), open flags back to 0.

Rough edge: the FLAG_FIXED history line said "fixed the flag: 0 h" because the API recorded no hours on that
row (the 4 to 6 change is its own row). Fixed in the API by recording the resolved hours on the row.

### 7. Operator console with the owner's `platform-admin` account: PASS (one fix)

Signed in through the web app's "Continue" with `sleep-chooser-coma@duck.com` (Logto sign-in page, email +
password); with no workspace the app lands on `/ops/workspaces`. Workspaces: 1 (Kafé Nord, 2 members, 38 h,
pay on, created 28 Sept, last activity today). Users: the three people with role counts, language and push
state. Invitations: the one invitation, Accepted, median time to accept 0.1 h. Volume: 2 of 100 emails this
month (1 invitation, 1 verification, the ledger counts exactly what this pass sent), 5 in-app items, "8 entry
changes became 2 notifications, one per person and sitting". Health: "All systems normal", postgres, logto,
smtp, api, web and landing all Up with latencies (the two URL probes needed `KLOKKA_OPERATOR_API_URL` and
`KLOKKA_OPERATOR_LANDING_URL` on Coolify, fix D above).

Found and fixed: the operator showed as "?" without an email in Users because the owner's Logto user predates
the webhook, so nothing had mirrored the profile; the first `/me` now reads the Logto profile when the token
carries no email. The Health page showed version `dev`: the API image now carries `KLOKKA_BUILD_VERSION`
(`0.1.0-<short sha>`) through a build argument set by `image.sh` (CI and `release.sh` alike).

### 5. Pay switch, CSV export, month lock: PASS

Pay on (Settings, "Show pay": toast "Pay is now shown"), rate 165 SEK for Test Testsson (Employees, "Edit
rate"): the Employees table gains Hourly rate and Earned columns (SEK 165, SEK 6,270 = 38 h x 165), the Overview
hero shows SEK 6,270 under the hours, Employee month shows "Earned in September SEK 6,270, SEK 165 per hour" and
SEK 990 on the 6 h day, the week grid shows the rate under the name and SEK 6,270 on the row total; the
employee's My month shows "6 270 kr" and "165 kr per timme, före skatt", 990 kr on the day, and the share card
stays hours-only ("aldrig lön"). Pay off (toast "Pay is hidden"): every one of those figures is gone on both
sides (the employee's tile becomes the streak).

CSV (`GET .../months/2026-09/export.csv` through the BFF): 200, `text/csv;charset=UTF-8`,
`attachment; filename="klokka-kafe-nord-2026-09.csv"`, starts with the BOM (`ef bb bf`), `;` separated,
`Date;Weekday;Person;Hours;Note;Hourly rate;Amount` with pay on and without the two money columns with pay off.

Month lock ("Close September" on the week grid, confirmation with the month's total, toast): every grid cell is
read-only, the button becomes "Unlock September"; `PUT .../entries/2026-09-29` answers `409 MONTH_LOCKED`; a
batch with one September and one October item answers `409 MONTH_LOCKED` whose `errors` name only
`items[0].workDate` ("September 2026 is closed"), as the contract now promises; the employee's calendar shows
"Månaden är stängd" and the centre "September 2026 är stängd. 38 h." with `link.membershipId` and `month`
(mobile request 6 confirmed). "Unlock September": toast "September is open again", cells editable, the same
batch and single write answer 200 (those two probe entries were deleted again afterwards), the employee gets
the reopened item.

Not changed: the employee can still open the flag dialog while the month is closed (a flag is not an edit; the
employer resolves it after unlocking). Noted for the owner.

### 9. Contract requests: DONE (`2f2d6d2`, marks in `docs/CONTRACT_REQUESTS.md`)

Landed on the API and both clients in one commit, server interfaces and `@klokka/api-client` regenerated:
`Member.deactivatedAt`, `InvitationAccepted.workspaceSlug` (the join page no longer re-reads `/me`),
`MyWorkspace.rounding` and `defaultDayHours`, `Entry.hourlyRate`, `OperatorWorkspace.colour`,
`GET /workspaces/{id}/flags/{flagId}` (the phone's resolve screen reads one flag), `nothingLoggedDays` as
`{ date }` objects, `409 MONTH_LOCKED` on a batch naming the closed cells in `errors[]`, the push message shape
(`data.url` from the phone's allowlist, `channelId` `hours` / `flags` / `workspace`) documented on
`registerPushToken` and sent by the sweeper, `changeCount`'s counting rule. Verified on staging above where a
screen shows them (slug on join, month-lock cells, nothing-logged days on the Overview, `link.membershipId`).
Deferred with a reason and a backlog line: the week read model, operator sorting and search, previous-month
counts, per-deployment health, avatar upload, the account link, typed notification subjects, named mock examples.
Push `data.url` could not be observed end to end (no device token on staging); `NotificationAndPushTest` covers it.

### 10. Rough edges fixed on the way

- Web env name mismatch and the Expo-token leak into the Logto client (A and B above).
- Work dates drawn one day early east of UTC (`86c51d1`).
- Inviter and invitee names: "admin invited you", " invited you" in the email, "test accepted" (`547dbf3`,
  `a901fa7`, `66ee2f7`), the employer's own name asked for on the first-workspace step.
- Device language ignored on the accept path (`547dbf3`).
- "fixed the flag: 0 h" in the history (`c6e6991`).
- Operator shown as "?" without an email; Health version "dev" (`b12c482`, `451483a`, `870d37b`).
- Logto hook gained `User.Deleted`; operator probe URLs and `KLOKKA_ANDROID_APK_URL` set on Coolify;
  `docs/DEPLOYMENT.md` names now match the code.

### 8. Mobile: PASS (built and inspected, no phone attached)

- `apps/mobile/.env` from `.env.example` with `EAS_PROJECT_ID` from `expo.json`, `google-services.json` copied
  from the credentials; `npx expo prebuild --platform android --clean`; debug APK (arm64, JDK 21) built and served
  at `http://192.168.0.16:8898/app-debug.apk` (90 MB, `assets/app.config` carries `com.prasannjeet.klokka`, the
  EAS project id and the Google services file; JS comes from Metro on 8083 as `docs/MOBILE.md` says).
- CI parity: `./gradlew assembleRelease --no-daemon --stacktrace -PreactNativeArchitectures=armeabi-v7a,arm64-v8a`
  in `apps/mobile/android` (the job's command without the signing properties): BUILD SUCCESSFUL in 2 m 7 s after
  main's Metro hierarchical-lookup change, `app-release.apk` 66 MB with both ABIs, and the inlined bundle carries
  exactly `https://klokka-api.coolify.ooguy.com/v1`, `https://klokka-logto.coolify.ooguy.com`,
  `1uhtt4uj8f0aevtgf6g3b` and `https://api.klokka.app`.
- Sign-in request: issuer `<endpoint>/oidc`, client `1uhtt4uj8f0aevtgf6g3b`, redirect `klokka://auth/callback`,
  `resource=https://api.klokka.app` on the authorize and token requests, scopes `openid profile email
  offline_access`, `first_screen`: exactly what the Logto native app registers (`docs/INFRA.md` section 4).
- Screens use the same operations exercised on the web: `getMe`, `createWorkspace`, `inviteMember`,
  `listEntries`, `upsertEntry` and `deleteEntry` (the phone's add-hours sheet, one day at a time; the phone has no
  grid, so D8's batch endpoint is the web grid's), `getMemberMonth`,
  `getWorkspaceInsights`, `getMemberInsights`, `raiseFlag`, `getFlag` (new) and `resolveFlag`,
  `listNotifications`, `lockMonth`, `exportMonthCsv`, `updateMe` (the new first-workspace name field). Jest:
  20 suites, 64 tests green. Push `data.url` follows the allowlist the contract now documents.
- Not verified without a device: the Custom Tab round trip, push registration and a real tap on a push.

### 6. Insights by hand, calendar, language switch: PASS (one copy fix)

By hand for September (entries Mon 21 to Fri 25: 8, 8, 6, 8, 8 after the fix): total 38 h; elapsed working
days 20 of 22 (1 to 4, 7 to 11, 14 to 18, 21 to 25, 28); average per person and working day 38 / 20 = 1.9 h;
projected month end 38 x 22 / 20 = 41.8 h; week by week W36 to W38 0, W39 38, W40 0; per person Test Testsson
38 h (100 %); nothing logged 14 days (every elapsed weekday before the 21st, the 28th is today and not counted);
weekday distribution Mon 8, Tue 8, Wed 6, Thu 8, Fri 8; busiest day Monday, 2 h on average (8 h over the four
elapsed Mondays); open flags 1 then 0. The Overview, the API (`GET /insights`), the employer's Employee month
(38 h, 1.9 h, best week W39 38 h) and the employee's My month (same figures, streak 5) all show exactly these.
Calendar heat-map: the five cells carry the hours, the flagged day its marker, "Inget än" on the empty days,
today outlined; the day panel shows hours, note and history.

Language: the employer's Profile, "Svenska": the whole app switches at once (nav "Översikt, Veckorutnät,
Anställda, Anställds månad, Notiser, Inställningar", `<html lang="sv">`, Overview "September i korthet ...
Beräknat månadsslut 41,8 h"), `preferences.language` stored `sv`. The next event (the employee's second flag)
arrived in Swedish: "Test Testsson flaggade tors 24 sep" / "Loggat 8 h, Test Testsson säger 7 h", with "Sätt
till 7 h", "Se månaden", "Avfärda"; dismissing answered "Åtgärdad: du behöll 8 h. Test får veta det oavsett."

Found and fixed: the Swedish short date carries its own period, so that title ended "sep.." (`Formats`, now
without the trailing period).
