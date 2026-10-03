# Changelog

All notable changes to Klokka. The format follows Keep a Changelog; versions follow SemVer.

## 1.1.2, 2026-10-03

### Changed
- Phone app: the hours in the add-hours sheet can be typed (for example 7,25), so quarter hours work with the
  workspace's quarter-hour rounding; the note is a three-line box with one label (CHQ-154).

## 1.1.1, 2026-10-02

### Fixed
- Android: the bottom tab bar and the "Add employee" button no longer sit under the system navigation, with the
  three buttons or the gesture line (CHQ-152).
- Production: creating a business failed because the API used the staging Logto's role ids. Both role ids are now
  set on the production API (configuration, CHQ-152).

## 1.1.0, 2026-09-30

### Added
- klokka.se grows from one page per language to 22 (CHQ-149): the app, small businesses, hourly staff, open source,
  a work-hours calculator, a monthly timesheet template (Excel and PDF), working hours per month for 2026 and 2027,
  pages for cafés and restaurants, cleaning firms, salons and shops, five guides with official sources, and about,
  privacy and terms pages, all in Swedish and English.
- Every page has its own link-preview card; the homepage card shows the employer's and the employee's phone.
  Favicons and app icons in every size, `llms.txt`, a sitemap with hreflang, IndexNow.
- The web app gives shared links a proper preview and stays out of search results.

### Changed
- Only production is indexable: staging builds carry `noindex` everywhere, and CI and the release check both ways.
- The Android download is served from `klokka.se/download/android`.
- `www.klokka.se` and plain http now redirect permanently to `https://klokka.se`, with HSTS.

## 1.0.3, 2026-09-30

### Added
- Every email in the klokka.se design, in Swedish and English (CHQ-148): the seven Logto emails (sign-up, sign-in
  and password reset codes, invitation, new email, identity check, generic) and the weekly digest, now HTML with a week
  grid and a plain-text alternative. Logto's sign-in pages in Swedish. Sign-in by email code and password reset are on.

### Fixed
- Inviting an employee could fail while Logto was still sending the invitation email: the API now waits up to 30 s.

## 1.0.2, 2026-09-28

### Fixed
- The production APK carried staging URLs: Metro's transform cache, shared across jobs on the build host, does not key
  on `EXPO_PUBLIC_*` values. APK builds now use a job-local cache and fail unless the bundle contains the values
  the job set.

## 1.0.1, 2026-09-28

First production release build.

### Added
- `./release.sh` cuts a versioned release; a `v*` tag builds production images (`klokka-*:v<version>`) and the
  production APK. Environment URLs are `STAGING_*`/`PROD_*` repository variables. The manual staging script is now
  `./deploy-staging.sh`.

## 1.0.0, 2026-09-28

First version, running on staging.

### Added
- API (Quarkus, Java 25, PostgreSQL 18): workspaces, memberships and invitations backed by Logto
  organizations; hours per employee per day with quick entry, a batch week save, change history and
  month locks; read models for the employee month, the workspace month and both insights dashboards;
  optional pay with rates, earnings and labour cost; CSV export; flags raised by employees and resolved
  by employers; notifications with per-sitting coalescing, Expo push, an in-app center, invitation and
  opt-in weekly digest email; per-user preferences (language, push, digest); operator endpoints; a
  Logto webhook. One OpenAPI contract published to Nexus as a Maven artifact and an npm client.
- Web app (Next.js 16): employer (overview, week grid, employees, employee month, settings,
  notifications), employee (my month, day detail, flags, notifications, profile, shareable card) and
  the operator console; sign-in through Klokka's own Logto with a server-side session and a BFF.
- Android app (Expo SDK 57): the same features for both roles, Logto PKCE sign-in, push
  notifications, the shareable monthly card; iOS-ready, no store build yet.
- Landing site (Next.js 16): Swedish default, English at /en, Nightshift theme, APK download.
- Shared packages: design tokens (Nightshift, light and dark), a typed sv/en catalogue used by all three
  runtimes, and the generated API client.
- CI/CD on self-hosted runners: build, test, publish the contract, push images, deploy staging, build and
  sign the Android APK and publish it to Nexus.

### Known gaps
See `docs/BACKLOG.md` and `docs/REVIEW.md`.
