# Klokka research: mobile (Expo / React Native)

Status: research for the preliminary report, 2026-09-27; nothing is implemented. Versions come from the
npm registry and the SDK's `bundledNativeModules.json`, other claims cite `[n]` below, and "inference" /
"unverified" mark the rest. Kulram's app (`tax-agent/mobile`: same host, Logto and phone loop) is the precedent.

## Decisions at a glance

| # | Topic | Decision |
|---|---|---|
| 1 | Expo SDK and builds | **Expo SDK 57** (`expo` 57.0.25, RN 0.86.3, React 19.2.3, `expo-router` 57), New Architecture (the only one), prebuild with `android/` + `ios/` generated and gitignored, **no `expo-dev-client`**, runtime environment through `EXPO_PUBLIC_*`, Metro on **8083**, APK served on **8898** |
| 2 | Auth | **Port Kulram's `expo-auth-session` PKCE flow** (with `resource`), add organization tokens behind **one global single-flight refresh**; not `@logto/rn` |
| 3 | Push | **Expo Push Service** via `expo-notifications` (needs an Expo account + EAS project id + Firebase project); tokens stored with a `provider` column so direct FCM stays a fallback |
| 4 | Styling and motion | **Plain `StyleSheet` + `packages/tokens`** through a small theme module; Reanimated 4 (CSS transitions + layout animations), gesture-handler, `expo-haptics`, `expo-linear-gradient`, `expo-image`, native `@expo/ui` bottom sheet. No NativeWind, Unistyles, Tamagui or Moti |
| 5 | Charts | **No chart library**: flex Views for bars and the heat-map, one `react-native-svg` + `d3-shape` line chart, Reanimated count-ups. No Skia (measured +18 MB) |
| 6 | Data and state | **TanStack Query v5** (server state) + **Zustand** (UI state), generated `typescript-fetch` client with one `Configuration` per token scope, persisted read cache in AsyncStorage |
| 7 | i18n and fonts | Shared **JSON catalogue** in `packages/core` with a typed `t()`, no i18next; `expo-localization`; fonts embedded by the `expo-font` config plugin |
| 8 | Share card | **`react-native-view-shot` + `expo-sharing`** |
| 9 | Testing | `jest-expo` 57 on **jest 29** + RNTL 14, TS strict, ESLint flat config, **Maestro on the physical phone** against a release-variant APK |
| 10 | iOS readiness | iOS-capable modules only, no committed `ios/`, EAS Build (cloud macOS) once an Apple account exists |

## Brief corrections

1. **"Push is Expo's push service" hides three prerequisites.** Even a locally built APK needs an
   Expo account and an EAS project id in the app config (`getExpoPushTokenAsync` requires
   `projectId`) [8], a Firebase project whose `google-services.json` is in the app
   (`android.googleServicesFile`, "required for your Android app to be registered with FCM") [9], and
   the FCM V1 service-account key uploaded to Expo [9]. None exists yet.
2. **`push_token.expo_push_token` should be `token` + `provider` + one row per device**, keyed by the
   token (a user has several phones), deleted on sign-out and on Expo's `DeviceNotRegistered` receipt
   [10]. The `provider` column (`expo` now, `fcm`/`apns` possible) is what keeps topic 3 reversible.
3. **The string catalogue must also reach the backend.** Push and email text is rendered on the server
   (an Android tray notification cannot be localized by the app while it is closed), so the catalogue
   needs a language-neutral format (JSON) the Java API can load, and the user's language must be
   stored server-side, not only on the device.
4. **The invite is web-first, not "land in the app"**: the recipient has no app yet (topic 2). Logto's
   invite one-time token defaults to **600 s** [5], too short for an inbox; and a magic-link sign-in
   leaves no password for the app's email + password sign-in (how Logto prompts for one: unverified).
5. **How employees install the Android app in v1 is undecided** (Play Store listing vs sideloaded
   APK). It drives the invite page's "get the app" step, App Links, and release signing.
6. **Expo's template signs `release` with the debug keystore** (verified in Kulram's generated
   `android/app/build.gradle`). Any distributed APK needs our own keystore injected by a config
   plugin, kept outside the repo and backed up: losing it ends Play Store updates.
7. **"One design-token package" needs two outputs**: React Native reads neither `oklch()` nor CSS
   variables (inference; why Kulram converts OKLCH to hex), so tokens emit hex and CSS (topic 4).
8. **React must be one version across the monorepo.** Expo SDK 57 pins React 19.2.3; the spike hit an
   npm `ERESOLVE` when `react-dom@19.3.0` was pulled in (fixed by pinning `react-dom@19.2.3`). The
   Next.js apps must use the same React or be isolated from the mobile workspace.

## 1. Expo SDK, builds and the device loop

**Versions (npm registry, 2026-09-27).** `expo@latest` is 57.0.25; SDK 57 shipped 2026-06-30 [1].
SDK 58 is `58.0.0-preview.7` on the `next` tag: beta since 2026-09-15 for "three to four weeks", on the
React Native 0.88 **release candidate** [2]. (Kulram is on 57.0.9 / RN 0.86.2.)

| | SDK 57 (stable) | SDK 58 (beta) |
|---|---|---|
| React Native / React | 0.86.3 / 19.2.3 | 0.88.0-rc / 19.3.0 |
| expo-router | ~57.0.23 | ~58.0.8 (navigation core reworked, custom navigators migrate) [2] |
| Reanimated / worklets | 4.5.1 / 0.10.1 | 4.7.0 / 0.13.0 |
| gesture-handler | ~2.32.0 (v2 API) | ~3.2.1 (hooks API, v2 kept as `Legacy*`) [28] |
| Skia / view-shot | 2.6.2 / 5.1.0 | 2.11.2 / 5.1.1 |
| Android toolchain (RN `libs.versions.toml`) | compileSdk 36, build-tools 36.0.0, NDK 27.1.12297006, AGP 8.12.0, minSdk 24 | compileSdk **37**, build-tools **37.0.0**, NDK 27.1, AGP **9.2.1** |
| Other breaking changes | none of note | foreground notifications shown by default, R8 on in release, `NODE_ENV` set before `.env` loading, iOS UIScene lifecycle [2] |

**New Architecture** is not a choice: since RN 0.82 it is the only architecture and `newArchEnabled`
is ignored [3]. Reanimated 4 requires it.

**Host check.** Installed: `platforms;android-36`, build-tools 35.0.0 + 36.0.0, NDK 27.1.12297006,
CMake 3.22.1, cmdline-tools 22.0, platform-tools 37.0.1, JDK 21.0.5 (Corretto), Node 24.14 (RN 0.86
engines accept `^24.3.0`). That satisfies SDK 57 exactly. SDK 58 will additionally need
`sdkmanager "platforms;android-37" "build-tools;37.0.0"`.

**Spike (scratchpad, not the repo).** A fresh SDK 57 app carrying every native candidate in this
document (notifications, secure-store, auth-session, localization, image, haptics, blur, sharing,
`@expo/ui`, Reanimated, gesture-handler, keyboard-controller, svg, view-shot, plus Skia 2.6.2 and
Unistyles 3.3.0 + Nitro 0.37.1 for measurement) passed `expo-doctor` (21/21) and `assembleDebug`
(arm64, JDK 21): exit 0, 668 tasks, 17 min cold. One surprise: Gradle silently downloaded NDK
27.0.12077973, AGP's default, because Unistyles declares no `ndkVersion`. Debug APK 114 MB; largest
native libraries: `libreactnative` 23.4 MB, `librnskia` 18.1, `libreanimated` 8.3, `libunistyles` 5.3,
`libworklets` 4.6, `libNitroModules` 1.1. Those two measurements drive topics 4 and 5.

**Development build without `expo-dev-client`.** A debug build without the library is still a
development build; `expo-dev-client` adds a launcher UI to switch servers and a network inspector [15].

| | No dev client (Kulram, chosen) | With `expo-dev-client` |
|---|---|---|
| Cold start | straight into the bundle at the saved bundler location | launcher screen first, pick a server |
| Pointing at Metro | RN dev menu, "Change Bundle Location" = `192.168.0.16:8083` | launcher URL or QR |
| App config `extra` | read from the APK, baked at build (proven twice on Kulram 2026-08-12) | manifest from Metro (inference) |
| Maestro / E2E | nothing in the way | launcher must be bypassed by deep link |
| Native surface | smaller | one more native module per build |

The dev client's real benefit on this host would be un-baking `extra`, and there is a cleaner fix:
`EXPO_PUBLIC_*` variables are inlined into the JS bundle by Metro at bundle time, and a changed value
needs only a full reload [4]. So Klokka puts every environment value (API base URL, Logto issuer,
client id, API resource) in `EXPO_PUBLIC_KLOKKA_*`, read through one typed, fail-fast config module
(Kulram's `config.ts` pattern), and `app.config.ts` carries nothing environment-dependent. A release
build bakes the values of the Gradle process that bundled it, which is what a release should do.
They ship in plain text, so none may be secret [4]; none is (a Logto native app is a public PKCE client).

**The loop on this host** (Kulram's, with Klokka's ports; 8081 is held by the `vscode-server-official`
container and 8082 is Kulram's Metro, both confirmed with `ss -ltn` today):

```bash
# Metro, watch mode (never CI=1: it disables file watching and freezes the bundle)
npx expo start --host lan --port 8083
# debug APK, arm64 only (every real phone; four ABIs is ~3x the size and time)
ANDROID_HOME=/home/dev/Android/Sdk JAVA_HOME=~/.sdkman/candidates/java/21.0.5-amzn \
  ./android/gradlew -p android assembleDebug -PreactNativeArchitectures=arm64-v8a
# serve it; the owner opens http://192.168.0.16:8898/app-debug.apk on the phone
python3 -m http.server 8898 --bind 0.0.0.0 --directory android/app/build/outputs/apk/debug
```

JDK 21, never 25 (25 fails the CMake configure of `react-native-screens`/`worklets`, Kulram). A new APK
is needed only for native or config-plugin changes; JS and `EXPO_PUBLIC_*` changes need a reload. The
loop targets **staging** (`klokka-api`, staging Logto), like Kulram's. `metro.config.js` copies Kulram's
workspace setup and its `blockList` rule (exclude `apps/api/target`, Docker volumes, `.claude/`
worktrees, or the watcher dies silently).

**Release builds.** `npx expo run:android --variant release` or `gradlew assembleRelease` produces a
Hermes-bundled APK that needs no Metro [16]; that variant is what Maestro drives. One local config
plugin, `apps/mobile/plugins/withReleaseSigning`, reads the keystore from `~/.gradle/gradle.properties`
(brief correction 6). Set
`android.allowBackup: false` so the persisted cache and secure-store blobs never reach Google Drive
backups [44].

**Decision:** Expo SDK 57 with prebuild (CNG), New Architecture, `expo-router` 57 (routes under
`src/app/`, the SDK 57 template's layout), no `expo-dev-client`, environment via `EXPO_PUBLIC_*`,
Metro 8083, APK server 8898, local Gradle builds with JDK 21. Upgrade to SDK 58 as its own ticket once
it is stable with a patch release out (expected mid/late October 2026, inference from the beta
window [2]). Why: SDK 57 is the stable release this host already builds for Kulram, and the only
thing the dev client would buy is solved by `EXPO_PUBLIC_*`.

## 2. Logto on React Native

| | `@logto/rn` 1.3.0 (2026-09-10) | Kulram's flow (`expo-auth-session` 57) |
|---|---|---|
| Track record | official SDK [13] | in production since 2026-08-01 against this Logto; `resource`, 401 replay, redirect swallowing all pinned by tests |
| Organization tokens | built in: `getOrganizationToken(orgId)`, `getAccessToken(resource, orgId)` [13] | add `organization_id` (+ scope `urn:logto:scope:organizations`) to the refresh grant [7] |
| Refresh concurrency | `@logto/client` memoizes per `(resource, organizationId)` key, so a user-token refresh and an org-token refresh run **in parallel on the same refresh token** (read from source) | one single-flight; extend it to serialize **every** grant |
| Token storage | AES ciphertext in AsyncStorage, key in SecureStore (read from source) | SecureStore only |
| Peer ranges | `expo-crypto`/`expo-secure-store`/`expo-web-browser` `<58`, async-storage `<3`: blocks the SDK 58 upgrade until Logto re-releases | follows the SDK |
| ID token check | claims only, no signature (source comment) | none needed (display only) |

The concurrency row decides it. Logto rotates a public client's refresh token "every time it is used",
and reusing a consumed one revokes every token of that grant, no grace period mentioned [14]. Klokka
refreshes a user token and a per-workspace org token together on every app resume, so parallel grants
would sign users out. Inference from source + article, not reproduced: the auth ticket starts with a
failing repro test (two concurrent scopes, assert one grant at a time).

**Design (ported from Kulram, extended).**
- One Logto **Native** app per environment, redirect `klokka://auth/callback`, post-logout
  `klokka://auth/logout`, registered verbatim and kept as constants (never `makeRedirectUri()`).
  `app/+native-intent.ts` swallows both so expo-router never routes them (Kulram KUL-133); Expo warns
  it lacks app context for general links [18], which dropping an already-consumed URL does not need.
- Scopes `openid profile email offline_access urn:logto:scope:organizations` (`email` because the
  profile shows it; Kulram lacked it). `resource=<API indicator>` on the authorize request, the code
  exchange and **every** refresh, or Logto issues an opaque token (Kulram KUL-119).
- A `TokenBroker` with `get(scope)`, `scope = 'user' | { workspaceId }` (workspace id = Logto
  organization id). Access tokens live in memory per scope; **all** refresh grants go through one
  promise queue, and each rotated refresh token is persisted before the next grant runs. An org token
  carries `aud`, `organization_id` and the org-role scopes [7].
- SecureStore holds only the refresh token and id token under one versioned key. Access tokens are
  not persisted: SecureStore values above roughly 2048 bytes have been rejected on some iOS releases
  [17], and one JWT per workspace would cross that. Cold start costs one grant per scope actually used.
- A 403 on a workspace call drops that org token and re-mints once (roles may have changed since it
  was minted); a failed org grant for a workspace the user left means "workspace gone", never sign-out.
  A 401 keeps Kulram's rule: one silent refresh, replay once, else sign out.
- Sign-out: clear the broker, SecureStore, the persisted query cache and every Zustand store (Kulram's
  privacy lesson), unregister the push token, then end the Logto session in the Custom Tab.

**Invitation on the phone.** Logto's flow: the backend creates the invitation and a one-time token,
emails a link to *our* page (`/invitation/join?id=&token=&email=`), the page signs in with
`one_time_token` + `login_hint`, and the backend then marks the invitation Accepted with
`acceptedUserId` [6]. The one-time token defaults to 600 s and can auto-provision the user [5].
- v1: the link opens the **web app** (the invitee may have no app). The web page completes sign-in and
  acceptance, then shows "Get the Android app". The app itself only signs in; a user with zero
  workspaces sees an empty state ("Ask your employer to invite you, then open the email").
- Later, same URL: an Android App Link (`intentFilters` with `autoVerify` on
  `app.<domain>/invitation/*` plus `/.well-known/assetlinks.json` with the release key's SHA-256 [19])
  makes the phone open the app when installed; the app passes the same two parameters as `extraParams`
  on its authorize request. Needs the real domain and a stable signing key, so not v1.

**Decision:** keep and extend Kulram's hand-rolled `expo-auth-session` PKCE flow, with one global
single-flight across user and organization tokens, SecureStore-only persistence, and a web-first
invite. Why: the official SDK's per-key refresh memoization collides with Logto's rotation on exactly
Klokka's multi-workspace access pattern, and its peer ranges would pin us below SDK 58.

## 3. Push notifications

| Need | Expo Push Service | Backend talks to FCM directly |
|---|---|---|
| Firebase project, `google-services.json` in the app | yes [9] | yes |
| Expo account + EAS project id in app config | **yes, even for local APKs** (`getExpoPushTokenAsync` needs `projectId`) [8] | no |
| FCM V1 service-account key | uploaded to Expo (EAS credentials) [9] | held by `klokka-api` as a secret |
| App token call | `getExpoPushTokenAsync()` | `getDevicePushTokenAsync()` [11] |
| Backend work | POST JSON to Expo, max 100 per request, 600/s per project, receipts ~15 min later give `DeviceNotRegistered` for cleanup, optional access token ("enhanced security") [10] | Firebase Admin SDK or HTTP v1 + OAuth, own error handling |
| iOS later | same call, Expo talks to APNs | a second sender for APNs (expo-notifications returns the raw APNs token on iOS [12]) |
| Price | no charge listed on expo.dev/pricing (unverified that none applies) | FCM: no charge (not re-verified) |

**Client behaviour.**
- **Channels** created at startup, before any permission prompt (Android 13 shows none until a channel
  exists) [12]: `hours` (high), `flags` (high), `workspace` (invite accepted, month closed; default).
  Localized names, permanent ids. Plugin: white 96x96 `icon`, brand `color`, `defaultChannel` [12].
- **Permission** asked in context (after the first workspace is joined, behind a one-screen
  explanation), never on cold start.
- **Token** registered after sign-in and again from `addPushTokenListener` (tokens can rotate) [12];
  deleted on sign-out so the next user on the phone never receives the previous user's pushes.
- **Foreground**: always set `setNotificationHandler` explicitly (SDK 58 flips the default to "show")
  [2]. Klokka shows no system banner in the foreground; it plays a haptic, shows an in-app toast and
  invalidates the queries named in `data`.
- **Tap**: `data.url` is an app path such as `/w/<workspaceId>/month/2026-09`, checked against an
  allowlist of route shapes before `router.push`; cold start reads `getLastNotificationResponse()`,
  warm start the response listener [12]. The workspace id in the path switches workspace first.
- **Badge**: `setBadgeCountAsync(unread)` best-effort ("not all Android launchers support application
  badges") [12]; the server's unread count in the notification center is the truth.

**Decision:** Expo Push Service with enhanced security on, one `PushSender` port in the backend, and
`push_token.provider` so a move to direct FCM is a backend change plus one app release. Why: it is
what the brief chose, it is one JSON call for the Java API, receipts handle dead tokens, and iOS later
needs no backend work; the price is an Expo account and trusting Expo with the FCM key, and the
Firebase project is needed either way.

## 4. Styling and animation

| | NativeWind 4.2.7 (Kulram) | NativeWind 5 | Unistyles 3.3.0 | Tamagui 2.7 | StyleSheet + tokens |
|---|---|---|---|---|---|
| Status | stable, Tailwind **3** | `5.0.0-rc.0` (2026-09-13), previews since 2025-09 [20] | stable [21] | stable since 2026 [22] | platform |
| Tokens from a TS object | via `tailwind.config` | CSS-first `@theme` (web could share it) | themes are TS objects | own token system | direct |
| Dark mode | CSS vars at runtime | CSS vars | `adaptiveThemes`, "no re-renders" [21] | yes | context re-render |
| Native cost (arm64, spike) | JS only | JS only | **+6.4 MB** (`libunistyles` 5.3 + `libNitroModules` 1.1), extra NDK | JS + compiler | none |
| Known traps | css-interop turns a function `style` into `{}` on device (#847/#1105), Jest babel-cwd trap (Kulram KUL-146/184) | new, RC | babel plugin, Nitro version pin | a full UI kit we would restyle | verbosity |

**Decision:** plain `StyleSheet` fed by `packages/tokens` through a small theme module
(`ThemeProvider` resolving light/dark from `useColorScheme()` plus a user override, `useTheme()`,
`createThemedStyles(theme => ...)` memoized per theme). Why: Klokka's theme changes only when the
system or the user flips dark mode, so a re-render then is free; everything the libraries add
(className parity, zero-re-render switching, breakpoints) is either unused here or costs a native
module, and the zero-dependency path removes Kulram's css-interop bug class outright. Named upgrade:
Unistyles 3 (its `StyleSheet.create(theme => ...)` has the same shape), if a profiler ever shows theme
switching to hurt.

**Motion stack ("funky, smooth, popping").**
- **Reanimated 4.5.1 + worklets 0.10.1** (SDK-bundled; 4.5 supports RN 0.86 with worklets 0.10/0.11)
  [23]. CSS-style `transition*`/`animation*` props for pops and presses, layout animations
  (`entering`/`exiting`/`LinearTransition`) for list inserts, shared values for gestures. Respect the
  OS reduce-motion setting (`useReducedMotion`).
- **No Moti**: last release 0.30.0 (2025-01-29), built on Reanimated 3, and its Reanimated 4 issue
  (#391) is open with no maintainer reply [24]. Reanimated 4's CSS animations cover its use case.
- **gesture-handler** 2.32 now, 3.x arrives with SDK 58 (hooks API; the v2 API survives as `Legacy*`)
  [28]: keep gestures in a few components so the migration is small.
- **Sheets**: `@expo/ui/community/bottom-sheet`, API-compatible with `@gorhom/bottom-sheet`, rendered by
  Jetpack Compose `ModalBottomSheet` / SwiftUI [25], behind one `AppSheet` component (Kulram's seam).
  Not `@gorhom/bottom-sheet` 5: its docs still target Reanimated 3 / Gesture Handler 2.
- **Keyboard**: `react-native-keyboard-controller` (edge-to-edge makes the IME inset the app's job,
  Kulram KUL-152).
- **Haptics**: `expo-haptics`, `performAndroidHapticsAsync` (device haptics engine, no `VIBRATE`) behind
  a `haptic(kind)` helper mapping to `impactAsync`/`notificationAsync` on iOS [27].
- **Blur** is decoration only: Android renders a semi-transparent view unless `blurMethod` is
  `dimezisBlurViewSdk31Plus` with a `BlurTargetView` [26]; no design may depend on it.
- **Gradients** `expo-linear-gradient`; **images/avatars** `expo-image`. No Skia in v1 (topic 5).

**Tokens shared with the web.** `packages/tokens`, a dependency-free TS module: OKLCH palette exported
as `hex` (native) and `oklch()` (CSS), `semantic.light/dark`, `space`, `radius`, `type`, `elevation`,
and `motion` (durations, easings, springs used by Reanimated here and Motion on the web). The web gets a
generated `tokens.css` (Tailwind v4 `@theme` + dark overrides); mobile imports the TS. Every text/fill
pair gets a WCAG test on resolved sRGB in both schemes (Kulram KUL-146). `app.config.ts` cannot import
workspace TS, so its splash colour is a literal pinned by a test (Kulram pattern).

## 5. Charts

| Need | victory-native 42.0.1 (Skia) | react-native-gifted-charts 1.4.78 | Custom |
|---|---|---|---|
| Rendering | Skia canvas, Reanimated, gestures [29] | react-native-svg, JS | Views, or react-native-svg + Reanimated |
| Peers | Skia `>=2.6 <3`, Reanimated `>=3.19.1`, GH `>=2` | svg + a linear-gradient lib | none new |
| Native cost (arm64, spike) | **+18.1 MB** `librnskia.so` | react-native-svg (2.3 MB) | react-native-svg only, likely shared with icons |
| Bars per employee / weekday bars | yes | yes | Views with percentage size, animated |
| Week-by-week line | yes, press-to-scrub | yes | svg `Path` + `d3-shape`, Reanimated draw-on |
| Calendar heat-map | no | no | 7-column flex grid of Views |

**Decision:** custom, no chart library in v1. Bars and the heat-map are flex Views sized in percent
(Kulram KUL-181: no measurement, one `accessible` element per column/day). The week-by-week line is a
`react-native-svg` `Path` from `d3-shape` (JS only), animated by Reanimated, with its width from
`onLayout` (the one number flex cannot answer for a path). Count-ups: a Reanimated shared value driving
tabular-figure text, instant under reduce motion. Why: Skia costs 18 MB of native code on every phone
for one line chart; victory-native is the upgrade if the design grows many axis charts or canvas effects.

## 6. Data and state

- **Server state: TanStack Query 5.104.** Keys `['me', ...]` / `['ws', workspaceId, ...]` (no cache
  mixing across workspaces), `focusManager` on `AppState`, `onlineManager` on `expo-network` [32].
  Hour edits are optimistic with rollback; a foreground push invalidates the keys it names.
- **Offline read cache**: `PersistQueryClientProvider` + `createAsyncStoragePersister` on
  `@react-native-async-storage/async-storage` 2.2.0 (SDK-bundled). `maxAge` 7 days with `gcTime` at
  least as long (the docs require it), `buster` = app version + OpenAPI spec hash [31], storage key
  per user (`klokka.qc.<sub>`), removed on sign-out. Writes need a connection in v1 (buttons say so).
  MMKV v4 is faster but a Nitro module [33]; a month of entries is too small for speed to matter.
- **UI state: Zustand 5**: active workspace id (persisted), theme override, the week-grid draft. Every
  store registers with one sign-out reset (Kulram's privacy lesson). No server data in Zustand.
- **API client**: the generated `typescript-fetch` client from `packages/api-client`. Its
  `accessToken` callback cannot see the request URL, so each scope gets its own `Configuration`:
  `userApi()` and `workspaceApi(workspaceId)` (memoized per id), each built as
  `{ basePath, accessToken: () => broker.get(scope), fetchApi: authenticatedFetch(scope) }` (Kulram's
  `createApiRuntimeConfig` seam, one per scope).

**Decision:** TanStack Query for everything from the API, Zustand for UI state only, AsyncStorage
persistence, per-scope API configurations. Why: Query supplies the dedup, refetch-on-focus,
persistence and optimistic rollback that Kulram hand-built as store factories with request epochs.

## 7. i18n and fonts

- **Catalogue**: `packages/core/i18n/{sv,en}.json` with a generated key type, so a key missing from
  either language fails `tsc` in both clients, and the Java API loads the same files for push and
  email text (brief correction 3). `t(key, params)` with named placeholders; plurals as explicit
  `{ one, other }` chosen by `n === 1` (the rule is the same for sv and en). Hermes on Android has
  `Intl.NumberFormat`, `DateTimeFormat` and `Collator` but not `PluralRules` or `RelativeTimeFormat`
  [34], which is why i18next-style plural resolution is avoided rather than polyfilled.
- **Locale**: `expo-localization` `useLocales()` re-renders when the OS language changes [35]; `sv` if
  the first locale's `languageCode` is `sv`, else `en`, overridable in settings and stored on the
  server. Numbers and money via `Intl.NumberFormat` with the workspace currency; the week start comes
  from the workspace, not the device's `firstWeekday`.
- **Fonts**: `@expo-google-fonts/*` TTFs embedded by the `expo-font` config plugin (available at
  launch, no `useFonts` gate), with Android `fontDefinitions` for weights [36]. Families are the
  design research's call.

**Decision:** shared JSON catalogue with a typed `t()`, no i18n library, `expo-localization`, fonts
embedded at build time. Why: two languages with identical plural rules do not justify a library that
needs an Intl polyfill on Hermes, and JSON is the one format the backend can share.

## 8. Shareable monthly card

`react-native-view-shot` (SDK-bundled 5.1.0) captures a mounted view with `captureRef` at a fixed
output size, as PNG [37]; `expo-sharing` `shareAsync(uri, { mimeType: 'image/png' })` hands it to the
system sheet, which also covers "save" without a media-library permission. The card is ordinary
Views, text, `expo-linear-gradient` and the svg sparkline, so it reuses tokens, fonts and the
catalogue's line breaking. A Skia offscreen surface (`makeImageSnapshot` + `encodeToBytes`) [30]
would need text re-laid out with Skia's paragraph API and the 18 MB library.

**Decision:** `react-native-view-shot` + `expo-sharing`. Why: the card is the same component the user
previews, captured as-is.

## 9. Testing

- **Unit/component**: `jest-expo` 57.0.5, which depends on the jest 29 line (`@jest/globals ^29`,
  `babel-jest ^29`) while npm's `latest` jest is 30.5.2, so **pin jest 29** (Kulram: 30 breaks it).
  RNTL 14.0.1 (peer `test-renderer ^1.0.0`; `react-test-renderer` is deprecated for React 19 [38]).
  Run through `npm test --workspace @klokka/mobile` (jest-expo reads Babel config from the cwd).
- **Types and lint**: TS `strict` + `noUncheckedIndexedAccess` (without `noUnusedLocals`, which the
  generated client trips; ESLint's `no-unused-vars` covers authored code, Kulram KUL-123), ESLint 9
  flat `eslint-config-expo` plus Kulram's em-dash rule.
- **On device**: Maestro CLI (Java 17+, fine with JDK 21; physical devices over adb) [39] on wireless
  adb against a **release-variant** APK on staging, the profile Expo's Maestro example uses [40]. Flows:
  sign-in, log hours (chips, week grid), notification center, dark mode. The AGENTS.md size matrix runs
  on the one phone via `adb shell wm size <px>` + `wm density <dpi>` (px = dp x dpi / 160, e.g. 945x1680
  at 420 for 360x640 dp), keyboard opened and closed per flow, `wm size reset` after [45].

**Decision:** jest-expo on jest 29 + RNTL 14 for logic and components, Maestro on the physical phone
for flows and the size matrix. Why: it is the proven Kulram setup, and `wm size` gives a real-device
size matrix on a host that cannot run an emulator.

## 10. iOS readiness without an Apple account

- Every module in this document ships iOS support. Android-only calls sit behind a cross-platform
  helper (`haptic()`, blur fallback); `ios.bundleIdentifier` is reserved in `app.config.ts` now.
- Push needs no iOS code change: Expo delivers to APNs once an APNs key is uploaded [10].
- `ios/` and `android/` are generated by prebuild and gitignored (Expo's own template rule and Kulram's
  practice). Native changes go through `app.config.ts` and local config plugins only. SDK 58 moving
  iOS to the UIScene lifecycle [2] is exactly the churn a committed `ios/` would have to absorb by hand.
- **Builds from Linux**: EAS Build compiles iOS on Expo's macOS workers [43] (free plan: 15 iOS builds a
  month, expo.dev/pricing). Device/TestFlight builds need the paid Apple Developer Program; a simulator
  build (`ios.simulator: true`) needs no Apple account [41], and EAS Simulator (cloud simulators in a
  browser, limited preview since 2026-09-14, waitlist) could run it without a Mac [42] (unverified).

**Decision:** keep the code iOS-capable, never commit native folders, and add an EAS `simulator`
profile once an Expo account exists; real iOS builds wait for the Apple account. Why: it costs
nothing now and turns "iOS-ready" into something testable before the $99 decision.

## Open questions (for the owner)

1. Create an **Expo account** (free) and a **Firebase project** for Klokka? Both are required for
   push (topic 3); the FCM key then goes to Expo.
2. **Android package id** (`applicationId`) is permanent once a Firebase app or store listing uses it;
   it should come from the real domain. Placeholder `se.klokka.app` until then?
3. **Distribution in v1**: Play Store listing (needs a Google Play developer account and our release
   keystore) or a sideloaded APK? This decides the invite page's "get the app" link and App Links.
4. For the backend/auth researchers: organization tokens vs the `membership` table as the API's
   authorization source (mobile supports either through `TokenBroker`), the one-time-token lifetime for
   invites, and how an invitee who signed in by magic link gets a password.

## Sources (read 2026-09-27)

Local evidence: npm registry (`npm view`, dist-tags, `expo@57.0.25` and `expo@58.0.0-preview.7`
`bundledNativeModules.json`, RN 0.86.3 / 0.88.0-rc.2 `gradle/libs.versions.toml`, the `@logto/rn` 1.3.0
and `@logto/client` 3.1.2 tarballs); Kulram `tax-agent/mobile` and its AGENTS.md; the scratchpad spike
(session scratchpad `mobile/spike`, since cleaned; the NDK it pulled was removed again).

[1] https://expo.dev/changelog/sdk-57 · [2] https://expo.dev/changelog/sdk-58-beta · [3] https://reactnative.dev/blog/2025/10/08/react-native-0.82 ·
[4] https://docs.expo.dev/guides/environment-variables/ · [5] https://docs.logto.io/end-user-flows/one-time-token · [6] https://docs.logto.io/end-user-flows/organization-experience/invite-organization-members ·
[7] https://docs.logto.io/authorization/organization-level-api-resources · [8] https://docs.expo.dev/push-notifications/push-notifications-setup/ · [9] https://docs.expo.dev/push-notifications/fcm-credentials/ ·
[10] https://docs.expo.dev/push-notifications/sending-notifications/ · [11] https://docs.expo.dev/push-notifications/sending-notifications-custom/ · [12] https://docs.expo.dev/versions/latest/sdk/notifications/ ·
[13] https://docs.logto.io/quick-starts/expo · [14] https://blog.logto.io/understanding-refresh-token-rotation · [15] https://docs.expo.dev/develop/development-builds/introduction/ ·
[16] https://docs.expo.dev/guides/local-app-development/ · [17] https://docs.expo.dev/versions/latest/sdk/securestore/ · [18] https://docs.expo.dev/router/advanced/native-intent/ ·
[19] https://docs.expo.dev/linking/android-app-links/ · [20] https://www.nativewind.dev/v5 · [21] https://www.unistyl.es/v3/start/introduction and https://github.com/jpudysz/react-native-unistyles ·
[22] https://tamagui.dev/blog/version-two · [23] https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/ · [24] https://github.com/nandorojo/moti/issues/391 ·
[25] https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/bottomsheet/ · [26] https://docs.expo.dev/versions/latest/sdk/blur-view/ · [27] https://docs.expo.dev/versions/latest/sdk/haptics/ ·
[28] https://docs.swmansion.com/react-native-gesture-handler/docs/guides/upgrading-to-3/ · [29] https://nearform.com/open-source/victory-native/docs/ · [30] https://shopify.github.io/react-native-skia/docs/canvas/overview/ ·
[31] https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient · [32] https://tanstack.com/query/latest/docs/framework/react/react-native · [33] https://github.com/mrousavy/react-native-mmkv ·
[34] https://github.com/facebook/hermes/blob/main/doc/IntlAPIs.md · [35] https://docs.expo.dev/versions/latest/sdk/localization/ · [36] https://docs.expo.dev/develop/user-interface/fonts/ ·
[37] https://github.com/gre/react-native-view-shot · [38] https://docs.expo.dev/develop/unit-testing/ · [39] https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli ·
[40] https://docs.expo.dev/eas/workflows/examples/e2e-tests/ · [41] https://docs.expo.dev/build-reference/simulators/ · [42] https://expo.dev/blog/build-ios-apps-on-windows-with-cloud-simulators ·
[43] https://docs.expo.dev/build/introduction/ · [44] https://docs.expo.dev/versions/latest/config/app/ · [45] https://www.repeato.app/simulating-other-devices-using-adb-shell-wm-commands/
