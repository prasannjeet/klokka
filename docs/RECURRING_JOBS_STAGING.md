# Recurring jobs, staging (CHQ-159)

Implemented on the API, desktop/responsive web and Expo Android app, using the existing Nightshift tokens,
job cards, hour wheels, dialogs and native sheet. English and Swedish copy share the catalogue.

Builds: API/Android `95aba4c`, web `1bde10f` (the web-only lint correction). Both CI deployments are verified
on staging; production and Play are unchanged.

## Try it

- Web: https://klokka-app.coolify.ooguy.com
- Signed staging APK: https://nexus.coolify.ooguy.com/repository/klokka-downloads/klokka-95aba4c.apk
- Employer: Employee view, choose an employee and today or a future date, Add job, Repeat. On Android,
  open the employee's day from Week, then Add job and Repeat.
- Choose Weekly and weekdays, or Monthly and the original date/last day. Change Every for a custom interval.
- Supply either an end date or a number of calendar weeks/months. Save stays unavailable until the API
  preview succeeds. An endless schedule is rejected by the API, including direct requests.
- Employees see the occurrences in their normal week/month/day views, with their repeat and end details.
- Editing/removing an occurrence offers Only this job or This and future jobs. Future scope preserves earlier
  and unrelated work. It changes job details, not the schedule. To change the dates, stop the remaining
  occurrences and create a new finite series.

## Checks

- Maven verify: 149 tests (148 passed, one existing opt-in live-service test skipped), plus the fast-jar HealthIT.
- Web: 73 tests. Android client: 96 tests. Shared-package tests, typechecks, generated-output guards and lint.
- Real Chromium over the LAN: desktop 1440x900 and 360x640, 390x844, 412x915, 430x932; finite-end blocking,
  weekday preview/request serialization, scrolling and keyboard resize. Existing design tokens unchanged.
- Live staging: required end rejection; weekly and monthly date/count previews; month-end clamping;
  retry-safe creation; single/future edits; stopping preserves earlier work. Temporary API smoke jobs removed.
- Live staging employee: normal entries/month read models include recurrence; preview/create/edit/stop forbidden.
- Deployed web: desktop creation with the real API preview, job summary, responsive monthly editor and employee view.
- Physical OnePlus 6T (Android 11): installed the signed staging APK over the existing app; saved three monthly
  occurrences (31 October, 30 November and 31 December) and verified them through the staging API. Exercised
  this-and-future save, count input with keyboard open/closed, sheet scrolling and the native end-date wheels.
  Selecting November from 31 October clamps the wheel to 30 November and previews two jobs. The date-picker
  draft was discarded. Phone settings were restored after the check.

## Staging test data

The existing employer/employee test accounts in Kafé Nord have a four-week October demo (`CHQ-159 recurring demo`)
starting 7 October and a three-month Android-created demo (`CHQ-159 Android smoke`) starting 31 October.
They are test-account examples available for review; no production data was touched.
