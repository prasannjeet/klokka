# Google Play

Klokka is on Google Play as `se.klokka.app` (`docs/DECISIONS.md` D19) under the CleanHQ developer account, a personal
account. The plan and its status: `docs/superpowers/plans/2026-10-04-google-play-launch.md` (CHQ-153).

## Access

- Play Console: the owner's Google login.
- API: the Firebase service account `firebase-adminsdk-fbsvc@klokka-64f3a.iam.gserviceaccount.com`
  (`.agents/local-credentials/firebase-service-account.json`; GitHub secret `PLAY_SERVICE_ACCOUNT_JSON`). It can
  release every app on the developer account, so every command names Klokka's package or runs from `apps/mobile`,
  where `fastlane/Appfile` pins it.
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
| Internal to closed testing | `fastlane supply --track internal --track_promote_to alpha --release_status completed --skip_upload_metadata --skip_upload_images --skip_upload_screenshots --skip_upload_changelogs` |
| Internal to production | the same with `--track_promote_to production` |

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
| Content rating (IARC) | Category: utility, productivity, communication or other. Violence, fear, sexuality, language, controlled substances, gambling, crude humour: none. Users interact or exchange content: no (hours and flags stay inside one workplace; no chat, no public content). Shares the user's current location with other users: no. Digital purchases: no. |
| Target audience | 18 and over only. Not designed to appeal to children. |
| News app | No. |
| Government app | No. |
| Financial features | None. |
| Health | None. |
| Data safety: collection | Data is collected and encrypted in transit. No data is shared (Expo, Firebase Cloud Messaging, Google Maps and Migadu are service providers acting for Klokka, which Play does not count as sharing). Users can request deletion: yes, `https://klokka.se/radera-konto`. |
| Data safety: types | **Name** and **email address** (account management, app functionality; required). **User IDs** (account management; required). **Other info: work hours, notes, hourly rate** (app functionality; required). **Approximate and precise location** (app functionality; optional: only when a user taps "use where I am now" on a job; stored as the job's place, not tracked). **Device or other IDs: push token** (app functionality; optional, only with notifications on). Nothing for advertising or analytics. |
| Store settings | Category: Business. Tags: time tracking, productivity (as offered). Email `hej@klokka.se`, website `https://klokka.se`. No phone number. |
| Countries | Sweden, the rest of the EU/EEA, Norway, Switzerland and the UK at first; the app is in Swedish and English. |

## Closed test (personal account rule)

Production needs a closed test with at least 12 testers opted in for 14 days in a row. Use a Google Group as the
tester list (the API takes groups for closed tracks), recruit about 15 so a drop-out does not reset the clock, and
keep the build installed and used. The production application then asks what was tested and what changed; answer
from CHANGELOG.md.
