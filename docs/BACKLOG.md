# Post-v1 backlog (collected during the build run)

Items the trains deferred deliberately. Each becomes a `KLOKKA:` ticket in CHQ when picked up.

## Product
- Play Store listing (v1 ships a sideloaded APK from the landing page).
- Avatar upload (v1: emoji or initials) and an account link for password changes (Logto's hosted flow).
- Operator console: workspace colour, sorting and search, previous-month counts by kind, per-deployment health.
- Batch save problems should name the offending cells (`POST /workspaces/{id}/entries/batch`).
- Employee self-logging, clock-in timer, scheduling, payroll exports: out of scope by design.

## Design
- Nightshift light mode: `--primary` and `--chart-2` resolve to the same colour, so the first two workspace swatches look alike.
- Logto hosted pages do not use the Nightshift fonts (custom CSS on the sign-in experience).
- Logto email templates are still Logto's placeholder copy; brand them (sv + en).

## Platform
- Quarkus 4 upgrade the week it ships (Jackson 3, Vert.x 5); Quarkus 3.40 LTS for v1.
- Expo SDK 58 upgrade (needs Android SDK 37 on the runners).
- Next.js 16.3.7 (security release, 2026-09-30): bump the lock when it lands.
- Logto webhook: add `User.Deleted`; the `OperatorUser.platformAdmin` flag is always false (role lives in Logto only).
- Coolify container health check for the API is off (the runtime image has no curl); add curl to `apps/api/Dockerfile` and switch it back on.
- Nexus anonymous access is enabled instance-wide, scoped to `klokka-downloads` only; confirm acceptable.
- The `recentDeploys` operator figure only knows about the API itself.
- Maestro on-device flows for the phone (v1 relies on RNTL tests plus manual checks on the owner's phone).

## Contract requests not yet folded in
See `docs/CONTRACT_REQUESTS.md`; the integration pass decides which land in v1.
