# Klokka on the phone: the device loop

How the owner installs and runs `apps/mobile` on a real Android phone from this host (an LXC without
KVM, so no emulator). Everything below is exact; the values come from `docs/INFRA.md` and
`.agents/local-credentials/`.

## What you need once

- Node 24 (`nvm use`), `npm install` at the repo root.
- JDK 21 for Gradle: `~/.sdkman/candidates/java/21.0.5-amzn`. JDK 25 (the API's JDK) breaks the native
  CMake step, so every Gradle command below sets `JAVA_HOME` explicitly.
- `ANDROID_HOME=/home/dev/Android/Sdk` (platform 36, build-tools 36, NDK 27.1, CMake 3.22).
- `apps/mobile/.env` (gitignored), copied from `apps/mobile/.env.example`. It carries the four
  `EXPO_PUBLIC_*` values and `EAS_PROJECT_ID` (from `.agents/local-credentials/expo.json`). Without
  `EAS_PROJECT_ID` the app builds but push registration fails at runtime.
- `apps/mobile/google-services.json` (gitignored): `cp .agents/local-credentials/google-services.json apps/mobile/`.
  Prebuild skips it when absent; FCM registration then fails at runtime.
- The phone and this host on the same LAN (the host is `192.168.0.16`).

## The loop

```sh
cd apps/mobile

# 1. Native project (only after a native or config change; JS changes never need it)
npx expo prebuild --platform android --clean

# 2. Debug APK, arm64 only (every real phone; four ABIs is ~3x the time)
ANDROID_HOME=/home/dev/Android/Sdk JAVA_HOME=~/.sdkman/candidates/java/21.0.5-amzn \
  ./android/gradlew -p android assembleDebug -PreactNativeArchitectures=arm64-v8a
# -> android/app/build/outputs/apk/debug/app-debug.apk (about 90 MB, 3 min warm, 15 min cold)

# 3. Serve it on the LAN (leave running; nohup so it survives the terminal)
nohup python3 -m http.server 8898 --bind 0.0.0.0 \
  --directory android/app/build/outputs/apk/debug > /tmp/klokka-apk.log 2>&1 &

# 4. Metro, watch mode, on Klokka's port (never CI=1: it freezes the bundle)
npx expo start --host lan --port 8083
```

On the phone:

1. Open `http://192.168.0.16:8898/app-debug.apk`, install (allow "unknown sources" for the browser once).
2. Open Klokka. The first start shows "Unable to load script" because the bundler location is not set
   yet: shake the phone (or long-press the back gesture area) to open the React Native dev menu,
   choose **Change Bundle Location**, enter `192.168.0.16:8083`, and **Reload**.
3. Every later JS change: shake, Reload (or press `r` in the Metro terminal). A change to
   `EXPO_PUBLIC_*` in `.env` needs a Metro restart plus a reload; only native or config-plugin
   changes need a new APK (steps 1 to 3 again, then reinstall).

Sign in hands over to Klokka's own staging Logto (`https://klokka-logto.coolify.ooguy.com`, native
app `klokka-mobile`) in a Custom Tab and returns to the app through `klokka://auth/callback`.

## Staging or the mock

The API URL is read at Metro time from `apps/mobile/.env`:

| Target | `EXPO_PUBLIC_API_BASE_URL` | Notes |
|---|---|---|
| Staging API (default) | `https://klokka-api.coolify.ooguy.com/v1` | the real API serves the contract under `/v1` |
| Prism mock on this host | `http://192.168.0.16:4011` | no `/v1` (Prism ignores the `servers` entry); every route answers the yaml's examples |

The mock: `npx @stoplight/prism-cli mock apps/api/contract/src/main/openapi/openapi.yaml -p 4011 -h 0.0.0.0`
from the repo root (port 4011 is the mobile train's; the root `npm run mock:api` uses 4010). Sign-in
still goes to the real staging Logto in both cases; the mock never sees the bearer.

Ports on this host (`docs/DECISIONS.md` D10): Metro 8083, APK server 8898, Prism 4011 (mobile) or
4010 (root script). Kulram holds 8082 and 8899; never reuse them.

## Release build (throwaway key locally, the project keystore in CI)

```sh
ANDROID_HOME=/home/dev/Android/Sdk JAVA_HOME=~/.sdkman/candidates/java/21.0.5-amzn \
  ./android/gradlew -p android assembleRelease -PreactNativeArchitectures=arm64-v8a
# -> android/app/build/outputs/apk/release/app-release.apk, signed with the DEBUG key
```

`plugins/withReleaseSigning.js` switches the release signing config to the project keystore when the
four `KLOKKA_RELEASE_STORE_FILE` / `_STORE_PASSWORD` / `_KEY_ALIAS` / `_KEY_PASSWORD` values are present,
as environment variables (the runners) or as Gradle properties in `~/.gradle/gradle.properties`.
Without them the template's debug key is used, which installs fine for a smoke test but is not the
app's identity: never distribute a debug-signed release APK. The keystore is
`.agents/local-credentials/klokka-release.keystore` (`docs/INFRA.md` section 6).

A release APK bundles the JS and needs no Metro; its `EXPO_PUBLIC_*` values are the ones in `.env`
when Gradle ran. Check what an APK carries with `unzip -p app-release.apk assets/app.config`
(the Expo config incl. `extra.eas.projectId`); the `EXPO_PUBLIC_*` values are inlined in the bundle.

## Checks

```sh
npm test -w @klokka/mobile          # jest-expo + RNTL (run from anywhere; the config anchors Babel to apps/mobile)
npx tsc --noEmit -p apps/mobile      # or: npm run typecheck -w @klokka/mobile
npm run lint                         # root ESLint, Prettier and the em dash gate cover apps/mobile
```

## Troubleshooting

- `A restricted method in java.lang.System has been called` during Gradle: JDK 25 is active. Set
  `JAVA_HOME` to the 21 path.
- The app opens on the sign-in screen after a reload: normal, the session lives in the secure store
  and survives reloads; a reinstall clears it.
- "Unable to load script": the bundler location is not set or Metro is not running on 8083.
- Sign-in returns to the app and nothing happens: the redirect `klokka://auth/callback` must be
  registered on the Logto native app exactly (it is, `docs/INFRA.md` section 4); check the Metro log.
- Push token registration fails: `EAS_PROJECT_ID` was not in `.env` when the APK was built, or
  `google-services.json` was missing at prebuild. Both are baked into the APK, so rebuild.
- The hosted Logto page shows an untrusted-certificate error: the phone's date is wrong or the
  staging certificate expired; nothing to fix in the app.
