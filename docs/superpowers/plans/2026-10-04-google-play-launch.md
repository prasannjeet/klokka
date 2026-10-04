# Google Play Launch Implementation Plan

> **For agentic workers:** execute phase by phase. Steps use checkbox (`- [ ]`) syntax. Per AGENTS.md: no
> per-task reviewer, one detailed whole-branch review at the end; targeted tests + project compile per phase; one
> commit per phase (subject `CHQ-<n>: ...`, no co-author, no agent mention). Production changes (Coolify, Logto,
> Postgres, a `v*` tag) only with the owner's go-ahead for that specific change.

**Goal:** Klokka's Android app on Google Play: first on Internal testing, then in production, with every step that
can run from this host (code, CLI, API tokens) done by the agent, and the owner's Play Console clicks reduced to one
short checklist with ready answers.

**Tickets:** CHQ-153 (Play launch: package, AAB, signing, listing, upload pipeline) and CHQ-157 (account deletion,
API + web + mobile + public page; a Play blocker). Session:
https://claude.ai/code/session_01W1MBPy3jTfcPSH3HNPCMyM

**Architecture:** The release workflow that already builds the signed production APK also builds an AAB from the same
prebuild and signing key. Play App Signing uses our existing key (uploaded once with Google's PEPK tool), so the
sideloaded APK on klokka.se and the Play build stay update-compatible. `fastlane supply` (installed on this host,
configured by `apps/mobile/fastlane/Appfile`) uploads the AAB, the store listing and the changelog through the Play
Developer API with the Firebase service account. Store texts and images live as files under
`apps/mobile/fastlane/metadata/android/`, versioned with the code.

**Tech stack:** Expo SDK 57 prebuild, Gradle `bundleRelease` (JDK 21), fastlane 2.240 (`supply`), Play Developer API v3,
Firebase Management API v1beta1, EAS GraphQL API, `gh` (secrets and variables), Playwright (image composition), adb
over Wi-Fi (screenshots from the owner's phone).

## 0. Facts verified on 2026-10-04 (do not re-derive)

| Fact | Evidence |
|---|---|
| The production APK v1.1.1 targets and compiles against API 36, min arm ABIs `arm64-v8a`, `armeabi-v7a` | `aapt2 dump badging` |
| It is 16 KB page-size ready: zip alignment `zipalign -c -P 16` passes, all 26 arm64 `.so` LOAD segments aligned | `zipalign`, NDK `llvm-objdump` |
| No `AD_ID` permission; `allowBackup=false`; no cleartext flag | manifest dump |
| Release builds still carry `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` (max SDK 32), `USE_BIOMETRIC`, `USE_FINGERPRINT` | manifest dump; none is used by the app |
| The Firebase service account can create Android apps in `klokka-64f3a` (`firebase.clients.create` granted) and lists one app, `com.prasannjeet.klokka` | Firebase Management API, `testIamPermissions` |
| EAS project `@prasannjeet/klokka` has Android credentials only for `com.prasannjeet.klokka`, FCM V1 key id `e792411b-afb5-4db0-85e0-2daa51ca87e7` (the same Firebase service account) | EAS GraphQL with `expo.json`'s token |
| The Play Developer API is enabled in `klokka-64f3a`; the service account is a user of the CleanHQ Play developer account with release rights on all apps (Pooja Pro included) | API answers 404 "Package not found" instead of 403 |
| fastlane runs as user `dev`, the same user as the `klokka-01/02` runners, at `/home/linuxbrew/.linuxbrew/bin/fastlane` | `ps`, `ls` |
| Mobile auth uses the custom scheme `klokka://auth/callback`; nothing in Logto or the API depends on the Android package | `apps/mobile/src/auth/config.ts` |
| No delete-account operation exists; `docs`/privacy page say "email hej@klokka.se" | `openapi.yaml`, `privacy.ts` lines 99 and 198 |
| Only one EMPLOYER per workspace (created with the workspace; invitations are always EMPLOYEE) | `WorkspaceService.create`, `LogtoService.createInvitation` |

Play rules this plan is built around (Google policy, as of 2026; re-check the Console's own wording when it differs):
- New apps upload an **AAB**, not an APK. Target API must meet the current yearly requirement (36 satisfies it).
- The **first** AAB is uploaded by hand in Play Console: the package name binds to the app only then, and the API
  answers "Package not found" until it has.
- Until the app has passed its first review, API releases must have status **draft** ("Only releases with status
  draft may be created on draft app").
- Apps with sign-up must offer **account deletion** in the app and through a web link.
- A **personal** developer account created after 2023-11-13 must run a closed test with at least **12 testers opted in
  for 14 days in a row** before it can apply for production. An **organization** account has no such rule.
- Phone screenshots: 2 to 8, PNG or JPEG, sides 320 to 3840 px, the long side at most **twice** the short one (a raw
  1080x2400 phone screenshot is 2.22 and is rejected). Feature graphic 1024x500, no alpha. Icon 512x512 PNG.
  Title at most 30 characters, short description 80, full description 4000.

## 1. Decisions

| Topic | Decision | Status |
|---|---|---|
| Package id | `se.klokka.app` (the owner owns klokka.se; matches Kulram's `se.kulram.app`). Supersedes D12. Existing sideloaded installs of `com.prasannjeet.klokka` (a handful of users) reinstall once; the old app keeps working against the same API until uninstalled. | **Owner confirmed 2026-10-04** (D19) |
| Signing | Play App Signing with **our existing key** (PEPK upload). Upload key = the same key. Sideloaded APK and Play build are interchangeable. | Agent decision |
| Distribution | Play becomes the main channel; the APK on klokka.se stays (same package, same signature) for people without Play. Supersedes D4 in part. | Agent decision |
| Staging APK | keeps the same package (one phone holds staging or production, as today) | unchanged |
| Upload pipeline | every `v*` tag uploads the AAB to the **internal** track; promotion to production is a separate, explicit command | Agent decision |
| Account deletion | CHQ-157 rules (employer deletes own workspaces; employee memberships follow `removeMember`) | Agent decision, in CHQ-157 |
| Unused permissions | blocked in `app.config.ts` (`android.blockedPermissions`) | Agent decision |
| Developer account type | **personal** (owner, 2026-10-04): Phase F (12 testers, 14 days) applies | decided |

## 2. Owner checklist (everything that cannot be done from this host)

Each item says when it is needed. Answers to type are in `docs/PLAY_STORE.md` (written in Task C4).

- [x] **O1, before A1:** confirm the package `se.klokka.app` (2026-10-04).
- [x] **O2, any time:** tell the agent the developer account type: personal (2026-10-04).
- [ ] **O3, any time:** in Play Console, Create app: name "Klokka", default language Swedish (sv-SE), App, Free,
  accept the declarations. (No package is asked here.)
- [ ] **O4, during C3:** on the phone, Developer options, Wireless debugging, "Pair device with pairing code"; give the
  agent the IP:port and the six-digit code. Leave the phone unlocked on the staging app while screenshots run.
- [ ] **O5, Phase D:** say "release" (the agent runs `./release.sh minor`), then pin `v1.3.0` in production Coolify, API
  first, then web and landing (or tell the agent to do it with `coolify-prod-rw`).
- [ ] **O6, Phase E:** first upload by hand (Testing, Internal testing, Create new release): when Play asks about app
  signing, choose "Use a different key", "Export and upload a key from Java keystore", download the
  `encryption_public_key.pem` and give it to the agent; upload the `klokka-key.zip` the agent returns; then upload
  `klokka-v1.3.0.aab` (the agent gives the path or URL) and roll out to Internal testing.
- [ ] **O7, Phase E:** App content: fill each form from `docs/PLAY_STORE.md` (privacy policy, app access with the
  review account, ads, content rating, target audience, data safety, government app, financial features, health,
  news). Store settings: category, contact email, website.
- [ ] **O8, Phase E:** Internal testing, Testers: create the list "Klokka internal" with the testers' Gmail addresses;
  copy the opt-in link to them.
- [ ] **O9, Phase G:** organization account: press "Send for review" when the agent has promoted the release.
  Personal account: recruit 12 testers for the closed track, wait 14 days, then "Apply for production".

## 3. File map

| File | Change | Phase |
|---|---|---|
| `apps/mobile/app.config.ts` | `android.package` and `ios.bundleIdentifier` to `se.klokka.app`; `android.blockedPermissions` | A |
| `apps/mobile/src/appConfig.test.ts` | pin the new ids and the blocked list | A |
| `apps/mobile/fastlane/Appfile` | `package_name("se.klokka.app")` | A |
| `.github/workflows/release.yml` | `bundleRelease`, AAB checks, AAB to Nexus, Play upload step | A |
| `.agents/local-credentials/google-services.json`, `expo.json`, `README.md` (gitignored) | new package | A |
| GitHub secrets | `GOOGLE_SERVICES_JSON` replaced; new `PLAY_SERVICE_ACCOUNT_JSON`; variable `PLAY_UPLOAD` | A |
| `apps/api/contract/src/main/openapi/openapi.yaml` + regenerated `packages/api-client` | `DELETE /me` | B |
| `apps/api/service/.../me/AccountDeletion*.java`, `logto/LogtoManagementApi.java`, `logto/LogtoService.java` | the deletion | B |
| `apps/api/service/src/test/.../me/AccountDeletionTest.java` | API tests | B |
| `apps/web/src/components/settings/profile-view.tsx` + a new `delete-account-dialog.tsx` | web UI | B |
| `apps/mobile/src/features/account/DeleteAccount*.tsx` (new), `ProfileScreen.tsx`, `SettingsScreen.tsx` | mobile UI | B |
| `packages/core/i18n/{sv,en}.json` | `account.delete.*` keys | B |
| `apps/landing/src/lib/pages/registry.ts`, `src/lib/i18n/pages/delete-account.ts` (new), `pages/index.ts`, `privacy.ts` | public page, privacy copy | B |
| `apps/mobile/fastlane/metadata/android/{sv-SE,en-US}/**` (new) | listing texts, icon, feature graphic, screenshots, changelogs | C |
| `docs/brand/social/compose-play.mjs` (new) or a mode of `compose.mjs` | screenshot framing | C |
| `scripts/check-em-dash.sh`, `scripts/check-play-metadata.sh` (new) wired into `npm run lint` | metadata gates | C |
| `docs/PLAY_STORE.md` (new) | Console answers, review account, runbook | C |
| `docs/DECISIONS.md` (D19), `docs/OPERATIONS.md`, `docs/RELEASING.md`, `docs/MOBILE.md`, `docs/INFRA.md`, `AGENTS.md`, `.agents/skills/klokka-ops/SKILL.md`, `CHANGELOG.md` | docs | A to G |
| `apps/landing` homepage, app page, `/download`, JSON-LD | Play badge and link | H |

## Phase A: package, Firebase, push, AAB and the upload pipeline (CHQ-153)

### Task A1: Switch the package to `se.klokka.app`

Consumes O1. Produces the new identity in code, Firebase, EAS and GitHub.

- [ ] `app.config.ts`: `android.package` and `ios.bundleIdentifier` = `se.klokka.app`. Do **not** touch
  `versionCode` (release.sh owns it) or the scheme `klokka`.
- [ ] `app.config.ts`: `android.blockedPermissions` = `android.permission.SYSTEM_ALERT_WINDOW`,
  `android.permission.READ_EXTERNAL_STORAGE`, `android.permission.WRITE_EXTERNAL_STORAGE`,
  `android.permission.USE_BIOMETRIC`, `android.permission.USE_FINGERPRINT`. Before blocking, grep the app for
  `expo-local-authentication`, `requireAuthentication` (secure-store) and file-picker use; drop an entry from the
  list if something uses it. Keep `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `INTERNET`,
  `ACCESS_NETWORK_STATE`, the FCM `c2dm` permission and the launcher badge permissions.
- [ ] Location: the jobs feature (CHQ-156, in progress in another session on 2026-10-04, not in v1.1.1) adds
  `expo-location` with a foreground-only plugin entry in `app.config.ts`. Rebase A1 on it when it lands (both edit
  `app.config.ts`). The release manifest must then carry `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` and no
  background location, which A2's permission step checks, and Data safety (C4) declares location as collected for app
  functionality, not shared, optional (the user can type the place instead).
- [ ] `src/appConfig.test.ts`: assert the new package and bundle id and the blocked list.
- [ ] Firebase (Management API v1beta1, Firebase service account, scope `cloud-platform`):
  `POST projects/klokka-64f3a/androidApps` with `packageName: se.klokka.app`, `displayName: Klokka`; poll the
  returned operation (bounded: 30 tries, 2 s apart, exit on error); then `GET androidApps/{appId}/config` and decode
  `configFileContents` (base64) into `.agents/local-credentials/google-services.json` (chmod 600). Keep the old file
  as `google-services.com.prasannjeet.klokka.json` for rollback. Optionally add the release key's SHA-256 as an app
  certificate (`POST androidApps/{appId}/sha`); FCM does not need it.
- [ ] EAS (GraphQL `https://api.expo.dev/graphql`, bearer `expo.json`'s token): look up the app's
  `androidAppCredentials`; create Android app credentials for `applicationIdentifier: se.klokka.app` on app
  `f617e8bb-38d1-4247-9dde-d92bda37fe18` and attach the existing FCM V1 key `e792411b-...` to it (mutations
  `androidAppCredentials.createAndroidAppCredentials` with `fcmV1Id`, or `setGoogleServiceAccountKeyForFcmV1` on the
  new credentials; introspect the schema first, read before write). Verify with the read query in section 0.
- [ ] `gh secret set GOOGLE_SERVICES_JSON` from the base64 of the new file (the release job decodes base64).
- [ ] Update the gitignored `expo.json` (`android_package`) and `.agents/local-credentials/README.md`.
- [ ] `fastlane/Appfile`: `package_name("se.klokka.app")`.
- [ ] Docs in the same commit: `DECISIONS.md` new **D19** "Android package `se.klokka.app` and Google Play"
  (supersedes D12, amends D4), `AGENTS.md` (the Push bullet says "fixed forever": rewrite to the new id and D19),
  `docs/OPERATIONS.md` line 35, `docs/RELEASING.md` line 101, `docs/MOBILE.md`, `docs/INFRA.md` sections that name the
  package.

Verify: `npm run typecheck` and `npx jest src/appConfig.test.ts` in `apps/mobile`; `rg -n "com\.prasannjeet\.klokka"`
outside `docs/research`, the Java package names and the old credentials copy returns nothing.

### Task A2: AAB in the release workflow and the Play upload

Consumes A1. Produces `klokka-v<version>.aab` on Nexus and, once enabled, a Play internal release per tag.

- [ ] `release.yml`, job `apk` (rename the display name to "Production APK and AAB"): after "Assemble the signed
  release APK", add "Bundle the signed release AAB": same working directory, env and `-P` signing flags,
  `./gradlew bundleRelease`. Output `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab` as env
  `AAB`. Same job so Metro's job-local `TMPDIR` cache and the prebuild are reused.
- [ ] "Verify the baked environment": run the same four `grep -aqF` checks on the AAB too (`unzip -p "$AAB"
  base/assets/index.android.bundle`).
- [ ] "Verify the signing certificate": add the AAB: its signer's SHA-256 from `keytool -printcert -jarfile "$AAB"`
  must equal the keystore's.
- [ ] New step "Verify the package and permissions": `aapt2 dump badging "$APK"` shows `name='se.klokka.app'`,
  `targetSdkVersion` >= 36, none of the blocked permissions, no `com.google.android.gms.permission.AD_ID`, no
  `ACCESS_BACKGROUND_LOCATION`.
- [ ] New step "Verify 16 KB alignment": `zipalign -c -P 16 -v 4 "$APK"` (fails the job on a misaligned native lib).
- [ ] "Publish the APK to Nexus": also upload `prod/klokka-$TAG.aab` (immutable; no `latest` alias for the AAB).
- [ ] New step "Upload to Google Play (internal)", `if: vars.PLAY_UPLOAD == 'true'`: write
  `secrets.PLAY_SERVICE_ACCOUNT_JSON` to `$RUNNER_TEMP/play.json` (chmod 600), then from `apps/mobile` run
  `/home/linuxbrew/.linuxbrew/bin/fastlane supply --aab "$GITHUB_WORKSPACE/$AAB" --track internal
  --release_status "${{ vars.PLAY_RELEASE_STATUS || 'draft' }}" --json_key "$RUNNER_TEMP/play.json"
  --skip_upload_metadata --skip_upload_images --skip_upload_screenshots` with `FASTLANE_SKIP_UPDATE_CHECK=1`,
  `FASTLANE_HIDE_CHANGELOG=1`, `CI=true`. Changelogs upload (from `metadata/android/*/changelogs/<versionCode>.txt`)
  stays on. Remove `play.json` in the existing `if: always()` cleanup step.
- [ ] `gh secret set PLAY_SERVICE_ACCOUNT_JSON < .agents/local-credentials/firebase-service-account.json`;
  `gh variable set PLAY_UPLOAD --body false` (flipped to `true` in Phase E after the manual first upload);
  `gh variable set PLAY_RELEASE_STATUS --body draft` (set to `completed` after the first approved review).
- [ ] `release.yml` also has a `workflow_dispatch` rehearsal? If it does, the Play step must not run on it (guard on
  `startsWith(github.ref, 'refs/tags/v')`). If it does not, do not add one.
- [ ] `docs/RELEASING.md`: the job table gains the AAB and the Play upload; "Deploy (by hand)" gains "Play: the tag
  put the build on Internal testing; promote with the command in `docs/PLAY_STORE.md`".

Verify: `actionlint` if installed, else a YAML parse; the real proof is the Phase D release run.

### Task A3: Staging proof of the new identity on a phone

- [ ] Push A1 + A2 (one commit, `CHQ-153: ...`). CI builds the staging APK with `se.klokka.app`.
- [ ] Owner installs the staging APK from `STAGING_APK_URL` (the old `com.prasannjeet.klokka` app may stay installed;
  they are separate apps now). Agent then verifies on staging: sign-in works (Custom Tab returns to `klokka://`),
  `registerPushToken` stored a token for the user (staging DB, `push_token`), and one push arrives: trigger it the
  cheapest way staging allows (an invitation accept or a flag), checked in the staging API log
  (`push_delivery` row `SENT`).
- [ ] If push fails with an FCM credential error, the EAS binding in A1 is wrong; fix there, never by switching back.

## Phase B: delete your own account (CHQ-157, branch-free on `main`, parity API + web + mobile + landing)

### Task B1: Contract

- [ ] `openapi.yaml`, path `/me`, add `delete`: tag `me`, `operationId: deleteMe`, summary "Delete my account",
  description stating the rules below (it is the spec the clients read), responses `204`, `401`, `502` (Logto failed;
  safe to retry), `default` Problem. No request body.
- [ ] Regenerate (`npm run generate` or the repo's contract script) so `MeApi.deleteMe()` and the TS client's
  `MeApi.deleteMe()` exist; `npm run check` must show no drift. Add the line to `docs/CONTRACT.md`.

Rules (the API decides; both clients only display):
1. EMPLOYEE membership with hour entries (any, including soft-deleted): status `DEACTIVATED`, `deactivated_at` now,
   `logto_user_id` null, `email` = `<membershipId>@deleted.invalid`, `avatar_emoji` null; `display_name` and
   `hourly_rate` stay (the employer's record). Remove the user from the Logto organization.
2. EMPLOYEE membership without entries, or INVITED: delete the row (as `removeMember` does), Logto membership or
   invitation removed.
3. EMPLOYER membership: delete the whole workspace and its Logto organization.
4. Then the user's own rows: `app_user` (cascades `user_preference`, `notification`, `push_token`, `digest_run`),
   and `email_send.recipient` replaced by `deleted@deleted.invalid` for that user's rows (the monthly quota count must
   not drop).
5. Then the Logto user (`DELETE /api/users/{id}`).

### Task B2: API implementation

- [ ] `LogtoManagementApi`: add `@DELETE @Path("/users/{id}") void deleteUser(String id)`.
- [ ] `LogtoService`: `void deleteUser(String userId)` and make `deleteOrganization` tolerate `404` (already gone =
  success) through a small `callIgnoringNotFound` next to `call`; both keep the `KlokkaException(INTERNAL, ...)` with
  the Logto body for every other status, which `ProblemMapper` renders. Map Logto failures of this operation to
  `502` only if a `ProblemCode` for upstream failure already exists; otherwise keep `INTERNAL` and document `500` in
  the contract instead of `502` (do not add a code for one call site).
- [ ] New `me/AccountDeletionService` (`@ApplicationScoped`): `void delete(String userId)`, called by
  `MeResource.deleteMe()` with `CurrentUser.id()`. It never calls `ensureCurrentUser` (a repeat call must not
  re-create the row). Order, each step retry-safe:
  1. Read (no lock needed) the user's memberships; collect the Logto org ids of EMPLOYER workspaces.
  2. For each: `logto.deleteOrganization(orgId)`. A failure here aborts before any DB change.
  3. One `@Transactional` method `AccountDeletionRepository.deleteAccountData(String userId, Instant now)`:
     for each EMPLOYER workspace, delete children in FK order with native SQL scoped by `workspace_id`
     (`job_reminder`, `job` once CHQ-156's V3 migration is merged, `entry_flag`, `hour_entry_change`, `hour_entry`, `month_lock`, `notification` with that
     workspace, `email_send.workspace_id` set null, `membership`, then `workspace`); each method takes the
     `WorkspaceId` (AGENTS.md isolation rule). Then rules 1 and 2 for EMPLOYEE memberships (reuse
     `MemberService`'s entry-exists check through `MembershipRepository`, not by calling the REST-facing method), then
     rule 4.
  4. Logto: remove the user from each remaining employee organization (ignore 404), then `logto.deleteUser(userId)`
     (ignore 404).
  Log one INFO line with counts (workspaces deleted, memberships deactivated, removed), never the email.
- [ ] `WebhookService.deleteUser` already deactivates memberships on `User.Deleted`; after this change it finds none.
  Leave it, add a test that the webhook after an API deletion is a no-op.
- [ ] Read the full child-table list from `V1`/`V2`/`V3` migrations again at implementation time; a table added later
  without `ON DELETE CASCADE` must appear in step 3 or the workspace delete fails on its FK (the test below catches
  it).
- [ ] Tests, `me/AccountDeletionTest` (`@QuarkusTest`, the existing fake Logto server, rows scoped to the test's own
  ids): employee with entries is deactivated and anonymised and the employer still sees the hours; employee without
  entries is removed; INVITED is removed; employer: the workspace and every child row are gone and the Logto org
  delete was called; the user's app_user, preferences, push tokens and notifications are gone; `email_send` rows keep
  their count; a second call answers 204 and changes nothing; Logto org delete failing (fake returns 500) leaves the
  database untouched and the call answers the documented error; a webhook `User.Deleted` afterwards touches nothing.
  Positive control: a second, unrelated user's rows are unchanged in every case.

Verify: targeted `mvn -pl service -Dtest=AccountDeletionTest test` with `JAVA_HOME` on JDK 25, then the module compile.

### Task B3: Web

- [ ] `packages/core/i18n/{sv,en}.json`: `account.delete.title`, `.body`, `.ownerWarning` (with `{workspaces}`),
  `.employeeNote`, `.confirmLabel`, `.confirm`, `.cancel`, `.done`, `.failed`. No em dash; `npm run check` regenerates
  the typed `t()`.
- [ ] `apps/web/src/components/settings/delete-account-dialog.tsx` (new): shadcn/Base UI `AlertDialog`; lists the
  workspaces the user owns (from `getMe` memberships with role `EMPLOYER`) under `ownerWarning`, the employee note
  otherwise; the destructive button is enabled only after the user types the confirmation word shown in
  `confirmLabel` (sv "RADERA", en "DELETE", from the catalogue). On confirm: call the BFF `/api/k/me` with `DELETE`,
  then the existing sign-out action, then a plain page saying the account is gone.
- [ ] `profile-view.tsx`: a "Delete account" section at the bottom (danger tone from `@klokka/tokens`), opening the
  dialog.
- [ ] Vitest for the dialog (owner list shown, button disabled until the word matches, calls the API once).

### Task B4: Mobile

- [ ] `apps/mobile/src/features/account/DeleteAccountSheet.tsx` (new): the same content as the web dialog in the
  existing `Sheet` (it already pads by the bottom inset), a `TextInput` for the confirmation word (keyboard handled by
  the screen's `KeyboardProvider` pattern), a destructive `Button`. On confirm: `meApi.deleteMe()` through the data
  layer (`src/data/me.ts` mutation), then `useSignOut` with the local-only path (no end-session browser round trip;
  the Logto session is gone with the user), then the signed-out screen shows `account.delete.done` as a toast.
- [ ] A "Delete account" row at the bottom of `ProfileScreen` (employee) and `SettingsScreen` (employer), after
  sign-out, opening the sheet.
- [ ] Jest + RNTL test (`DeleteAccountSheet.test.tsx`): owner list, disabled until the word matches, calls the API
  once, signs out.
- [ ] Layout check at 360x640, 390x844, 412x915, 430x932 with the keyboard opened and closed: on the owner's phone in
  C3's adb session (screenshots) since this host has no emulator.

### Task B5: Public page and privacy copy

- [ ] `registry.ts`: page `delete-account`, kind `legal`, sv path `radera-konto`, en `delete-account`, parent
  `privacy`, footer group `legal`, `lastmod` the release date.
- [ ] `src/lib/i18n/pages/delete-account.ts` (new, registered in `pages/index.ts`): what deletion removes and keeps
  (the CHQ-157 rules in plain words), the two ways (app: Settings or Profile, Delete account; web: app.klokka.se,
  Profile, Delete account), the fallback (email `hej@klokka.se` from the account's address; answered within one
  month), and that backups age out (match the privacy page's wording).
- [ ] `privacy.ts` lines 99 and 198: replace "cannot delete yet" with the self-service path and a link
  `[...](page:delete-account)`.
- [ ] `npm test` in `apps/landing` (registry rules: title <= 60, description <= 155, hreflang pair, links resolve).

Phase B commit: `CHQ-157: delete your own account: DELETE /me, web and mobile confirmation, public page, privacy
copy`. CHANGELOG `## 1.3.0` gains it under Added.

## Phase C: store listing, images and the Console answers (CHQ-153)

### Task C1: Listing texts

- [ ] `apps/mobile/fastlane/metadata/android/sv-SE/` and `en-US/`: `title.txt` (<= 30), `short_description.txt`
  (<= 80), `full_description.txt` (<= 4000, plain text with line breaks; Play renders no Markdown),
  `changelogs/<versionCode>.txt` (<= 500) for the release's versionCode (the one `release.sh` sets for v1.3.0).
- [ ] Source the words from `docs/research/seo/keywords.md` and `page-briefs.md` (the homepage and app page
  briefs): "tidrapport", "gratis tidrapportering", "timmar", "arbetstid" lead the Swedish copy; the product rules from
  AGENTS.md hold (free to use, open source, direct sign-up, never prices or tiers; "personalliggare" never in the
  title). Suggested title: "Klokka: tidrapport och timmar" (sv), "Klokka: work hours tracker" (en); check the length
  file gate.
- [ ] `scripts/check-play-metadata.sh` (new): fails on a missing file in either language, a length over the limit,
  an empty file, pricing words (the landing tests' list), or "personalliggare" in `title.txt`. Add
  `apps/mobile/fastlane/metadata` to `scripts/check-em-dash.sh`'s path list. Wire the new script into the root
  `lint` script next to `check-em-dash.sh`.

### Task C2: Icon and feature graphic

- [ ] `images/icon.png`: 512x512 PNG from the adaptive icon sources in `apps/mobile/assets` (foreground over the NIGHT
  background), rendered with `sharp` (already a landing dev dependency) or Playwright; one file per language (same
  image).
- [ ] `images/featureGraphic.png`: run `node docs/brand/social/compose.mjs` (it already emits `play-feature-{sv,en}`
  at 1024x500); convert to a PNG without alpha (or JPEG) into each language's folder. Check: 1024x500, no alpha
  channel (`identify -format %A` or `sharp().metadata().hasAlpha`).

### Task C3: Screenshots from the real app

Consumes O4 (phone paired over Wi-Fi). Produces 5 framed screenshots per language.

- [ ] Data: staging test accounts in `.agents/local-credentials/staging-accounts.json` (employer and employee of
  "Kafé Nord", which has members and hours). Top up a realistic current week through the web app with Playwright
  (signed in as the staging employer, the way `docs/STAGING_SMOKE.md` signs in), never on production.
- [ ] Phone: the staging APK (A3). `adb pair <ip:port> <code>`, `adb connect <ip:port>` (the port shown under
  Wireless debugging, not the pairing port). Platform tools are in `/home/dev/Android/Sdk/platform-tools`.
- [ ] Capture with `adb exec-out screencap -p > raw/<lang>-<n>.png` after navigating with `adb shell am start -a
  android.intent.action.VIEW -d "klokka://..."` deep links where they exist, else `adb shell input tap/swipe` with
  coordinates read from `uiautomator dump` (never hardcoded guesses). Screens, employer then employee: Today/Home,
  Week grid, Month total with pay shown, Insights chart, employee Month view. Set the language through the app's
  own setting (or the API `updateMyPreferences` as the staging user) and repeat for `en`. Set the system to a fixed
  clock-free status bar first: `adb shell settings put global sysui_demo_allowed 1` and the demo-mode broadcasts
  (clock 12:00, full battery, no notifications); exit demo mode afterwards.
- [ ] Frame: `docs/brand/social/compose-play.mjs` (new, modelled on `compose.mjs`, Playwright + the site fonts):
  1080x1920 canvas in the Nightshift dark background, a one-line caption from the catalogue-free listing texts above
  the screenshot (caption strings live in a small JSON next to the script, sv and en, no em dash), the raw screenshot
  scaled to fit below. Output `metadata/android/<lang>/images/phoneScreenshots/<n>_<name>.png`. Ratio 1080x1920 =
  1.78, within Play's 2:1.
- [ ] Commit the framed images (they are the listing); keep the raw captures in the scratchpad only (they show
  staging names).
- [ ] Fallback if the owner cannot pair: the owner takes the five screenshots per language by hand and sends them; the
  framing step is the same.

### Task C4: Console answers and the review account

- [ ] `docs/PLAY_STORE.md` (new, public repo, so no secrets): the owner's checklist O6 to O9 with exact answers:
  - Privacy policy: `https://klokka.se/integritet`.
  - App access: "All functionality requires sign-in", instructions naming the review account's email and saying the
    password is entered in the Console field (never written in the repo), and a step list: sign in, open "Kafé
    Granskning", see Today, Week, Month.
  - Ads: no. Content rating (IARC): category "Utility, productivity, communication or other"; no violence, sexuality,
    language, controlled substances, gambling; users can interact? No (no chat between users; flags are workplace
    notes; answer per the questionnaire's definitions and note the reasoning); shares location: no (a job's place is
    stored for the workspace, not shown to other users as a live position).
  - Target audience: 18 and over. Not designed for children.
  - Data safety: collected: name, email (account management, app functionality), user IDs, work hours and pay rate
    as "Other info" (app functionality), push token as device or other IDs (app functionality); optionally place
    names of jobs if the jobs feature stores them; none shared with third parties for their own purposes (Expo push
    and Google FCM are service providers, which Play does not count as sharing); none sold; encrypted in transit:
    yes; users can request deletion: yes, URL `https://klokka.se/radera-konto`; data is not optional for the core
    function. Cross-check every line against `privacy.ts` before the owner submits.
  - Government app: no. Financial features: none. Health: none. News: no. Store settings: category Business, tags
    "time tracking"/"productivity" as offered, contact email `hej@klokka.se`, website `https://klokka.se`.
  - Promote and release commands (Phase G) and the PEPK command (Phase E).
- [ ] Review account on **production** (needs the owner's go-ahead, it writes to production Logto and the API
  database): create a Logto user with a strong generated password through the Management API (`logto-prod.json` M2M),
  email `review@klokka.se` (no mailbox needed: the account signs in by password; check that the production sign-in
  experience allows password sign-in, else add a Migadu alias and use the code). Store the password in
  `.agents/local-credentials/play-review.json` (gitignored). Sign it in once with Playwright on app.klokka.se, create
  the workspace "Kafé Granskning" and log a week of hours for the employer; that is enough for a reviewer to see
  every screen. No employees (no invitation emails).

Phase C commit: `CHQ-153: Play listing texts, icon, feature graphic, screenshots; Console answers in
docs/PLAY_STORE.md`.

## Phase D: release v1.3.0 (owner gate O5; v1.2.0 is the jobs release, CHQ-156)

- [ ] `CHANGELOG.md` `## 1.3.0, <date>`: Added (account deletion, Google Play), Changed (package `se.klokka.app`: the
  old app must be reinstalled once; permissions trimmed).
- [ ] Owner says "release": `./release.sh minor` from a clean, synced `main` (versionCode + 1). Watch the Release
  run with a bounded `gh run watch`; every job green, including the new AAB checks. `PLAY_UPLOAD` is still `false`,
  so nothing goes to Play yet.
- [ ] Production pins (owner, or the agent with `coolify-prod-rw` on an explicit go-ahead): API first
  (`evaro481mmx2fpp5eev2cgj2`, `/q/health/ready`), then web (`kakqu4trsp8yddirzntj2uct`) and landing
  (`f7t6h4recxky32cx06iknx2x`; then the IndexNow step in `docs/RELEASING.md`, the new page is in the sitemap).
- [ ] Production checks (read-only): `https://klokka.se/radera-konto` and `/en/delete-account` load and are
  indexable; the prod APK at `prod/klokka-latest.apk` reports `se.klokka.app` (`aapt2 dump badging`).
- [ ] Tell the existing app users (the owner knows them) to install the new APK and uninstall the old "Klokka".

## Phase E: first Play upload and signing (owner gates O6 to O8)

- [ ] Owner starts O6 and hands over `encryption_public_key.pem`.
- [ ] PEPK: download Google's tool (`https://www.gstatic.com/play-apps-publisher-rapid/signing-tool/prod/pepk.jar`;
  if the Console shows a different link, use that one), then with JDK 21 run it on
  `.agents/local-credentials/klokka-release.keystore`, alias and passwords from `android-signing.json`, options
  `--include-cert --rsa-aes-encryption --encryption-key-path=<pem> --output=<scratchpad>/klokka-key.zip`. Hand the zip
  to the owner (SendUserFile), never commit it, delete it after the owner confirms the upload.
- [ ] Owner uploads the zip, then `klokka-v1.3.0.aab` (from Nexus `prod/`), rolls out Internal testing, does O7 and
  O8.
- [ ] Agent verifies with the API (read-only): `fastlane run validate_play_store_json_key` and a read of the internal
  track (`edits.insert` + `edits.tracks.get internal`, then `edits.delete`, so no edit is left open); the version
  code 7 is there.
- [ ] Agent checks Play App Signing kept our key: the Console's app signing certificate SHA-256 (owner reads it from
  Setup, App signing, or the API `generatedApks` list) equals the release keystore's SHA-256.
- [ ] Upload the listing: from `apps/mobile`, `fastlane supply --skip_upload_aab --skip_upload_apk
  --skip_upload_changelogs` (metadata + images + screenshots). Draft apps accept listing edits. Verify by reading the
  listings back (`edits.listings.list`).
- [ ] `gh variable set PLAY_UPLOAD --body true`. From now on each tag puts its AAB on Internal testing as a draft.
- [ ] A tester (the owner) installs from the internal opt-in link and checks: sign-in, push arrives, delete-account
  sheet opens (do not confirm on a real account), bottom tab bar clear of the system navigation.

## Phase F: closed test (personal developer account only; skip for an organization account)

- [ ] Agent creates the closed track's tester access through a Google Group the owner creates (Play's API only
  takes Google Groups for closed tracks; `fastlane supply` has no tester support, so use `edits.testers.update` on
  track `alpha` with the group address, from a short Python call with the same key). Owner adds 12 or more people to
  the group (O9) and shares the opt-in link.
- [ ] Promote the internal release to closed: `fastlane supply --track internal --track_promote_to alpha
  --release_status completed --skip_upload_metadata --skip_upload_images --skip_upload_screenshots
  --skip_upload_changelogs` (the first closed release goes through review).
- [ ] The 14-day clock needs 12 testers opted in on every day. The agent checks the opted-in count read-only once a
  day if the Console exposes it to the API; otherwise the owner reads it in the Console.
- [ ] Day 15: owner applies for production (O9); the answers about the test are in `docs/PLAY_STORE.md`.

## Phase G: production

- [ ] Promote: `fastlane supply --track internal --track_promote_to production --release_status completed` (same skip
  flags). For the very first production release a staged rollout is pointless (few users): roll out at 100 %.
  Countries: Sweden plus the EU/EEA and Norway at least; the owner chooses in the Console (no API).
- [ ] Organization account: the owner presses "Send for review" (O9) if managed publishing is on; otherwise the
  promotion goes to review by itself.
- [ ] After approval: `gh variable set PLAY_RELEASE_STATUS --body completed`, so later tags land on Internal testing
  installable at once. Production stays a deliberate promote command per release, recorded in `docs/RELEASING.md`.
- [ ] Verify: `https://play.google.com/store/apps/details?id=se.klokka.app` answers 200 (this is Google, not our
  production) and shows the Swedish listing.

## Phase H: link the store from klokka.se and finish the docs

- [ ] Landing: a Google Play badge (Google's official badge artwork and its usage rules; no recolouring) next to the
  APK download on the homepage hero and the app page; `/download/android` keeps serving the APK; JSON-LD
  `SoftwareApplication` gains the Play URL as `installUrl`; `llms.txt` mentions it. Text in the landing copy files,
  sv and en. Tests: the landing suite plus `npm run test:layout` at the four phone sizes.
- [ ] Mobile invite page and email copy that say "download the app" may link Play first; only if a catalogue string
  already names the APK.
- [ ] Docs: `docs/OPERATIONS.md` gets a Play section (who owns what in the Console, the service account and its
  account-wide rights, how to promote, and rollback: Play cannot go back to an older versionCode, so a fix ships as a new
  release; a staged rollout in progress can be halted in the Console); `docs/RELEASING.md` the
  promote step; `docs/PLAY_STORE.md` final; `AGENTS.md` status line; `klokka-ops` skill pointer; `agents sync`.
- [ ] Close-out comments on CHQ-153 and CHQ-157 with what shipped and the session link.

## 4. Order and dependencies

```
O1 ─> A1 ─> A2 ─> A3 (phone)            B1 ─> B2 ─> B3, B4, B5 (parallel)
                    \                      |
                     C1, C2, C3 (phone), C4 (needs B5 URL, CHQ-156 merged)
                                 \         |
                                  D (O5 release) ─> E (O6 to O8) ─> F (personal only) ─> G ─> H
```

A and B are independent and can run in parallel sessions (different files; both touch `CHANGELOG.md` and docs, so
the second to commit rebases). C3 needs the A3 staging APK on the phone. Nothing reaches Play before D.

## 5. Risks and how the plan handles them

| Risk | Handling |
|---|---|
| The package can never change after the first upload | O1 confirms it before A1; A1 changes it once, everywhere |
| Push breaks for the new package | A3 proves push on staging before any release |
| Our key is lost or Play generates its own | PEPK upload of the existing key (E), which E verifies by certificate; before E, confirm the owner holds a copy of `klokka-release.keystore` and `android-signing.json` outside this host |
| Workspace delete misses a child table and fails on its FK | B2 re-reads the migrations; the test deletes a workspace with a row in every child table |
| Deleting an employer erases employees' view of their hours | Stated in the confirmation (owner list) and on the public page; it is the rule CHQ-157 records |
| The service account can release any app on the CleanHQ account (Pooja Pro) | The Appfile pins `se.klokka.app`; every command in this plan names the package or runs from `apps/mobile`; after E the owner can narrow the account to Klokka only (Users and permissions, App permissions) |
| A personal account's 14-day clock resets when testers drop below 12 | F checks daily; recruit 15 to keep a margin |
| `release_status completed` on a draft app fails the job | `PLAY_RELEASE_STATUS` stays `draft` until G |
| The jobs feature (CHQ-156) adds location | A1 rebases on it; A2 checks the manifest; C4 declares it |

## 6. Out of scope

- iOS / App Store (no Apple developer account yet).
- Automatic production promotion on tag.
- In-app review prompts, Play In-App Updates, Play Integrity.
- Data export for users beyond the existing CSV month export.
