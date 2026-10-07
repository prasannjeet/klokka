# Google Play

**Open work to reach production: Jira CHQ-161** (closed test with 12 testers for 14 days, reviewer account, Console
forms, review, promote). It lists what the owner does and what the agent does.

Klokka is on Google Play as `se.klokka.app` (`docs/DECISIONS.md` D19) under the CleanHQ developer account, a personal
account. The plan and its status: `docs/superpowers/plans/2026-10-04-google-play-launch.md` (CHQ-153).

**Current release (2026-10-07):** v1.6.4, versionCode 17, is `completed` on internal testing and a `draft` on
closed testing (`alpha`). Public promotion is rejected while the app is in its initial draft state. The owner
must complete Play Console setup/review and the closed-test/production-access steps before public rollout.
[Release verification](releases/1.6.4.md).

## Access

- Play Console: the owner's Google login.
- API: the Firebase service account `firebase-adminsdk-fbsvc@klokka-64f3a.iam.gserviceaccount.com`
  (`.agents/local-credentials/firebase-service-account.json`; GitHub secret `PLAY_SERVICE_ACCOUNT_JSON`). It has
  **Admin on Klokka only** (app-level) and no account-wide permission (2026-10-04). With only the release, view and
  store-presence permissions, Play let it read and stage edits but refused every commit that changed the listing
  ("The caller does not have permission"); Admin on the app fixed it. Every command still names Klokka's package or
  runs from `apps/mobile`, where `fastlane/Appfile` pins it. Run fastlane from the main checkout: the Appfile's key
  path is relative and worktrees have no credentials folder.
- CLI: `fastlane` (Homebrew), run from `apps/mobile`. Check the key: `fastlane run validate_play_store_json_key`.

## Switches (GitHub repository variables)

| Variable | Meaning |
|---|---|
| `PLAY_UPLOAD` | `true`: each `v*` tag uploads its AAB to the internal track. `false` until the first AAB was uploaded by hand (Play binds the package only then). |
| `PLAY_RELEASE_STATUS` | `draft` until the app passed its first review (Play refuses anything else on a draft app), then `completed`. |

## Commands (from `apps/mobile`, with `FASTLANE_SKIP_UPDATE_CHECK=1`)

| What | Command |
|---|---|
| Upload the listing (texts, images, screenshots) | `fastlane supply --skip_upload_aab --skip_upload_apk --skip_upload_changelogs` |
| Internal to closed testing | `fastlane supply --track internal --track_promote_to alpha --track_promote_release_status completed --skip_upload_metadata --skip_upload_images --skip_upload_screenshots --skip_upload_changelogs` |
| Internal to production | the same with `--track_promote_to production` |

When promoting an existing bundle, use `--track_promote_release_status`; `--release_status` applies only to
new APK/AAB uploads. To prepare a closed-testing draft before the app's first review, promote internal to
`alpha` with `--track_promote_release_status draft` and select the intended `--version_code`.

Play never takes an older versionCode back. A bad release is fixed by a new one; a staged rollout in progress can be
halted in the Console.

## Signing

Play App Signing uses our release key (`klokka-release.keystore`, `android-signing.json`), uploaded once with
Google's PEPK tool; the same key is the upload key. The APK on klokka.se and the Play build share the signature.

## Console answers (App content and Store settings)

Answer exactly this; every line is checked against the privacy page (`apps/landing/src/lib/i18n/pages/privacy.ts`),
which names job places, device location and Google Maps Platform since CHQ-153. Change both together.

| Form | Answer |
|---|---|
| Privacy policy | `https://klokka.se/integritet` |
| App access | "All or some functionality is restricted": sign-in required. Instructions: "Sign in with the email and password below. The account owns the business 'Kafé Granskning' with sample hours: open Today, Week, Month and Insights." Credentials: the review account (`.agents/local-credentials/play-review.json`, typed into the Console, never written here). |
| Ads | No, the app has no ads. |
| Content rating (IARC) | Category: utility, productivity, communication or other. Violence, fear, sexuality, language, controlled substances, gambling, crude humour: none. Users interact or exchange content: **yes**: an employee's flag carries a written message to the employer, who can answer with a resolution note (inside one workplace only; no chat, no public content). This adds the "Users Interact" notice, not a higher age. Shares the user's current location with other users: no. Digital purchases: no. |
| Target audience | 18 and over only. Not designed to appeal to children. |
| News app | No. |
| Government app | No. |
| Financial features | None. |
| Health | None. |
| Data safety: collection | Data is collected and encrypted in transit. No data is shared (Expo, Firebase Cloud Messaging, Google Maps and Migadu are service providers acting for Klokka, which Play does not count as sharing). Users can request deletion: yes, `https://klokka.se/radera-konto`. |
| Data safety: types | **Name** and **email address** (account management, app functionality; required). **User IDs** (account management; required). **Other info: work hours, notes, hourly rate** (app functionality; required). **Messages: other in-app messages** (the flag messages and resolution notes between employee and employer; app functionality; optional, only when someone flags an entry). **Approximate and precise location** (app functionality; optional: only when a user taps "use where I am now" on a job; stored as the job's place, not tracked). **Device or other IDs: push token** (app functionality; optional, only with notifications on). Nothing for advertising or analytics. |
| Store settings | Category: Business. Tags: time tracking, productivity (as offered). Email `hej@klokka.se`, website `https://klokka.se`. No phone number. |
| Countries | Sweden, the rest of the EU/EEA, Norway, Switzerland and the UK at first; the app is in Swedish and English. |

## Closed test (personal account rule)

Production needs a closed test with at least 12 testers opted in for 14 days in a row. Use a Google Group as the
tester list (the API takes groups for closed tracks), recruit about 15 so a drop-out does not reset the clock, and
keep the build installed and used. The production application then asks what was tested and what changed; answer
from CHANGELOG.md.

## Concurrent uploads and checks

Run one Play operation at a time. Even reading tracks requires an API edit: creating another edit with the same
service account invalidates the uploader's active edit. Wait for the release workflow and any fastlane command to
finish before inspecting tracks. Console changes also invalidate an active API edit. An expired upload edit leaves
the current release unchanged; rerun the failed release job after the competing operation ends.
[Google's concurrency rules](https://developers.google.com/android-publisher/concurrency-considerations).
