# Changelog

All notable changes to Klokka. The format follows Keep a Changelog; versions follow SemVer.

## 1.6.5, 2026-10-10

### Fixed
- An invitation opened while signed in with another email no longer offers Join (which then failed): it says who is
  signed in and who the invitation is for, and offers to sign out. On the web the sign-out comes back to the
  invitation, ready for the invited address (CHQ-178).

## 1.6.4, 2026-10-07

### Fixed
- Job location search keeps the tapped result in the search field (phone and web), so the house number can be typed
  after a street picked from a few letters (CHQ-176).
- Android: picking a search result moves the map straight to it; a camera flight cut short could rename the place
  after the wrong spot (CHQ-176).

## 1.6.3, 2026-10-07

### Fixed
- Android: a text field in a sheet (the job note) stays fully visible above the keyboard while typing, on every
  phone size, and the sheet keeps its header on screen (CHQ-175).

## 1.6.2, 2026-10-07

### Fixed
- Android and iOS: the app no longer crashes on a cold start after a recurring job was loaded once (CHQ-173).
- Home's "working today" counts the same team on both sides, active and invited employees (CHQ-174).
- iOS: sign-in and sign-out no longer show a system sheet or open the browser to sign out; the location prompt is
  in Swedish and English (CHQ-174).

## 1.6.1, 2026-10-07

### Fixed
- Android: buttons that start disabled (Repeat's Done, Use this date, Save job) react anywhere on the button again,
  not only on the label (CHQ-172).
- Inside a step of the job sheet (Repeat, Starts at), the close button no longer throws away the new job; the step
  keeps its Back (CHQ-172).

## 1.6.0, 2026-10-06

### Added
- Android: choosing a job's place opens a full-screen map (Google Maps; Apple Maps on iOS). Search, pick a result,
  then move the map to adjust the pin, and confirm with "Use this place". The screen no longer jumps while typing
  (CHQ-163).

### Fixed
- Android: the small map on job cards and in the job sheet now loads (the request lost its sign-in on Android)
  (CHQ-163).

## 1.5.0, 2026-10-06

### Changed
- A calmer, more professional look on web and Android with the same colours: Inter headings, smaller type,
  12 px corners, grouped lists, pink only for the main action. The job sheet groups place, start time and repeat in
  one list; repeat uses segmented choices and steppers (CHQ-162).

### Fixed
- Android: rows, chips and labels no longer overlap on some phones (a slide-in animation left them 25 px off).
  The job sheet no longer clips the quick picks, and "1 jobs" reads "1 job" (CHQ-162).
- Recurring jobs: switching weekly to monthly asks for the end again instead of turning weeks into months; the web
  editor no longer flashes an earlier error (CHQ-162).

## 1.4.0, 2026-10-05

### Added
- Recurring employee jobs on web and Android: weekly or monthly, custom intervals, weekday selection and
  month-end dates. Every series requires an end date or a number of calendar weeks/months (CHQ-159).
- Preview upcoming dates, total jobs and the last occurrence before saving. Employees see the recurring jobs
  in their existing day, week and month views (CHQ-159).
- Edit or remove only one job or that job and future occurrences, preserving earlier work and closed-month
  locks. Series creation is bounded, atomic and retry-safe (CHQ-159).

## 1.3.0, 2026-10-04

### Added
- Delete your own account, in the Android app (Settings or Profile), in the web app (Profile) and explained on
  klokka.se/radera-konto. Businesses you own are deleted with everything in them; as an employee your hours stay with
  the employer under your name (CHQ-157).
- Google Play: the release builds an AAB next to the APK and can put it on Play's internal track (CHQ-153).

### Changed
- The Android app is now `se.klokka.app`. Uninstall the earlier Klokka app first, then install the new one: both
  answer the same sign-in link, so with both installed signing in fails (CHQ-153).
- Release builds no longer ask for permissions Klokka never used (screen overlay, storage, fingerprint) (CHQ-153).

## 1.2.0, 2026-10-04

### Added
- Jobs: a day holds one or more jobs, each with hours and minutes, an optional start time, an optional location and a
  note. The day's total is the sum of its jobs. Existing days became one job each (CHQ-156).
- Any day can be filled in, past, today or future (planned work), unless its month is closed; on the phone every
  calendar day opens the day page, on the web every day of the month page does (CHQ-156).
- Job locations through Google Maps: search, recent places, "use where I am now", a small map on the job card and
  directions in Google Maps. The Maps key stays on the server (CHQ-156).
- Job reminders for employees, before each job with a start time: on by default, 1 hour before, or 15 min, 30 min,
  2 hours or the day before, or off, in Profile (CHQ-156).
- Settings, Employees: tell employees when a flag is declined (on by default), and show analysis to employees (on
  by default) (CHQ-156).

### Changed
- Averages and forecasts count days up to today only; planned days show as planned (CHQ-156).
- A day with two or more jobs is changed job by job; the web week grid shows its total and opens the day (CHQ-156).

## 1.1.3, 2026-10-04

### Changed
- Phone app: the add-hours sheet picks the time with an hours wheel and a minutes wheel. The minutes follow the
  workspace rounding (quarter hours, half hours, or every minute), quick picks sit in one row below, and the save
  button says hours and minutes (CHQ-155).
- Phone app: sheets stand out from the screen behind them in dark mode (CHQ-155).

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
