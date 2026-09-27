## Mission
Deliver correct, maintainable changes with minimal risk.

## Scope
- Respect repository architecture and conventions.
- Keep edits focused; avoid unrelated refactors.
- Never commit secrets.
- Cross-cutting edge concerns (TLS, rate limiting, IP rules) live at the reverse proxy (Traefik on Coolify), not in the apps.

## Engineering Rules
- Validate changes with relevant checks before final delivery.
- Surface assumptions and edge cases explicitly.
- Prefer reversible changes and deterministic outputs.

## Product (read `docs/PRODUCT_BRIEF.md` first)
- Klokka: an employer logs the hours each employee worked, per day; both sides see the month add up; pay is an optional
  per-workspace toggle. Free and open source (MIT), public repo `prasannjeet/klokka`.
- Roles per workspace: EMPLOYER (owner of the workspace), EMPLOYEE. Plus the global `platform-admin` (operator console).
  A workspace is a Logto organization; a user can belong to several.
- Business model: commercial open source with a hosted service (the cal.com / Odoo shape). The code is MIT and
  self-hostable; the hosted instance is free to use today and may charge later. Public copy says "free to use" and
  "open source" with a direct sign-up; it never mentions pricing, tiers or seats.
- Languages: Swedish and English everywhere. Public site: switcher, `sv` at `/`, `en` at `/en`. Signed-in web app and
  phone app: a user setting stored server-side, defaulting to the device language on first sign-in.
- Theme: Nightshift (owner's choice), light and dark. Signal and Clay remain in `docs/design/tokens.css` as history.
- **Status: design phase.** Nothing is implemented. Implementation starts only after the owner approves the preliminary
  report. Until then, changes to this repo are documents, mockups and brand assets.
- Documentation map: `docs/PRODUCT_BRIEF.md` (what), `docs/DECISIONS.md` (cross-cutting calls; wins over the research
  docs when they differ), `docs/research/*.md` (evidence per area), `docs/design/DIRECTION.md` + `docs/design/mockups/`
  (visual direction, tokens, mockups), `docs/brand/` (logo), `docs/JIRA_PLAN.md` (epics and stories).

## Parity is part of DONE
- Every feature ships on the API, the web app and the mobile app in the same ticket. A ticket that delivers one client is
  not done. Deferring a client needs an explicit follow-up ticket linked from the deferring one, never a silent gap.
- The operator console is web-only by decision (`docs/JIRA_PLAN.md` E10); everything else is both clients.
- Both clients render the SAME numbers: totals, trends and projections are API read models (`docs/DECISIONS.md` D9);
  `packages/core` holds only presentation helpers and the string catalogue.

## Version control / Jira
- Work directly on `main` by default; branch only for work explicitly agreed to be isolated.
- Jira project is **CHQ**. Every ticket summary starts with `KLOKKA: ` and carries the label `klokka` (the Repository select
  has no klokka option yet). Every feature ticket has a **Parity** section (API / web / mobile).
- Once implementation starts: branch `CHQ-<n>-<slug>`, every commit subject `CHQ-<n>: ...`.
- Commit as the single configured author. No `Co-Authored-By`, no agent or assistant mention in commit messages.
- When a Claude Code session creates a ticket or closes one with a decision, it links the session
  (`https://claude.ai/code/session_<id>`) in the description or the closing comment.

## Repository layout (npm workspaces; `apps/api` is Maven, not a workspace)
```
apps/api            Quarkus API, Java 25, Maven; owns src/main/openapi/openapi.yaml
apps/web            Next.js product app (app.example.com) incl. the operator console route group
apps/landing        Next.js marketing site (example.com), sv default + en
apps/mobile         Expo app (Android now, iOS-ready), android/ and ios/ generated and gitignored
packages/core       @klokka/core: pure TS domain helpers + the i18n catalogue (JSON, also loaded by the API)
packages/api-client @klokka/api-client: typescript-fetch client generated from openapi.yaml, committed
packages/tokens     @klokka/tokens: design tokens, TS source (hex colours) + generated theme.css, committed
docs/               brief, decisions, research, design, brand, Jira plan
```
Root `package.json` pins `react`/`react-dom` 19.2.3 through `overrides` (Expo SDK 57's pin), `typescript ~6.0.3`,
ESLint `^9.39` (ESLint 10 breaks `eslint-config-next`). Generated outputs (`api-client`, `tokens/dist`) are committed and
guarded by a regenerate-and-diff check.

## Tech stack (locked, `docs/DECISIONS.md` D7)
- API: Java 25 (`~/.sdkman/candidates/java/25.0.2-amzn`; shell default is 21, so set `JAVA_HOME`), Quarkus 3.39.5 now and
  3.40 LTS when it ships, Maven, PostgreSQL 18, Flyway SQL migrations, Hibernate ORM with Panache (repository pattern),
  `quarkus-oidc` bearer, `quarkus-oidc-client` for the Logto Management API (M2M), `quarkus-mailer`, `quarkus-scheduler`,
  `quarkus-rest-client` for Expo push. Fast-jar image on `eclipse-temurin:25-jre`.
- Mobile: Expo SDK 57, RN 0.86, Expo Router, New Architecture, prebuild + development builds (never Expo Go, no
  `expo-dev-client`; runtime config through `EXPO_PUBLIC_*`), plain `StyleSheet` + `@klokka/tokens`, Reanimated 4,
  gesture-handler, `@expo/ui` bottom sheet, `expo-notifications`, `expo-secure-store`, TanStack Query 5 + Zustand,
  `react-native-svg` for the one line chart (no Skia, no chart library), `react-native-view-shot` + `expo-sharing`.
- Web: Next.js 16 (>= 16.3.7), App Router, Turbopack, `output: "standalone"`, `@logto/next`, Tailwind v4 CSS-first,
  shadcn/ui on Base UI, kulram-web's CSS keyframe motion vocabulary, `motion` only for layout/exit/gesture, NumberFlow
  count-ups, Recharts 3 via shadcn's chart wrapper, TanStack Query 5 through a same-origin BFF route, TanStack Table 9 for
  the operator console.
- Auth: Logto (OIDC). Mobile: the ported Kulram `expo-auth-session` PKCE flow with `resource` (never omit it: without it
  Logto issues an opaque token). Web: `@logto/next`, token stays server-side, browser calls `/api/k/*` which adds the bearer.

## API contract (OpenAPI-first, absolute)
- Every byte crossing a client/API boundary is defined in `apps/api/src/main/openapi/openapi.yaml` first. From it the
  build generates the server interfaces (`jaxrs-spec`, `library=quarkus`, `interfaceOnly`) and the ONE `typescript-fetch`
  client. Never hand-roll a DTO, client or response type on either side.
- The contract is published to Nexus by CI (`docs/DECISIONS.md` D13): Maven `se.klokka:klokka-api-contract` (server
  interfaces + models) to `maven-releases`/`maven-snapshots`, npm `@klokka/api-client` to `npm-hosted`. The API depends on
  the Maven artifact; web and mobile depend on the npm package at the version of the API they target. Locally both are
  also generated from the spec so nothing waits on Nexus.
- New feature = spec change first, regenerate, then implement against the generated types.
- The web BFF auth plumbing (sign-in, callback, sign-out, `/api/k/*` proxy) is transport and stays outside the spec.

## CI/CD (GitHub Actions on our own runners)
- Runners: two per-repo self-hosted runners on this host (`/srv/actions-runner/klokka-01`, `klokka-02`, label `build`,
  systemd services like `tax-agent`'s). Workflows ask for `runs-on: [self-hosted, build]`, never bare `self-hosted`.
- A push to `main` builds and tests everything that changed (path-filtered jobs: api, web, landing, mobile, contract),
  publishes the contract to Nexus, pushes images to `docker.nexus.coolify.ooguy.com/klokka-{api,web,landing}` with an
  immutable tag, deploys staging through the Coolify API, and builds + signs the Android release APK (JDK 21) which is
  published to Nexus (raw) for the landing page's download link.
- Secrets live in the GitHub repository (`NEXUS_USERNAME`, `NEXUS_PASSWORD`, `COOLIFY_TOKEN`, `EXPO_TOKEN`,
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `GOOGLE_SERVICES_JSON`) and in `.agents/local-credentials/`
  locally. Never in the repo.
- Production is a later `v*`-tag path per `~/.agents/production-deploys.md`; the staging pipeline is never touched for it.

## Authorization (`docs/DECISIONS.md` D1)
- One Logto access token per user (audience = the Klokka API resource, no `organization_id`). The API decides what a user
  may do in a workspace from its own `membership` table, never from token claims. Logto organizations remain the source of
  truth for invitations and roles and are mirrored into `membership` (webhook + Management API read).
- `platform-admin` is a Logto global role read from the `roles` claim and enforced by the API on every operator route.
- Workspace isolation in app AND DB: every repository method takes `workspaceId`; every child table carries
  `workspace_id` with a composite FK.

## Text and i18n (`docs/DECISIONS.md` D2)
- All user-facing text lives in `packages/core/i18n/{sv,en}.json`. TypeScript gets a generated typed `t()`; the API loads
  the same JSON for push and email text. `{name}` placeholders, `_one`/`_other` plural keys. Never a hardcoded string in
  JSX, RN components or Java notification code.
- Never use an em dash in any user-facing text (UI copy, notifications, emails, catalogue entries). Rewrite with a comma,
  colon, parentheses or a period. Lint enforces it on TS, JSX text and the JSON catalogue.

## Java rules (distilled from tax-agent, see `docs/research/backend-and-infra.md` section 8)
- Java 25 idioms: records, sealed interfaces, `UUID`/`LocalDate`/`YearMonth`, static imports, no Javadoc, no FQCN.
- Boundaries fail fast: malformed input at parse/config/API edges throws a typed exception naming the field. Absent may
  default; present-but-wrong never. No fallbacks, no silent degradation.
- One exception taxonomy: every exception reaching REST carries a `ProblemCode`, rendered by one `ExceptionMapper`;
  narrow catches only; causes preserved.
- No magic literals: quiet windows, caps, batch sizes and retry limits are `@ConfigMapping` properties with validation;
  misconfiguration fails startup. `Clock` is injected (UTC) and fixed in tests.
- Idempotent writes: entries keyed by `(membership_id, work_date)`, invitation accept and month lock repeat-safe, jobs
  keyed by unique rows (`digest_run`, `push_delivery`). Week-grid saves go through the batch endpoint (D8).
- Robust jobs: per-row failure isolation, bounded batches, `SKIP_LOCKED`, never a silent death. Every loop is bounded.
- Tests can fail: exact assertions, no wall-clock sleeps, positive controls for guards, assertions scoped to the test's own
  rows on the shared Dev Services database; `@QuarkusTest` for slices, `@QuarkusIntegrationTest` against the fast-jar;
  ArchUnit through `archunit-junit6`; `%test.quarkus.http.test-port=0` (8081 is taken on this host). Testcontainers 2.x
  worked without `-Dapi.version=1.43` in the proof; keep the flag as a documented fallback.

## Frontend rules (web and mobile)
- Design tokens come from `@klokka/tokens` only; no literal colours, radii or easings in components. Light and dark both,
  following the device by default with a manual override.
- Responsive: ask the platform before measuring; size from content; `dvh`/`svh`, never `vh`; a layout fix is verified at
  360x640, 390x844, 412x915, 430x932 and after the soft keyboard opened and closed, with Playwright (web) or on the phone.
- Web verification runs against the LAN URL (`http://192.168.0.16:3000`, `allowedDevOrigins` set), not localhost.
- Charts: same data shapes from the API on both clients; Recharts on web, plain views + one SVG line chart on mobile.
- Accessibility basics are never simplified away: labels, focus states, contrast AA, reduced-motion respected.

## Mobile device loop (this host)
- LXC without KVM: no emulator. Metro on the host (port **8083**), a physical Android phone over LAN, the debug APK served
  with `python3 -m http.server 8898 --bind 0.0.0.0 --directory apps/mobile/android/app/build/outputs/apk/debug`.
- Gradle needs **JDK 21** (`~/.sdkman/candidates/java/21.0.5-amzn`) and `ANDROID_HOME=/home/dev/Android/Sdk`; JDK 25
  breaks the native CMake step. Kulram uses 8082/8899; never reuse them.
- Runtime values (API URL, Logto issuer, client id, audience) come from `EXPO_PUBLIC_*` at Metro time, so a JS reload
  picks them up; a native or dependency change needs a fresh APK.
- Release APKs are signed with the project keystore (outside git); the Android package id never changes once set.

## Environments (staging only; never production without the owner's explicit ask)
- Staging Coolify `https://coolify.coolify.ooguy.com/` (`ssh testenv`, MCP `coolify-testenv`), project **Klokka**. Apps
  deploy as `dockerimage` from `docker.nexus.coolify.ooguy.com/klokka-{api,web,landing}` (512m, `--init`, healthchecks).
  Addresses: `klokka.coolify.ooguy.com` (landing), `klokka-app.coolify.ooguy.com` (web app),
  `klokka-api.coolify.ooguy.com` (API), `klokka-logto.coolify.ooguy.com` (Logto). No real domain yet.
- Logto: Klokka's OWN Logto service in the Klokka project (own Postgres, admin console, email connector); nothing is shared
  with Kulram's Logto (`logto-vgyjk5a0t98xjk8l0vphgyeh...`), which stays Kulram's.
- Push: Expo project `f617e8bb-38d1-4247-9dde-d92bda37fe18`, Firebase project `klokka-64f3a`, Android package
  `com.prasannjeet.klokka` (fixed forever). `google-services.json` is copied from `.agents/local-credentials/` at build time.
- Postgres: `klokka` database on the Common Resources PostgreSQL 18 (Coolify uuid `k10e48k41urcbb1erev0vhmu`), two roles
  (`klokka_migrate` owns DDL, `klokka_runtime` for the app).
- SMTP: Migadu `smtp.migadu.com:587` STARTTLS; ~100 emails/month on staging, so email is for invitations (2 per invitee)
  and opt-in digests only. Credentials live only in Coolify env vars and `.env` files that are gitignored.
- No CI yet: `release.sh` builds each image, pushes an immutable tag, and PATCHes the Coolify app
  (`docker_registry_image_tag` + `instant_deploy`). Production comes later by `v*` tag per `~/.agents/production-deploys.md`.
- Local dev: Quarkus Dev Services for the API alone; `docker compose` (Postgres 18 + Mailpit) for the whole stack; auth
  against the staging Logto with `http://localhost:3000/callback` registered. Ports: API 8080, web 3000, landing 3001.

## MCP & Skills
- MCP server definitions: `.agents/agents.json`
- Local MCP overrides/secrets: `.agents/local.json`
- Project skills: `.agents/skills/*/SKILL.md`

## MCP & Skills workflow
1. Add or update MCP entries in `.agents/agents.json`.
2. Keep reusable instructions in `.agents/skills/*/SKILL.md`.
3. Run `agents sync` after changes.
4. Use `agents sync --check` in CI or before opening a PR.
5. Use `agents mcp test --runtime` when introducing new servers.

## Workflow
1. Plan briefly.
2. Implement minimal viable change.
3. Validate (lint/tests/build/smoke as needed).
4. Report results and residual risks.
