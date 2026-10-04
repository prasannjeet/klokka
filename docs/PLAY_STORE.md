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
