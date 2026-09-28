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
  `KLOKKA_EXPO_ACCESS_TOKEN*`, `JAVA_OPTS` (`-XX:MaxRAMPercentage=70` plus the JBoss log manager flag the
  Dockerfile's default carries).
- `klokka-web` (`armlujpn5wkqd1d2nq0wkiiz`): `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET*`,
  `LOGTO_COOKIE_SECRET*` (generated, kept in `logto.json` as `applications.klokka-web.cookie_secret`),
  `LOGTO_BASE_URL`, `LOGTO_API_RESOURCE`, `KLOKKA_API_BASE_URL` (`http://klokka-api:8080/v1`, see below),
  `NEXT_PUBLIC_APP_URL`.
- `klokka-landing` (`0sbvfkrt1vvbofzkk5q8ndv6`): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`,
  `NEXT_PUBLIC_APK_URL` (also passed as build arguments, since Next.js inlines `NEXT_PUBLIC_*` at build time).

### Staging specifics

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
