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

## Contract requests deferred by the integration pass (CHQ-143)
The v1 ones landed (`docs/CONTRACT_REQUESTS.md` says which, with the commit). Still open:
- A week read model (`GET /workspaces/{id}/weeks/{date}` with per-member totals and the previous week): the phone
  sums the two weeks of `listEntries` on the client, which is presentation arithmetic under D9.
- Typed notification subjects (`Notification.subjectName`) so a row can say "See Jonas's month".
- Named Prism examples per role (`Prefer: example=employer`); the web bridges it with the development persona rewrite.
- Operator console: sorting and search on every list, previous-month counts by kind, per-deployment health (already
  listed above under Product).
- Avatar upload and an account-management link (already listed above under Product).

## Deferred by the v1 review (CHQ-144, `docs/REVIEW.md`)
- R5 (P2): the `mobile` CI job only runs jest; add `npm run typecheck -w apps/mobile` so a wrong catalogue key cannot ship.
- R6: lock the open coalescing row (`findOpenByKey` with `PESSIMISTIC_WRITE`, or `@Version`) so a merge cannot race the push sweeper.
- R7: `ProblemMapper` should render a generic `detail` for `INTERNAL` (Logto's response body currently reaches direct callers).
- R8: `%prod` must have no defaults for `KLOKKA_AUTH_ISSUER`, `KLOKKA_AUTH_JWKS`, `KLOKKA_AUTH_AUDIENCE`, `KLOKKA_LOGTO_ENDPOINT`, `KLOKKA_WEB_BASE_URL`.
- R9: a deactivated member can still raise a flag the employer cannot fix; refuse `raiseFlag` with `MEMBER_NOT_ACTIVE`.
- R10: `GET /workspaces/{id}/flags` without `status` is unbounded; add a limit or a default scope.
- R11: week read models are ISO weeks while the grids follow `weekStart`; document or key them on `weekStart`.
- R12: `DigestJob.run` is one transaction per batch and only fires on Mondays; per-user `REQUIRES_NEW` and a catch-up rule.
- R13: pin the GitHub actions to commit SHAs; pass Nexus and Coolify credentials to curl via `--netrc-file` / `-K -`, not argv.
- R14: escape `%` and `_` in the operator search (`OperatorRepository.like`).
- R15: add `errors.INVALID_SIGNATURE` to the catalogues or exempt it in `docs/CONTRACT.md`.
- R16: set `agentRules: false` in `apps/landing/next.config.ts`, delete the generated `apps/landing/AGENTS.md`; decide whether the landing's dictionaries move into `packages/core/i18n`.
- R17: replace the provisional env names in `docs/INFRA.md` sections 2 and 8 with the `KLOKKA_*` ones.
- R18: `GET /invitations/{token}` should answer 404 or 410 once the invitation is accepted.
- R19: `MailService.send` logs the recipient address on failure; log an id instead.
