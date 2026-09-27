# Klokka: cross-cutting decisions

Where the three research documents (`docs/research/*.md`) disagreed or left a question open, this file
records the call taken on 2026-09-27 and why. The research documents keep the evidence; this file wins
when they differ. Items marked **owner** wait for the owner's answer in the preliminary report.

## D1. Authorization: one API token, membership decided by our database

The API accepts ONE Logto access token per user (audience = the Klokka API resource, no
`organization_id`). Which workspaces a user belongs to, and with which role, comes from Klokka's
`membership` table, never from token claims. Logto organizations still exist and are the source of
truth for invitations and role assignment: an accepted invitation is mirrored into `membership` by the
API (Logto webhook plus a Management API read on the next `/me`). The operator is a Logto global role
(`platform-admin`) in the `roles` claim, checked by the API on every operator route.

Why: per-workspace organization tokens cost one token per workspace in a single cookie on the web, go
stale after membership changes, and need a refresh lock on mobile; both client researchers recommended
against them and the API has to keep a membership table anyway. (Backend doc section 4a proposed
organization-scoped tokens; overruled here.)

## D2. One string catalogue, readable by three runtimes

`packages/core/i18n/{sv,en}.json` is the only place user-facing text lives. A small generator emits a
typed `t()` for TypeScript (web + mobile) and the API loads the same JSON files for push and email text.
Interpolation uses `{name}` placeholders and ICU-free plural keys (`hours_one`, `hours_other`), because
Hermes has no `Intl.PluralRules`. The user's language is stored server-side (`user_preference.language`)
so a closed phone still gets a Swedish notification.

## D3. Invitations are web-first

The invite email links to `https://app.example.com/join?token=...`. That page accepts the Logto
organization invitation, lets the invitee set a password (email + password is the only sign-in method
in v1, no magic links), shows the workspace they joined, and then offers "Get the Android app" and
"Continue on the web". The invitation token lifetime is set to 7 days when the API creates it (Logto's
default of 10 minutes is too short for an inbox). Budget: 2 emails per invitee (invitation + email
verification).

## D4. Android distribution in v1: sideloaded APK from the landing site

Employees download a signed release APK from the landing site (and from the invite page). A Play Store
listing is a post-v1 ticket. Consequence: release builds are signed with our own keystore from day one
(kept out of git), and the package id is fixed now. **Owner:** package id. Proposal `app.klokka.android`
until a real domain exists; it cannot change once Firebase or a store knows it.

## D5. Push prerequisites the owner must create

Expo push needs an Expo account with an EAS project id, and a Firebase project with
`google-services.json` and the FCM V1 service-account key uploaded to Expo. **Owner:** create both (or
hand over access). Until then push is stubbed and in-app notifications carry everything.

## D6. Staging infrastructure

- Postgres: a `klokka` database with two roles (`klokka_migrate`, `klokka_runtime`) on the existing
  Common Resources PostgreSQL 18 on staging Coolify (uuid `k10e48k41urcbb1erev0vhmu`), not a fourth
  container. **Owner** can veto.
- Logto: Klokka's apps, API resource, organization roles and `platform-admin` live in the shared
  `default` tenant of the staging Logto (OSS has one tenant). Sign-in experience, organization template
  and email connector are shared with Kulram on staging. Production gets its own Logto instance in the
  production deploy ticket. **Owner:** upgrade staging Logto 1.41.0 to 1.43.0 before Klokka starts
  (recommended, security fixes).
- SMTP: Migadu `smtp.migadu.com:587` STARTTLS (proven by tax-agent), credentials only in Coolify env.
- Nexus: pushes and pulls to `docker.nexus.coolify.ooguy.com` work from this host; the Coolify "nexus"
  record is stale. **Owner:** confirm where it runs, for the runbook only.

## D7. Versions pinned below "latest"

React 19.2.3 (Expo SDK 57's pin, root `overrides`), TypeScript ~6.0.3, ESLint ^9.39 (ESLint 10 breaks
`eslint-config-next`), Next.js >= 16.3.7 (security release 2026-09-30), Expo SDK 57 (SDK 58 is beta:
its own upgrade ticket), Quarkus 3.39.5 now, 3.40 LTS the week it ships, JDK 25 for the API and JDK 21
for the Android Gradle build (JDK 25 breaks the native CMake step).

## D8. Week grid saves through a batch endpoint

`PUT /workspaces/{id}/entries:batch` accepts a list of `(membership_id, work_date, hours, note)` and
applies it atomically, so the grid's optimistic UI and the "one notification per sitting" coalescing
both see one write. Single-entry `PUT` stays for the phone's quick add.

## D9. Insights are computed by the API

Totals, trends, projections and "nothing logged" days are API read models (one endpoint per dashboard),
so web and mobile render identical numbers and neither client re-implements month arithmetic.
`packages/core` keeps only presentation helpers (rounding display, month labels).

## D10. Ports on this host

Metro 8083, APK static server 8898, API 8080 (dev) with `quarkus.http.test-port=0` in tests, web 3000,
landing 3001. Kulram keeps 8082 / 8899 / 8081.
