# Klokka API: deployment

What the API needs to run, where each value lives, what it expects to find in Logto and in the database, and
how to smoke-test a staging deploy. Staging only; production follows `~/.agents/production-deploys.md`. No
secret values here: they live in `.agents/local-credentials/` (gitignored) and in the Coolify app's env.

## 1. Environment variables (`KLOKKA_*`)

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
| `KLOKKA_PUSH_QUIET_WINDOW` | no | none | `PT10M` | "one notification per sitting" sliding window |
| `KLOKKA_PUSH_MAX_DELAY` | no | none | `PT30M` | cap on the sliding window |
| `KLOKKA_OPERATOR_API_URL` | no | Coolify | `https://klokka-api.coolify.ooguy.com` | probed by `/operator/health` as `api` |
| `KLOKKA_OPERATOR_LANDING_URL` | no | Coolify | `https://klokka.coolify.ooguy.com` | probed as `landing` |
| `KLOKKA_BUILD_VERSION` | no | CI | `0.1.0-<short sha>` | shown by `/operator/health` |
| `JAVA_OPTS` | no | Coolify | `-XX:MaxRAMPercentage=75` | already in the image's default |

"prod" = required with the `prod` profile (no default; a missing variable fails startup). Locally the dev and test
profiles use Dev Services for Postgres and mock the mailer. Older names from the first infrastructure pass
(`LOGTO_ISSUER`, `DB_URL`, `MAIL_HOST` and so on, docs/INFRA.md section 2) are not read by the API: rename them in
Coolify to the `KLOKKA_*` names above, do not keep both.

## 2. Logto objects the API expects (docs/INFRA.md section 4)

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
- **A webhook** (not created yet; create it once the API is deployed): `POST /api/hooks` with `name: klokka-api`,
  `events: ["User.Created", "User.Data.Updated", "User.Deleted"]`, `config.url: https://klokka-api.coolify.ooguy.com/v1/webhooks/logto`.
  Copy the hook's `signingKey` from the response into `KLOKKA_LOGTO_WEBHOOK_SIGNING_KEY`. The API verifies
  `logto-signature-sha-256` (hex HMAC-SHA256 of the raw body) and applies each `(hookId, event, createdAt)` once.
  `User.Created` / `User.Data.Updated` mirror email and name into `app_user` (the access token carries no email);
  `User.Deleted` deactivates the person's memberships.

## 3. Database: migrations and roles (docs/INFRA.md section 5)

- Flyway runs at startup as `KLOKKA_DB_MIGRATE_USER` (`klokka_migrate`, the database owner); the app then uses
  `KLOKKA_DB_USER` (`klokka_runtime`, DML only through default privileges). Hibernate only validates the schema.
- Migrations: `apps/api/service/src/main/resources/db/migration/V1__schema.sql` (baseline) and
  `V2__ledgers_and_webhook_events.sql` (`email_log` becomes `email_send` with `membership_id` / `logto_user_id`,
  `webhook_event` idempotency table, `hour_entry_change.seq` identity). New tables get their grants from the
  default privileges set for `klokka_migrate`; nothing to grant by hand.
- Jobs (`quarkus-scheduler`, single node): push sweeper every minute, receipts every 15 minutes, weekly digest sweep
  every 15 minutes (sends Monday from 07:00 workspace time, once per user and ISO week through `digest_run`).
  Rows are claimed with `FOR UPDATE SKIP LOCKED`, batches are bounded (`klokka.push.batch-size`, `klokka.digest.batch-size`).

## 4. Image and health

- Build: `JAVA_HOME=~/.sdkman/candidates/java/25.0.2-amzn mvn -f apps/api/pom.xml clean install` (runs the unit
  tests and the fast-jar integration test `HealthIT` against a Dev Services Postgres), then
  `docker build -t docker.nexus.coolify.ooguy.com/klokka-api:<tag> apps/api`.
- Readiness `GET /q/health/ready` (database only; Coolify's healthcheck), wellness `GET /q/health/well` (adds the
  Logto self-check), the contract at `GET /q/openapi`.
- `KLOKKA_BUILD_VERSION` should be `<pom version>-<short sha>` so the operator console shows what is running.

## 5. Staging smoke (after a deploy)

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
