# Deployment

## CI/CD

Staging only. Production is a later `v*`-tag path (`~/.agents/production-deploys.md`); nothing below can reach
it, and `.github/scripts/coolify-deploy.sh` refuses any Coolify but `https://coolify.coolify.ooguy.com`.

### What a push to `main` does

`.github/workflows/ci.yml` runs on every push to `main` and on `workflow_dispatch` (input `force_all`, default
true: every job; false: only what the last commit changed). A `changes` job diffs the push (`before..sha`; a new
branch or rewritten history runs everything) and switches the other jobs on:

| Job | Runs when these change | What it does |
|---|---|---|
| `api` | `apps/api/**`, `packages/core/i18n/**`, `.sdkmanrc` | JDK 25 (setup-java, Corretto), `mvn -B clean install` (contract + service, tests on a Dev Services Postgres), image `klokka-api:sha-<short>` + `:latest`, deploy, wait for `https://klokka-api.coolify.ooguy.com/q/health/ready` |
| `contract` | `apps/api/pom.xml`, `apps/api/contract/**`, `packages/api-client/**` | drift guard (`npm run check -w packages/api-client`), then `.github/scripts/publish-contract.sh` |
| `packages` | `packages/**`, `scripts/**`, root tooling files | root `npm run lint`, the regenerate-and-diff checks, typecheck and tests of core, tokens, api-client |
| `web` | `apps/web/**`, `packages/**`, root tooling files | scoped `npm ci`, lint, test, `next build`, image `klokka-web` (repo root as context), deploy, wait for `/healthz` |
| `landing` | `apps/landing/**`, `packages/**`, root tooling files | same as web; the `NEXT_PUBLIC_*` URLs go in as build arguments; waits for `/` |
| `mobile` | `apps/mobile/**`, `packages/**`, root tooling files | scoped `npm ci`, jest, `expo prebuild --platform android --clean`, `assembleRelease` (JDK 21, `ANDROID_HOME=/home/dev/Android/Sdk`), signature check, publish the APK |

Root tooling files: `package.json`, `package-lock.json`, `tsconfig.base.json`, `eslint.config.js`, the Prettier
files, `.nvmrc`. A change to `ci.yml` itself runs every job; a change to the image or deploy script runs the jobs
that use it. `web`, `landing` and `mobile` are skipped with a notice until `apps/<app>/Dockerfile`
(`apps/mobile/app.config.ts`) exists.

Runners: `klokka-01` and `klokka-02` on this host (`/srv/actions-runner/`, label `build`, user `dev`). Jobs ask
for `[self-hosted, build]`, never bare `self-hosted`. Each job has its own concurrency group
(`ci-<job>-<ref>`), so two different jobs run side by side and a newer push cancels the older run of the same
job. No `actions/cache`: `~/.m2` and `~/.npm` are already on disk. `setup-java` runs with
`overwrite-settings: false` so it never rewrites the `dev` user's `~/.m2/settings.xml`, and the docker login is
written to a job-local `DOCKER_CONFIG`, never to `~/.docker/config.json`. Timeouts: 5 (changes), 20 (contract,
packages), 45 (api, web, landing), 90 (mobile) minutes.

### Images and the deploy call

- `.github/scripts/image.sh <api|web|landing> <tag>` builds and pushes
  `docker.nexus.coolify.ooguy.com/klokka-<app>:<tag>` and `:latest` (labels `org.opencontainers.image.revision`
  and `klokka.app`), then drops the local immutable tag and the dangling previous build of that app.
  The API image copies the fast-jar, so Maven runs first; web and landing build inside their Dockerfiles.
- The tag is `sha-<7-char commit>`: immutable, and it names the commit.
- `.github/scripts/coolify-deploy.sh <app-uuid> <tag> [health-url]` pins and deploys in one call,
  `PATCH /api/v1/applications/{uuid}` with `{"docker_registry_image_tag": "<tag>", "instant_deploy": true}`,
  reads the body (`{"uuid"}` = queued; `{"message"}` = no new deployment because one for this tag is already
  running, reported as a warning), follows the new deployment record until `finished` (fails on `failed` or
  `cancelled`), then polls the health URL for a 200. Every wait is at most 40 polls, 15 s apart.
- Rollback: the same call with an earlier tag (every `sha-*` tag stays in Nexus), from this host:
  `COOLIFY_TOKEN=... .github/scripts/coolify-deploy.sh <uuid> sha-<older> <health-url>`.

### Contract publishing

`.github/scripts/publish-contract.sh` (needs `NEXUS_USERNAME`/`NEXUS_PASSWORD`, JDK 25, node):

- Maven: `mvn -pl contract -am deploy` publishes `com.prasannjeet.klokka:klokka-api-parent` and
  `klokka-api-contract` with a throwaway `settings.xml` whose servers (`nexus-releases`, `nexus-snapshots`) match
  `distributionManagement` in `apps/api/pom.xml` and read the credentials from the environment. A `-SNAPSHOT`
  goes to `maven-snapshots` (timestamped, every run); a release version goes to `maven-releases` once (skipped if
  its pom already exists, the repository is write-once).
- npm: `@klokka/api-client` goes to `https://nexus.coolify.ooguy.com/repository/npm-hosted/`
  (`publishConfig.registry`). While the API version is `X.Y.Z-SNAPSHOT` the package is `X.Y.Z-sha.<short>` with
  dist-tag `next`; a release API version publishes `X.Y.Z` as `latest`. An existing version is skipped
  (npm-hosted is write-once). The script publishes a temporary copy with `private` removed, so the workspace
  keeps `private: true` and can never reach npmjs. Auth is basic (`_auth`) in a temporary userconfig; no
  bearer token is needed (Nexus has the NpmToken realm, basic works for publish).
- Consumers read from Nexus with credentials (`npm-hosted` is not anonymous). In this monorepo the web and
  mobile apps use the workspace package, so nothing waits on Nexus.

### Android APK

- Signed with the project keystore (`ANDROID_KEYSTORE_BASE64` and friends) through the standard
  `android.injected.signing.*` Gradle properties, so the generated `build.gradle` is never edited. ABIs
  `armeabi-v7a,arm64-v8a` (every real phone; there is no emulator on this host).
- The job compares the APK's signer SHA-256 (`apksigner verify --print-certs`) with the keystore's and fails on
  a mismatch.
- Published to the raw repository `klokka-downloads`: `klokka-<short sha>.apk` (immutable) and
  `klokka-latest.apk` (overwritten after it). The landing links
  `https://nexus.coolify.ooguy.com/repository/klokka-downloads/klokka-latest.apk` (`NEXT_PUBLIC_APK_URL`),
  readable anonymously.
- Baked at bundle time (job env, public values): `EXPO_PUBLIC_API_BASE_URL=https://klokka-api.coolify.ooguy.com/v1`,
  `EXPO_PUBLIC_LOGTO_ENDPOINT`, `EXPO_PUBLIC_LOGTO_APP_ID`, `EXPO_PUBLIC_LOGTO_API_RESOURCE`, plus
  `EAS_PROJECT_ID` from the secret.

### Manual builds: `./release.sh`

`./release.sh api|web|landing|all` does the delivery half of CI from this host with the same two scripts:
Maven build and tests for the API (`SKIP_TESTS=1` skips the tests), image `sha-<short>` + `:latest`, deploy,
health wait. It refuses a dirty tree (the tag must name the commit), reads the Coolify token, app uuids, URLs
and health paths from `.agents/local-credentials/coolify-staging.json`, and uses this user's Nexus docker
login. `all` skips an app whose Dockerfile does not exist yet.

### GitHub repository secrets (`prasannjeet/klokka`)

| Secret | Used by |
|---|---|
| `NEXUS_USERNAME`, `NEXUS_PASSWORD` | docker login, Maven and npm publish, APK upload |
| `COOLIFY_TOKEN` | staging Coolify, write scope |
| `COOLIFY_APP_API_UUID`, `COOLIFY_APP_WEB_UUID`, `COOLIFY_APP_LANDING_UUID` | the three deploy targets (added 2026-09-28) |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | APK signing |
| `GOOGLE_SERVICES_JSON` (base64) | `apps/mobile/google-services.json` at build time |
| `EAS_PROJECT_ID` | mobile build env |
| `EXPO_TOKEN` | not used by CI yet (no EAS step) |

### Staging environment variables (Coolify, names only)

Set through `PATCH /api/v1/applications/{uuid}/envs/bulk` from `.agents/local-credentials/` (literal values,
secrets locked with `is_shown_once`, marked `*`). These names replace the provisional ones in `docs/INFRA.md`
sections 2 and 8 (`LOGTO_ISSUER`, `DB_URL`, `MAIL_HOST`, `API_BASE_URL`, `KLOKKA_API_RESOURCE`, ...), which were
deleted from Coolify.

- `klokka-api` (`l5qbr0mxfwdfdgy7f4jndyde`): `KLOKKA_DB_URL` (internal JDBC), `KLOKKA_DB_USER` (`klokka_runtime`),
  `KLOKKA_DB_PASSWORD*`, `KLOKKA_DB_MIGRATE_USER` (`klokka_migrate`), `KLOKKA_DB_MIGRATE_PASSWORD*`,
  `KLOKKA_AUTH_ISSUER`, `KLOKKA_AUTH_AUDIENCE`, `KLOKKA_AUTH_JWKS`, `KLOKKA_LOGTO_ENDPOINT`,
  `KLOKKA_LOGTO_M2M_CLIENT_ID`, `KLOKKA_LOGTO_M2M_CLIENT_SECRET*`, `KLOKKA_LOGTO_WEBHOOK_SIGNING_KEY*`,
  `KLOKKA_MAIL_HOST`, `KLOKKA_MAIL_PORT`, `KLOKKA_MAIL_USERNAME`, `KLOKKA_MAIL_PASSWORD*`, `KLOKKA_MAIL_FROM`,
  `KLOKKA_MAIL_START_TLS` (`REQUIRED`), `KLOKKA_MAIL_MONTHLY_QUOTA` (100), `KLOKKA_WEB_BASE_URL`,
  `KLOKKA_EXPO_ACCESS_TOKEN*`, `KLOKKA_PUSH_QUIET_WINDOW` (`PT2M`) and `KLOKKA_PUSH_MAX_DELAY` (`PT10M`), set
  2026-09-28 for CHQ-145 (the defaults were 10 and 30 minutes then; they are 2 and 10 now, so the variables only pin
  them), `KLOKKA_OPERATOR_API_URL` and `KLOKKA_OPERATOR_LANDING_URL` (the Health page's
  probes), `JAVA_OPTS` (`-XX:MaxRAMPercentage=70` plus the JBoss log manager flag the Dockerfile's default
  carries). `KLOKKA_BUILD_VERSION` is baked into the image by `image.sh` (build argument), not set here.
- `klokka-web` (`armlujpn5wkqd1d2nq0wkiiz`): `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET*`,
  `LOGTO_COOKIE_SECRET*` (generated, kept in `logto.json` as `applications.klokka-web.cookie_secret`),
  `LOGTO_BASE_URL`, `KLOKKA_API_RESOURCE` (the names are the ones `apps/web/src/lib/env.ts` reads; the
  provisional `LOGTO_API_RESOURCE` made every page answer 500 and was replaced during CHQ-143),
  `KLOKKA_API_BASE_URL` (`http://klokka-api:8080/v1`, see below), `KLOKKA_ANDROID_APK_URL` (the join page's
  "Get the Android app" link), `NEXT_PUBLIC_APP_URL`.
- `klokka-landing` (`0sbvfkrt1vvbofzkk5q8ndv6`): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`,
  `NEXT_PUBLIC_APK_URL` (also passed as build arguments, since Next.js inlines `NEXT_PUBLIC_*` at build time).

### Staging specifics

- Every variable shows twice in Coolify's env list, once for production deployments and once as the preview copy
  (`is_preview`). A secret (`is_shown_once`, marked `*` above) answers `value: null` through the API; that means
  hidden, not missing. What the container really has: `ssh testenv`, `docker exec <klokka-api container> env`.

- Internal API address: the `klokka-api` app has the Coolify network alias `klokka-api`
  (`custom_network_aliases`), so on the `coolify` docker network `http://klokka-api:8080/v1` reaches it whatever
  the container name of the current deployment (verified from a container on that network). The web BFF uses
  it; browsers and the phone use `https://klokka-api.coolify.ooguy.com/v1`.
- API container health check: OFF in Coolify for `klokka-api`. Coolify's HTTP check runs `curl` or `wget`
  inside the container, `eclipse-temurin:25-jre` has neither, and a `cmd` check cannot express an HTTP probe
  within Coolify's allowed characters, so the first deploy was rolled back as unhealthy although Quarkus was up.
  The deploy script's external `/q/health/ready` poll is the gate meanwhile. To turn it back on, install `curl`
  in `apps/api/Dockerfile` and `PATCH` `{"health_check_enabled": true}`. The web and landing images
  (`node:*-alpine`) have busybox `wget`, so their checks stay on.
- Logto webhook `eoeb31x3brwyfaeb5081x` ("klokka-api membership mirror"): events `User.Created`,
  `User.Data.Updated`, URL `https://klokka-api.coolify.ooguy.com/v1/webhooks/logto`. Logto generates a hook's
  signing key itself (it cannot be supplied), so the key it issued is the one stored in `logto.json`
  (`webhook.signing_key`) and set as `KLOKKA_LOGTO_WEBHOOK_SIGNING_KEY`. Rotating it:
  `PATCH /api/hooks/{id}/signing-key`, then update both.

### Validating a workflow change

`actionlint` (with shellcheck) over `.github/` must be clean; `.github/actionlint.yaml` declares the `build`
runner label. `shellcheck` covers `release.sh` and `.github/scripts/*.sh`.

## API runtime (`klokka-api`)

What the API needs at runtime, where each value lives, what it expects to find in Logto and in the database,
and how to smoke-test a staging deploy. The names below are the ones the CI section sets on Coolify; this is the
per-variable detail (required or optional, default, which credential file holds the secret).

### API environment variables (`KLOKKA_*`), one by one

Every value the API reads comes from a `KLOKKA_*` variable (`apps/api/service/src/main/resources/application.properties`
maps them). "Home" says where the value is set: the Coolify app `klokka-api` (uuid `l5qbr0mxfwdfdgy7f4jndyde`) on
staging, `.env` locally. Secrets are marked; their values are in the named local credential file.

| Variable | Required | Home | Value on staging | Notes |
|---|---|---|---|---|
| `KLOKKA_DB_URL` | prod | Coolify | `jdbc:postgresql://k10e48k41urcbb1erev0vhmu:5432/klokka` | Common Resources Postgres 18, `postgres.json` |
| `KLOKKA_DB_USER` | prod | Coolify | `klokka_runtime` | DML role the app runs as |
| `KLOKKA_DB_PASSWORD` | prod, secret | Coolify | `postgres.json` | |
| `KLOKKA_DB_MIGRATE_USER` | prod | Coolify | `klokka_migrate` | Flyway runs as the DDL owner |
| `KLOKKA_DB_MIGRATE_PASSWORD` | prod, secret | Coolify | `postgres.json` | |
| `KLOKKA_AUTH_ISSUER` | yes | Coolify | `https://klokka-logto.coolify.ooguy.com/oidc` | `iss` of user tokens and the M2M token endpoint base |
| `KLOKKA_AUTH_AUDIENCE` | yes | Coolify | `https://api.klokka.app` | the API resource indicator (`aud`) |
| `KLOKKA_AUTH_JWKS` | yes | Coolify | `https://klokka-logto.coolify.ooguy.com/oidc/jwks` | discovery is off, keys are fetched here |
| `KLOKKA_LOGTO_ENDPOINT` | yes | Coolify | `https://klokka-logto.coolify.ooguy.com` | Management API base is `<endpoint>/api` |
| `KLOKKA_LOGTO_M2M_CLIENT_ID` | prod | Coolify | `ntk66uf3a0yvlqfqdry9f` | M2M app `klokka-api`, `logto.json` |
| `KLOKKA_LOGTO_M2M_CLIENT_SECRET` | prod, secret | Coolify | `logto.json` | |
| `KLOKKA_LOGTO_WEBHOOK_SIGNING_KEY` | yes, secret | Coolify | the hook's signing key (section 2) | webhook answers `401 INVALID_SIGNATURE` until set |
| `KLOKKA_LOGTO_EMPLOYER_ROLE_ID` | no | Coolify | default `da4ro7bg7wzjcjeycjwbj` | organization role EMPLOYER; a different Logto needs its own |
| `KLOKKA_LOGTO_EMPLOYEE_ROLE_ID` | no | Coolify | default `0ibpq0bo3w9b8p926ykrd` | organization role EMPLOYEE |
| `KLOKKA_WEB_BASE_URL` | yes | Coolify | `https://klokka-app.coolify.ooguy.com` | invite links `<base>/join?token=...`; probed by `/operator/health` as `web` |
| `KLOKKA_MAIL_HOST` | yes | Coolify | `smtp.migadu.com` | `smtp.json` |
| `KLOKKA_MAIL_PORT` | yes | Coolify | `587` | |
| `KLOKKA_MAIL_START_TLS` | no | Coolify | `REQUIRED` (default) | |
| `KLOKKA_MAIL_USERNAME` | prod | Coolify | `smtp.json` | |
| `KLOKKA_MAIL_PASSWORD` | prod, secret | Coolify | `smtp.json` | |
| `KLOKKA_MAIL_FROM` | yes | Coolify | `Klokka <no-reply@cleanhq.se>` | |
| `KLOKKA_MAIL_MONTHLY_QUOTA` | no | Coolify | `100` (default) | the `email_send` ledger is checked against it before an invite |
| `KLOKKA_EXPO_ACCESS_TOKEN` | no, secret | Coolify | `expo.json` | Expo enhanced push security; absent means no bearer on Expo calls |
| `KLOKKA_EXPO_PUSH_URL` | no | none | default `https://exp.host/--/api/v2` | tests point it at a fake |
| `KLOKKA_PUSH_QUIET_WINDOW` | no | Coolify | `PT2M` (default `PT2M`) | "one push per sitting": the push waits this long after the last change (sliding); the in-app row exists from the first change |
| `KLOKKA_PUSH_MAX_DELAY` | no | Coolify | `PT10M` (default `PT10M`) | cap on the sliding window, counted from the first change |
| `KLOKKA_OPERATOR_API_URL` | no | Coolify | `https://klokka-api.coolify.ooguy.com` | probed by `/operator/health` as `api` |
| `KLOKKA_OPERATOR_LANDING_URL` | no | Coolify | `https://klokka.coolify.ooguy.com` | probed as `landing` |
| `KLOKKA_BUILD_VERSION` | no | CI | `0.1.0-<short sha>` | shown by `/operator/health` |
| `JAVA_OPTS` | no | Coolify | `-XX:MaxRAMPercentage=70` plus the JBoss log manager flag | the image's default carries both |

"prod" = required with the `prod` profile (no default; a missing variable fails startup). Locally the dev and test
profiles use Dev Services for Postgres and mock the mailer; the fast-jar integration test (`HealthIT`) runs the
`prod` profile with placeholder secrets from the failsafe configuration in `apps/api/service/pom.xml`.

### Logto objects the API expects (docs/INFRA.md section 4)

- API resource `https://api.klokka.app` with scopes `workspace:read`, `workspace:write`, `operator`. User tokens must
  be minted with `resource=https://api.klokka.app` (a token without it is opaque and answers 401).
- Organization roles `EMPLOYER` and `EMPLOYEE` (ids above). `POST /workspaces` creates an organization and assigns the
  caller EMPLOYER there; an invitation carries the EMPLOYEE role. The API authorizes from its own `membership` table
  (D1); the organization mirrors it for Logto's invitation flow.
- Global role `platform-admin` carrying the `operator` scope. Operator routes accept either the role name in the
  `roles` claim or the `operator` scope in `scope` (Logto puts the scope in every access token; the role name only
  when the token is configured to carry it).
- M2M app `klokka-api` with the built-in role "Logto Management API access": client credentials against
  `<issuer>/token` with `resource=https://default.logto.app/api`, `scope=all`. The API fetches the token lazily; an
  unreachable Logto is logged at startup and reported by `/q/health/well` and `/operator/health`, never fatal.
- Email connector with the `OrganizationInvitation` template. The API creates organization invitations with a
  `messagePayload.link` of `<KLOKKA_WEB_BASE_URL>/join?token=<token>`, so the template must render `{{link}}`;
  `{{organization.name}}` and `{{inviter.name}}` are available. Copy (sv + en) lives in `packages/core/i18n`
  (`email.invitation.*`); update the connector through `PATCH /api/connectors/jqol0o78ah62`.
- The webhook `eoeb31x3brwyfaeb5081x` ("klokka-api membership mirror", see Staging specifics above) posts to
  `/v1/webhooks/logto`. The API verifies `logto-signature-sha-256` (hex HMAC-SHA256 of the raw body with
  `KLOKKA_LOGTO_WEBHOOK_SIGNING_KEY`) and applies each `(hookId, event, createdAt)` once. `User.Created` and
  `User.Data.Updated` mirror email and name into `app_user` (the access token carries no email); `User.Deleted`
  deactivates the person's memberships, so add that event to the hook (`PATCH /api/hooks/eoeb31x3brwyfaeb5081x`,
  `events: ["User.Created", "User.Data.Updated", "User.Deleted"]`). Events the API does not act on answer 204.

### Database: migrations and roles (docs/INFRA.md section 5)

- Flyway runs at startup as `KLOKKA_DB_MIGRATE_USER` (`klokka_migrate`, the database owner); the app then uses
  `KLOKKA_DB_USER` (`klokka_runtime`, DML only through default privileges). Hibernate only validates the schema.
- Migrations: `apps/api/service/src/main/resources/db/migration/V1__schema.sql` (baseline) and
  `V2__ledgers_and_webhook_events.sql` (`email_log` becomes `email_send` with `membership_id` / `logto_user_id`,
  `webhook_event` idempotency table, `hour_entry_change.seq` identity). New tables get their grants from the
  default privileges set for `klokka_migrate`; nothing to grant by hand.
- Jobs (`quarkus-scheduler`, single node): push sweeper every minute, receipts every 15 minutes, weekly digest sweep
  every 15 minutes (sends Monday from 07:00 workspace time, once per user and ISO week through `digest_run`).
  Rows are claimed with `FOR UPDATE SKIP LOCKED`, batches are bounded (`klokka.push.batch-size`, `klokka.digest.batch-size`).

### Image and health

- Build: `JAVA_HOME=~/.sdkman/candidates/java/25.0.2-amzn mvn -f apps/api/pom.xml clean install` (runs the unit
  tests and the fast-jar integration test `HealthIT` against a Dev Services Postgres), then
  `docker build -t docker.nexus.coolify.ooguy.com/klokka-api:<tag> apps/api`.
- Readiness `GET /q/health/ready` (database only; the deploy script polls it externally, see Staging specifics),
  wellness `GET /q/health/well` (adds the Logto self-check), the contract at `GET /q/openapi`.
- `KLOKKA_BUILD_VERSION` should be `<pom version>-<short sha>` so the operator console shows what is running.

### Staging smoke (after a deploy)

All against staging, never production. Values in `.agents/local-credentials/`.

```sh
API=https://klokka-api.coolify.ooguy.com
curl -sf $API/q/health/ready | jq .status                 # UP
curl -sf $API/q/health/well | jq '.checks[] | select(.name=="logto")'   # UP with latencyMs
curl -s -o /dev/null -w '%{http_code}\n' $API/v1/me      # 401 without a token
curl -s $API/v1/invitations/inv_000000000000000000000000deadbeef | jq .code   # NOT_FOUND
# Webhook signature gate (401 INVALID_SIGNATURE with a wrong signature):
curl -s -X POST $API/v1/webhooks/logto -H 'content-type: application/json' -H 'logto-signature-sha-256: 00' \
  -d '{"hookId":"x","event":"User.Deleted","createdAt":"2026-09-27T14:07:00Z"}' | jq .code
```

With a real user token (sign in on the web app, or mint one with the mobile PKCE flow, `resource=https://api.klokka.app`):
`GET /v1/me` lists memberships; `POST /v1/workspaces` creates a Logto organization (check it in the admin console)
and the workspace; `POST /v1/workspaces/{id}/members` sends the invitation email through Logto (one email against the
quota; `GET /v1/operator/volume` with a `platform-admin` token shows the ledger). The opt-in test
`mvn -f apps/api/service/pom.xml -Dklokka.it.logto=true -Dtest=LogtoStagingTest test` proves the M2M credentials
against the real staging Logto (creates and deletes a throwaway organization).
