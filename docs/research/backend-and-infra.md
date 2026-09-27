# Klokka: backend and infrastructure research

Status: research, 2026-09-27. Nothing implemented. Every fact below was checked today against the cited
source or reproduced in the scratchpad (`/tmp/.../scratchpad/backend/`); anything not checked is marked
**unverified**. No secrets appear in this document; env vars are named, never valued.

## Decisions (summary)

| # | Topic | Decision |
|---|---|---|
| 1 | Runtime | Quarkus on JDK 25, Maven. Start on platform `3.39.5` today, move to `3.40.x` LTS the week it ships (platform release 2026-09-30). Spring Boot 4.1 not needed: Quarkus is proven clean on 25 (section 1). |
| 2 | API contract | One `openapi.yaml`; `openapi-generator-maven-plugin` 7.25.0 with `jaxrs-spec` (`library=quarkus`, `interfaceOnly`) for the server and `typescript-fetch` for the single client package. Not the `quarkus-openapi-generator` extension. |
| 3 | Persistence | Hibernate ORM with Panache (repository pattern), Flyway SQL migrations, PostgreSQL 18 (already running on staging Coolify). |
| 4 | Auth | Logto (shared `default` tenant with Kulram on the staging instance). Workspaces = organizations; ONE API resource; workspace calls need an organization-scoped API token (`aud` = API resource, `organization_id` claim); roles enforced from `scope`. Operator = global role `platform-admin`. Invitations = Logto organization invitations sent by Logto's own email connector. Management API via an M2M app through `quarkus-oidc-client`. |
| 5 | Notifications | Expo Push HTTP API called from a Quarkus REST client (no Java SDK), coalescing done in our `notification` table by a `quarkus-scheduler` sweeper, `quarkus-mailer` over Migadu SMTP, opt-in weekly digest job, receipts checked by a second job. |
| 6 | Hosting | Fast-jar image on `eclipse-temurin:25-jre` (tax-agent pattern), images `docker.nexus.coolify.ooguy.com/klokka-{api,web,landing}`, Coolify `dockerimage` apps on staging, deployed by a local `release.sh` that builds, pushes an immutable tag and PATCHes `docker_registry_image_tag` + `instant_deploy`. |
| 7 | Local dev | Quarkus Dev Services (Postgres 18 container, zero config) for the API loop; `docker-compose` with Postgres + Mailpit for running all apps together; STAGING Logto for local auth with `http://localhost:3000/callback` registered. |
| 8 | Standards | The tax-agent rules carried over verbatim in spirit (section 8), plus `archunit-junit6` because Quarkus 3.31+ is on JUnit 6. |

## Brief corrections (things the brief or the task statement gets wrong)

1. **Logto staging URL.** `logto-oncwny07rglya015otcrv3pc.coolify.ooguy.com` is the Coolify container name and does
   not resolve (HTTP 000). The real FQDNs, read from the container's Caddy labels via `ssh testenv`:
   `https://logto-vgyjk5a0t98xjk8l0vphgyeh.coolify.ooguy.com` (issuer `.../oidc`) and the admin console
   `https://logto-admin-vgyjk5a0t98xjk8l0vphgyeh.coolify.ooguy.com`. Version running: **Logto 1.41.0**
   (`/etc/logto/package.json` in the container, image `svhd/logto:latest` built 2026-06-30); latest release is
   1.43.0 (2026-08-31) per https://github.com/logto-io/logto/releases. Upgrading is the owner's call, not ours.
2. **"A second Logto tenant" is impossible on OSS.** Multi-tenant console is Cloud-only; the OSS Management API
   resource is literally `https://default.logto.app/api` (https://docs.logto.io/logto-oss,
   https://docs.logto.io/integrate-logto/interact-with-management-api). Klokka shares the `default` tenant with
   Kulram: its own apps, API resource and organization roles, but a **shared sign-in experience, shared
   organization template and one shared email connector** (section 4h).
3. **Data model** (section 3): `push_token` must be keyed by the token, not the user; entries need soft delete so
   history and notifications survive a "removed" entry; a per-user preferences table is missing; every child
   table must carry `workspace_id` with a composite FK so isolation is DB-enforced; `month_lock` needs an
   unlock history; a `digest_run` table makes the weekly job idempotent.
4. **Invitations cost two emails, not one.** Logto sends the invitation, then the invitee's sign-up with an email
   identifier sends a verification code email (**unverified** in the staging console; it is the documented
   default). Budget 2 emails per invitee against the ~100/month staging quota.
5. **Postgres.** A `postgres:18-alpine` (PostgreSQL 18.6, 512m) already runs on staging in Coolify project
   "Common Resources" (uuid `k10e48k41urcbb1erev0vhmu`). Recommendation: a `klokka` database with two roles on
   it, not a fourth Postgres container (owner's call; the brief says "+ a Postgres").
6. **Migadu port.** Migadu's own guide lists `smtp.migadu.com` port 465 with TLS
   (https://www.migadu.com/guides/, generic settings). 587/STARTTLS is what tax-agent defaults to and what
   third parties document, but it is not on Migadu's page: **unverified officially**. Section 5 supports both.
7. **The Coolify "nexus" app is a stale record.** It shows `exited:unhealthy`, `container_present: false`, last
   online 2026-09-11, image `sonatype/nexus3:3.84.0`, yet `https://docker.nexus.coolify.ooguy.com/v2/` answers
   `401` with `Server: Nexus/3.84.0-03 (COMMUNITY)`, `docker manifest inspect .../kulram-web:latest` succeeds
   from this dev host with its stored credentials, and the same hostname resolved to the staging server's IP
   returns 503 from staging Traefik. So Nexus 3.84.0 is alive on some other machine behind the same public IP.
   Pushes work; where it physically runs is an open question for the owner.
8. **Quarkus 3.40 LTS is not on Maven Central yet** (latest platform BOM `3.39.5`, `3.40.0.CR1` from
   2026-09-23; core final 2026-09-23, platform + announcement 2026-09-30 per
   https://github.com/quarkusio/quarkus/wiki/Release-Planning). Quarkus 4.0 (Nov 2026) needs Java 21+, moves to
   Jackson 3, Vert.x 5 (https://github.com/quarkusio/quarkus/wiki/Migration-Guide-4.0). Plan: 3.40 LTS for v1,
   migrate to 4.3 LTS (planned 2027-03-31) as a ticket.

## 1. Quarkus on JDK 25 (proof)

Facts: Quarkus 3.31 (2026-01-28) "adds full support for Java 25, including Java 25 runtime images"
(https://quarkus.io/blog/quarkus-3-31-released/); JUnit 6 and Testcontainers 2 came with it. LTS streams are
supported 12 months (https://quarkus.io/blog/lts-releases/); 3.33 LTS ends 2027-03-25
(https://endoflife.date/quarkus-framework); 3.40 LTS lands 2026-09-30.

Reproduction on this host (`JAVA_HOME=~/.sdkman/candidates/java/25.0.2-amzn`, Maven 3.9.9, Docker 29.8.1):

| Step | Command | Result |
|---|---|---|
| Create | `mvn io.quarkus.platform:quarkus-maven-plugin:3.39.5:create -DjavaVersion=25 -Dextensions=rest-jackson,hibernate-orm-panache,jdbc-postgresql,flyway,oidc,oidc-client,mailer,smallrye-openapi,smallrye-health,scheduler` | exit 0, 17.9 s; pom has `maven.compiler.release=25` |
| Package | `mvn -q package -DskipTests` | **exit 0, 20.5 s wall** (first run), 4 to 8 s warm; `target/quarkus-app` fast-jar, 48 MB |
| Test | `mvn test -Dquarkus.http.test-port=0` | **BUILD SUCCESS, 1 test, 1:16 min**; Dev Services started `postgres:18` (Testcontainers 2.0.5, 4 s) and Keycloak 26.7.4 (33 s, because `quarkus-oidc` had no config); app booted in 49 s |

Two host quirks, neither a JDK 25 problem: (a) the first test run failed with `Port already bound: 8081`, the
Quarkus test port, which a VS Code server occupies on this host, hence `-Dquarkus.http.test-port=0` (put
`%test.quarkus.http.test-port=0` in `application.properties`); (b) the tax-agent `-Dapi.version=1.43`
Testcontainers quirk was **not needed**: Testcontainers 2.0.5 talked to the daemon (API 1.56) directly. tax-agent
is on the same Testcontainers 2.0.5 (Boot 4.1 BOM), so that note may be stale; keep the flag documented as a
fallback only. JDK 25 prints `sun.misc.Unsafe` warnings from Maven's own Guava, not from Quarkus.

BOM 3.39.5 versions: Hibernate ORM 7.4.9, Flyway 12.0.0, PostgreSQL JDBC 42.7.13, Testcontainers 2.0.5,
JUnit 6.1.3, SmallRye JWT 4.6.4, Jackson 2.22.2, Liquibase 4.33.0.

**Decision:** Quarkus. Spring Boot 4.1 stays the documented fallback only; nothing failed that would trigger it.

## 2. OpenAPI-first in Quarkus

Reproduced in the same scratch project with `openapi-generator-maven-plugin` **7.25.0** (latest on Central;
tax-agent pins 7.23.0) and a two-path spec (`/workspaces/{workspaceId}/entries` GET + PUT):

| Execution | Generator | configOptions that mattered | Output |
|---|---|---|---|
| `gen-server` | `jaxrs-spec` | `library=quarkus`, `interfaceOnly=true`, `useJakartaEe=true`, `useBeanValidation=true`, `dateLibrary=java8`, `openApiNullable=false`, `useTags=true`, `generatePom=false`, `sourceFolder=src/gen/java` | `EntriesApi` interface with `@Path`, `@GET/@PUT`, `@Produces`, `@PathParam/@QueryParam`, `@Valid @NotNull`, `@ResponseStatus` (RESTEasy Reactive); models `HourEntry`, `UpsertEntryRequest` with `UUID`, `LocalDate`, `@JsonProperty(required=true)` |
| `gen-ts` | `typescript-fetch` | `supportsES6`, `typescriptThreePlus`, `useOneOfDiscriminatorLookup`, `withoutRuntimeChecks=false` (tax-agent's exact set) | `apis/EntriesApi.ts`, `models/*.ts`, `runtime.ts`, zero runtime deps |

A hand-written `EntriesResource implements EntriesApi` compiled and landed in the fast-jar (`exit 0`, 8 s).
Two gotchas found: the generated code imports `jakarta.validation`, so the project needs
`io.quarkus:quarkus-hibernate-validator`; and `sourceFolder` must be set explicitly or the plugin registers
`src/main/java` under the output dir while `jaxrs-spec` writes to `src/gen/java` (compile fails with "cannot
find symbol"). `useMicroProfileOpenAPIAnnotations=true` emitted no `@Operation` annotations for a spec without
descriptions; treat the option as cosmetic. Option reference:
https://openapi-generator.tech/docs/generators/jaxrs-spec/.

`quarkus-openapi-generator-server` (Quarkiverse) generates Jakarta REST interfaces from `src/main/resources/openapi`
via `quarkus.openapi.generator.server.*` properties, but its docs list no per-operation or type overrides and it
does not produce the TypeScript client (https://docs.quarkiverse.io/quarkus-openapi-generator/dev/server.html).
Two generators from one plugin in one `generate-sources` phase is what tax-agent already runs; mirror it.

Layout: `apps/api/src/main/openapi/openapi.yaml` (one self-contained file, tax-agent's rule: the 3-file split
broke `$ref`s), server code into `target/generated-sources/openapi` (never committed), TS client into
`packages/api-client/src` (gitignored, regenerated by every `mvn` build).

**Decision:** `openapi-generator-maven-plugin` 7.25.0 with `jaxrs-spec` + `typescript-fetch`, config as in the
table, plus `quarkus-hibernate-validator`.

## 3. Persistence

| Option | For Klokka | Against |
|---|---|---|
| Hibernate ORM + Panache (repository pattern) | Small schema (10 tables), simple CRUD by workspace, `PanacheRepository` gives `find/list/persist` and paging, Dev Services set `drop-and-create` only for the dev DB; entities double as the audit/history shape | Lazy loading and dirty checking must be respected; N+1 on the week grid needs explicit `join fetch` |
| Plain JDBC (Quarkus `agroal` + hand SQL, tax-agent's `JdbcClient` style) | Total control, no ORM surprises, easy fail-fast mapping | Every read model hand-mapped; tax-agent needed it for LISTEN/NOTIFY and pgvector, Klokka needs neither |

Quarkus guide: active record or repository, `@Transactional` required for writes, and "in production, you
should rely on Flyway or Liquibase" (https://quarkus.io/guides/hibernate-orm-panache). Use the repository
pattern (entities stay plain, repositories are the only DB entry point and are all workspace-scoped).

Migrations: Flyway (`quarkus-flyway`, `quarkus.flyway.migrate-at-start=true`, `db/migration/V1__*.sql`,
separate `quarkus.flyway.username/password` for a migrate role; https://quarkus.io/guides/flyway) over
Liquibase (`quarkus-liquibase`, XML/YAML/JSON/SQL changelog; https://quarkus.io/guides/liquibase). Plain SQL
files are easier to review for a schema this size; Flyway 12.0.0 lists PostgreSQL 18 as verified
(https://documentation.red-gate.com/flyway/reference/database-driver-reference/postgresql-database). Two DB
roles as in tax-agent: `klokka_migrate` (owns DDL, used only by Flyway) and `klokka_app` (DML only).

PostgreSQL 18: confirmed on staging (`postgres:18-alpine`, `SELECT version()` = 18.6, Coolify DB
`k10e48k41urcbb1erev0vhmu`, 512m) and Quarkus Dev Services default to `postgres:18`
(https://quarkus.io/guides/databases-dev-services).

Data model, corrected (types PostgreSQL; every table below `workspace` carries `workspace_id` and a composite
FK `(workspace_id, membership_id) -> membership(workspace_id, id)` so cross-workspace rows are impossible):

```
app_user          logto_user_id PK, locale, push_enabled bool, digest_enabled bool, created_at, last_seen_at
workspace         id PK, name, slug UNIQUE, logto_org_id UNIQUE, currency char(3), timezone, week_start,
                  show_pay bool, rounding enum(NONE,QUARTER,HALF), default_day_hours numeric(4,2),
                  colour, emoji, created_at
membership        id PK, workspace_id FK, logto_user_id NULL (set on accept), role enum(EMPLOYER,EMPLOYEE),
                  display_name, email citext, hourly_rate numeric(10,2) NULL, status enum(INVITED,ACTIVE,
                  DEACTIVATED), logto_invitation_id, invited_at, joined_at, avatar
                  UNIQUE(workspace_id, id); UNIQUE(workspace_id, email); UNIQUE(workspace_id, logto_user_id)
hour_entry        id PK, workspace_id, membership_id, work_date date, hours numeric(5,2) CHECK (0 < hours
                  AND hours <= 24), note, created_by, created_at, updated_at, deleted_at NULL
                  UNIQUE(membership_id, work_date) WHERE deleted_at IS NULL
hour_entry_change id PK, workspace_id, entry_id FK, kind enum(CREATED,UPDATED,DELETED), hours_before,
                  hours_after, note_before, note_after, changed_by, changed_at
entry_flag        id PK, workspace_id, entry_id, raised_by, message, status enum(OPEN,FIXED,DISMISSED),
                  resolution_note, resolved_by, resolved_at, created_at   UNIQUE(entry_id) WHERE status='OPEN'
month_lock        id PK, workspace_id, year_month date (first day), locked_by, locked_at, unlocked_by,
                  unlocked_at NULL          UNIQUE(workspace_id, year_month) WHERE unlocked_at IS NULL
notification      id PK, logto_user_id, workspace_id, kind, payload jsonb, coalesce_key, created_at,
                  updated_at, read_at NULL, push_due_at, pushed_at NULL
push_token        expo_push_token PK, logto_user_id, platform, created_at, last_seen_at, disabled_at NULL
push_delivery     ticket_id PK, notification_id, expo_push_token, status, error_code, receipt_checked_at
digest_run        logto_user_id, iso_week char(8), sent_at       PK(logto_user_id, iso_week)
```

Why: `push_token` keyed by token because a phone can change user (tokens are per device install);
`deleted_at` because "hours removed" must still notify and keep history; `app_user` holds the per-user
preferences the brief lists (push on/off, digest on/off) which are not per workspace; `coalesce_key` +
`push_due_at` implement "one notification per sitting" (section 5); `digest_run` makes the weekly job
idempotent. `work_date` is a plain date in the workspace timezone (no instants stored, no DST arithmetic).

**Decision:** Hibernate ORM with Panache repositories + Flyway SQL + PostgreSQL 18 on the existing staging
Common Resources instance (own database, two roles).

## 4. Logto

Discovery from the staging issuer (`/oidc/.well-known/openid-configuration`, fetched today): issuer
`https://logto-vgyjk5a0t98xjk8l0vphgyeh.coolify.ooguy.com/oidc`, JWKS `/oidc/jwks` with ONE key
`EC P-384 ES384 sig`, `id_token_signing_alg_values_supported=[ES384]`, PKCE `S256` only, grants include
`authorization_code`, `refresh_token`, `client_credentials`; scopes include `urn:logto:scope:organizations`,
`urn:logto:scope:organization_roles`; claims include `organizations`, `organization_data`, `organization_roles`.

### 4a. Organizations as workspaces

- The organization template (permissions + roles) is tenant-wide: "Every organization uses the same template"
  (https://docs.logto.io/authorization/organization-permissions). Klokka defines organization-level **API**
  permissions on its API resource and bundles them into two organization roles, `employer` and `employee`;
  Kulram uses no organizations, so the template is effectively Klokka's, but name scopes with a `klokka:`
  prefix anyway.
- Two token kinds exist. (1) Organization token: `resource` omitted, `organization_id` set, `aud =
  urn:logto:organization:{id}`, `scope` = organization (non-API) permissions; meant for app-internal checks.
  (2) Organization-scoped API resource token: token endpoint with `grant_type=refresh_token`,
  `resource=<API indicator>`, `organization_id=<org>`, scope includes `urn:logto:scope:organizations`; JWT with
  `aud = <API indicator>`, `organization_id`, `scope` filtered to that user's organization roles
  (https://docs.logto.io/authorization/organization-level-api-resources,
  https://docs.logto.io/authorization/validate-access-tokens). **Klokka uses (2) for every
  `/v1/workspaces/{workspaceId}/**` call** and a plain API-resource token (no `organization_id`) for
  user-level calls (`/v1/me/**`, invitation accept, push-token registration) and operator calls.
- `organization_roles` is an ID token / userinfo claim in the form `<org_id>:<role>`
  (https://docs.logto.io/end-user-flows/organization-experience/get-user-info); it is NOT in the access token,
  so the API authorizes on `scope`, never on role names. `membership.role` mirrors the role for display and DB
  constraints.
- Clients: mobile keeps tax-agent's `resource=` on authorize, exchange and refresh (`mobile/src/auth/
  oidcRequests.ts`) and adds `organization_id` on the refresh that mints a workspace token; the Next.js SDK
  has `getAccessToken(config, resource)` and `getOrganizationToken(config, orgId)`
  (https://docs.logto.io/quick-starts/next-app-router); whether `getAccessToken` takes an `organizationId`
  argument in `@logto/next` is for the frontend research to confirm (**unverified**).

### 4b. Validating Logto JWTs in `quarkus-oidc` bearer mode, reading the workspace

```
quarkus.oidc.auth-server-url=${LOGTO_ISSUER}            # https://<logto>/oidc ; discovery appends the well-known path
quarkus.oidc.application-type=service
quarkus.oidc.token.audience=${KLOKKA_API_RESOURCE}       # the API resource indicator, exact string match
quarkus.oidc.token.signature-algorithm=es384              # optional pin; Logto signs ES384 (JWKS above)
quarkus.oidc.token.allow-opaque-token-introspection=false # a token without resource= is opaque: reject, do not introspect
quarkus.oidc.token.allow-jwt-introspection=false
quarkus.oidc.roles.role-claim-path=scope                  # space separated by default -> @RolesAllowed("klokka:hours:write")
quarkus.keycloak.devservices.enabled=false
```
Property names and defaults: https://quarkus.io/guides/security-oidc-configuration-properties-reference and
https://quarkus.io/guides/security-oidc-bearer-token-authentication (keys resolved by `kid` from JWKS,
refreshed at most every `quarkus.oidc.token.forced-jwk-refresh-interval`). Workspace check: a
`ContainerRequestFilter` on `/v1/workspaces/{workspaceId}` loads the workspace, compares
`jwt.getClaim("organization_id")` (inject `JsonWebToken`) with `workspace.logto_org_id`, then confirms an
ACTIVE `membership` row for `sub`; any mismatch is 403 with a typed problem code. Token says org, DB says
member, constraints say rows: three layers, as in tax-agent's account isolation rule.
Testing: `quarkus-test-oidc-server` (`OidcWiremockTestResource`, tokens via `Jwt.claims(...).sign()`) for
`@QuarkusTest`, `quarkus-test-security-oidc` (`@TestSecurity` + `@OidcSecurity`) for unit-level tests.

### 4c. Inviting employees

| Path | Mechanism | Invitee experience | Emails |
|---|---|---|---|
| **Logto organization invitation** (chosen) | `POST /api/organization-invitations` {`organizationId`, `invitee` (email), `inviterId`, `expiresAt` (epoch ms), `organizationRoleIds` [employee], `messagePayload` {`link`}}; Logto sends the `OrganizationInvitation` template through the tenant's email connector; statuses `Pending/Accepted/Expired/Revoked`; resend via `POST /api/organization-invitations/{id}/message`; accept via `PUT /api/organization-invitations/{id}/status` {`status: Accepted`, `acceptedUserId`} which adds the user to the organization with the roles (https://openapi.logto.io/operation/operation-createorganizationinvitation, https://openapi.logto.io/operation/operation-replaceorganizationinvitationstatus) | Email "<Employer> invited you" with `link` = `https://app.example.com/invite/{invitationId}`; page shows workspace + inviter, sends to Logto sign-in with `first_screen=register`, `login_hint=<email>`; back in the app, `POST /v1/invitations/{id}/accept` (user token) makes the API call the status endpoint as M2M, flips `membership` to ACTIVE, notifies the employer | 1 invitation + 1 sign-up verification code |
| Own user + own email | Create user via Management API, add to org, send our own email | We own the copy fully | 1 + password-set flow we must build |
| One-time token (magic link) | `POST /api/one-time-tokens` {`email`, `expiresIn`, `context.jitOrganizationIds`}; link carries `one_time_token` + `login_hint`; user auto-joins the organization with its JIT default roles (https://docs.logto.io/end-user-flows/one-time-token) | Click, land signed in, set password if the sign-in experience requires one | 1 (the token verifies the email) |

Logto does not check that the accepting user's email equals `invitee` (the openapi page states no such rule),
so the API must compare `jwt.email` with `membership.email` before accepting. Magic links save one email per
invitee and are worth a follow-up ticket once JIT role defaults per organization are set by the API at
workspace creation (`/api/organizations/{id}/jit/roles`, **unverified** path).

### 4d. Management API from Quarkus (M2M)

M2M app with the built-in role "Logto Management API access"; `client_credentials` against `<logto>/oidc/token`
with `resource=https://default.logto.app/api` (OSS indicator) and `scope=all`
(https://docs.logto.io/integrate-logto/interact-with-management-api). In Quarkus:
```
quarkus.oidc-client.auth-server-url=${LOGTO_ISSUER}
quarkus.oidc-client.client-id=${LOGTO_M2M_CLIENT_ID}
quarkus.oidc-client.credentials.secret=${LOGTO_M2M_CLIENT_SECRET}
quarkus.oidc-client.grant.type=client
quarkus.oidc-client.grant-options.client.resource=https://default.logto.app/api
quarkus.oidc-client.grant-options.client.scope=all
quarkus.rest-client.logto.url=${LOGTO_ENDPOINT}/api
```
and a `@RegisterRestClient(configKey="logto") @OidcClientFilter` interface (`quarkus-rest-client-jackson` +
`quarkus-rest-client-oidc-filter`; https://quarkus.io/guides/security-openid-connect-client-reference,
https://quarkus.io/guides/rest-client). Endpoints used: `POST /api/organizations`, `POST
/api/organizations/{id}/users`, `PUT /api/organizations/{id}/users/{userId}/roles`, `DELETE
/api/organizations/{id}/users/{userId}`, the invitation endpoints above
(https://openapi.logto.io/group/endpoint-organizations).

### 4e. Global operator role vs organization roles

`platform-admin` is a Logto **global user role** carrying the API-resource permission `klokka:platform:admin`
(https://docs.logto.io/authorization/role-based-access-control). A plain API-resource token for an operator
carries it in `scope`; `/v1/admin/**` is `@RolesAllowed("klokka:platform:admin")`. Organization roles never
grant it, and the operator endpoints only return aggregates (brief's rule). Enforcement stack: quarkus-oidc
(signature, `iss`, `aud`, `exp`) -> `scope` roles -> workspace filter (`organization_id` = path workspace) ->
repository scoping -> composite FKs.

### 4f. The opaque-token trap

"During the authentication process, if no resource is specified, Logto will issue an opaque access token
instead of a JWT" (https://docs.logto.io/concepts/opaque-token); a Default API resource can be set so tokens
"default to this audience when no resource parameter is specified" (https://docs.logto.io/authorization/
api-resources). Kulram's tenant has Default API off, so `resource=` rides every authorize, exchange and refresh
(tax-agent KUL-119 finding, pinned by tests). Same rule for Klokka, and the API refuses introspection (4b) so an
opaque token fails fast with 401 instead of a silent round trip.

### 4g. Email connector

One email connector per tenant (https://docs.logto.io/connectors/email-connectors), so Klokka and Kulram share
the SMTP connector and its templates. SMTP connector fields: `host`, `port`, `fromEmail`, `user`, `pass`,
`templates[]{usageType, subject, content, contentType}` (https://docs.logto.io/integrations/smtp); usage types
include `SignIn`, `Register`, `ForgotPassword`, `OrganizationInvitation`, `Generic`, and templates can use
`{{application.name}}`, `{{organization.name}}`, `{{inviter.name}}`, `{{link}}`
(https://docs.logto.io/connectors/email-connectors/email-templates), so shared code emails can still say
"Klokka" when the Klokka app triggered them. Everything Logto sends comes out of the same Migadu mailbox as
Klokka's digests, so it counts against the same ~100/month staging allowance.

### 4h. What Klokka needs on the shared staging tenant

| Object | Settings |
|---|---|
| App `klokka-web` (Traditional web) | redirect `http://localhost:3000/callback`, `https://klokka-web.coolify.ooguy.com/callback`; post sign-out `http://localhost:3000/`, `https://klokka-web.coolify.ooguy.com/`; refresh tokens on |
| App `klokka-mobile` (Native, PKCE, no secret) | redirect `klokka://auth/callback` (tax-agent proved `kulram://` end to end) |
| App `klokka-api-m2m` (M2M) | role "Logto Management API access" |
| API resource | indicator `https://api.klokka.example` (placeholder; a stable URN-like value is better than a domain that will change); permissions `klokka:workspace:read`, `klokka:hours:read:self`, `klokka:hours:write`, `klokka:members:manage`, `klokka:pay:manage`, `klokka:month:close`, `klokka:flags:raise`, `klokka:flags:resolve`, `klokka:platform:admin` |
| Organization template | roles `employer` (all workspace scopes) and `employee` (`workspace:read`, `hours:read:self`, `flags:raise`) |
| Global role | `platform-admin` with `klokka:platform:admin` |
| Branding | app-level sign-in experience for the two Klokka apps so users do not see Kulram's branding; precedence organization > app > omni (https://docs.logto.io/customization/match-your-brand); OSS availability **unverified** until checked in the console |

**Decision:** Logto organizations with ONE API resource and organization-scoped API tokens; Logto invitations
sent by Logto; M2M through `quarkus-oidc-client`; global `platform-admin`.

## 5. Notifications (server side)

Expo Push HTTP API (https://docs.expo.dev/push-notifications/sending-notifications/): `POST
https://exp.host/--/api/v2/push/send`, JSON array of up to **100** messages, headers `accept: application/json`,
`content-type: application/json`, gzip accepted, **600 notifications/s per project**, payload <= 4 KiB; fields
`to`, `title`, `body`, `data`, `sound`, `badge`, `channelId`, `priority`, `ttl`, `expiration`, `collapseId`;
response = tickets with `id`. Receipts: `POST https://exp.host/--/api/v2/push/getReceipts` {`ids`}; error codes
`DeviceNotRegistered` (stop sending to that token), `MessageTooBig`, `MessageRateExceeded`,
`MismatchSenderId`, `InvalidCredentials`. `Authorization: Bearer <EXPO_ACCESS_TOKEN>` is optional unless
"enhanced push security" is on (turn it on; the token is an env var). The service is free
(https://docs.expo.dev/push-notifications/faq/). Java SDK: `io.github.jav:expo-server-sdk` is 1.1.0 from 2020
on Central; use a `@RegisterRestClient(configKey="expo")` interface with `quarkus-rest-client-jackson` instead.
Android needs FCM V1: Firebase project, `google-services.json` in the app, service-account key uploaded with
`eas credentials` (mobile side; https://docs.expo.dev/push-notifications/fcm-credentials/). The server stores
tokens from `getExpoPushTokenAsync({projectId})` via `PUT /v1/me/push-tokens`.

Coalescing ("one notification per sitting"): the first hours change for (recipient, workspace, actor, kind
`HOURS_CHANGED`) inserts a `notification` row with `coalesce_key`, `payload` {days, hoursDelta}, `push_due_at =
now + 10 min`; further changes within the window update the same row (`updated_at`, payload, `push_due_at`
sliding, capped at `created_at + 30 min` so a long session still notifies). In-app it is visible at once. A
`@Scheduled(every = "1m", identity = "push-sweeper", concurrentExecution = SKIP)` job selects rows with
`push_due_at <= now AND pushed_at IS NULL` (`SELECT ... FOR UPDATE SKIP LOCKED`), batches 100 per Expo call,
writes `push_delivery` tickets, sets `pushed_at`. A second job `every = "15m"` fetches receipts for tickets
older than 15 min and sets `push_token.disabled_at` on `DeviceNotRegistered`. Scheduler facts (`every`, `cron`,
`identity`, `concurrentExecution`, `quarkus.scheduler.enabled=false` in tests, single node; use `quarkus-quartz`
only if the API is ever scaled to two replicas): https://quarkus.io/guides/scheduler-reference.

Email: `quarkus-mailer` with `quarkus.mailer.host=smtp.migadu.com`, `quarkus.mailer.from`, `username`,
`password` from Coolify env, and either `port=587` + `start-tls=REQUIRED` (tax-agent's defaults) or `port=465` +
`tls=true` (Migadu's documented setting); `quarkus.mailer.mock=true` is the dev/test default so nothing leaves
the machine (https://quarkus.io/guides/mailer-reference). Weekly digest: `@Scheduled(every = "1h")` job that
picks users with `digest_enabled` whose workspace-local time is Monday 07:00 and no `digest_run` row for the ISO
week (unique key = idempotent, one email per user per week, only when there is something to report).

**Decision:** Expo HTTP API via Quarkus REST client, DB-backed coalescing with a 10 min quiet window and 30 min
cap, `quarkus-scheduler` jobs, `quarkus-mailer` on Migadu.

## 6. Docker, Nexus, Coolify staging, manual release path

Registry: `docker.nexus.coolify.ooguy.com` answers `HTTP 401` with `Server: Nexus/3.84.0-03 (COMMUNITY)` and
`docker manifest inspect docker.nexus.coolify.ooguy.com/kulram-web:latest` succeeds from this host with the
credentials already in `~/.docker/config.json` (key present, values not read). See correction 7 for the stale
Coolify record. Staging Coolify is `coollabsio/coolify:4.3.23`, one server `bravo-se` (192.168.0.20).

`kulram-web` (`xvlgpv6ezoj3prbwhjsn4jti`) is the template: `build_pack=dockerimage`, image
`docker.nexus.coolify.ooguy.com/kulram-web:latest`, `ports_exposes=3000`, HTTP health `GET /` on 3000 every 30 s
(3 retries, 15 s start), `custom_docker_run_options=--init`, `limits_memory=512m`, `limits_cpus=1`, force HTTPS.

Dockerfile for the API (fast-jar layout from the generated `src/main/docker/Dockerfile.jvm`: `lib/`, `*.jar`,
`app/`, `quarkus/`, run `quarkus-run.jar`; base image swapped to tax-agent's; `eclipse-temurin:25-jre` exists on
Docker Hub, updated 2026-09-25):
```
FROM eclipse-temurin:25-jre
RUN useradd --system --uid 1001 klokka
WORKDIR /app
COPY --chown=1001 apps/api/target/quarkus-app/lib/ lib/
COPY --chown=1001 apps/api/target/quarkus-app/*.jar ./
COPY --chown=1001 apps/api/target/quarkus-app/app/ app/
COPY --chown=1001 apps/api/target/quarkus-app/quarkus/ quarkus/
USER klokka
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dquarkus.http.host=0.0.0.0 -jar quarkus-run.jar"]
```

| Coolify app | Image | Port | Health path | Memory |
|---|---|---|---|---|
| `klokka-api` (`klokka-api.coolify.ooguy.com`) | `.../klokka-api` | 8080 | `/q/health/ready` (`quarkus-smallrye-health`; `/q/health/live`, `/started` also exist, datasource readiness is automatic; https://quarkus.io/guides/smallrye-health) | 512m, `--init` |
| `klokka-web` (`klokka-web.coolify.ooguy.com`) | `.../klokka-web` | 3000 | `/` | 512m, `--init` |
| `klokka-landing` (`klokka-landing.coolify.ooguy.com`) | `.../klokka-landing` | 3000 | `/` | 256m, `--init` |

Env inventory (names only; secrets live only in Coolify, `.env` files are untracked). API: `DB_URL`,
`DB_APP_USER`, `DB_APP_PASSWORD`, `DB_MIGRATE_USER`, `DB_MIGRATE_PASSWORD`, `LOGTO_ISSUER`, `LOGTO_ENDPOINT`,
`KLOKKA_API_RESOURCE`, `LOGTO_M2M_CLIENT_ID`, `LOGTO_M2M_CLIENT_SECRET`, `EXPO_ACCESS_TOKEN`, `MAIL_HOST`,
`MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `KLOKKA_WEB_BASE_URL` (invite links),
`KLOKKA_PUSH_QUIET_MINUTES`, `JAVA_OPTS`. Web: `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET`,
`LOGTO_COOKIE_SECRET`, `LOGTO_BASE_URL`, `KLOKKA_API_RESOURCE`, `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`.
Landing: `NEXT_PUBLIC_APP_URL`.

No-CI release path, `release.sh staging` (later `release.sh version|patch|minor|major` for production per
`~/.agents/production-deploys.md`, same script, different target): refuse a dirty tree; `mvn -q package
-DskipTests` (JDK 25) + `npm run build` per app; `docker build` three images tagged `:<version>-<shortsha>` AND
`:staging`; `docker push` both tags; for each app `PATCH https://coolify.coolify.ooguy.com/api/v1/applications/
{uuid}` with `{"docker_registry_image_tag": "<version>-<shortsha>", "instant_deploy": true}` (fields documented at
https://coolify.io/docs/api-reference/api/operations/update-application-by-uuid), read the body: `{"uuid"}` =
queued, a `message` = skipped, report it; then poll `/q/health/ready` on the FQDN (bounded, 30 tries, 5 s). The
webhook alternative `POST /api/v1/deploy?uuid=<uuid>` (POST since 4.3, `GET` is 405;
https://coolify.io/docs/api-reference/api/operations/deploy-by-tag-or-uuid) redeploys the pinned tag and cannot
carry a version, so PATCH is the primary path and the immutable tag is what Coolify shows as running. Tokens:
a staging write-scoped `COOLIFY_TOKEN` in the shell env, never in the repo. Rollback = the same PATCH with the
previous tag. Flyway is forward-only; roll forward for schema issues.

**Decision:** temurin fast-jar image, three `dockerimage` apps with the kulram-web limits, `release.sh` doing
build + push immutable tag + PATCH with `instant_deploy`, health on `/q/health/ready`.

## 7. Local development

- API loop: `quarkus dev` with Dev Services: Postgres 18 container auto-started when `quarkus.datasource.jdbc.url`
  is unset (`quarkus.datasource.devservices.reuse=true` default, needs `testcontainers.reuse.enable=true` in
  `~/.testcontainers.properties`; https://quarkus.io/guides/databases-dev-services), Flyway runs against it,
  mailer in mock mode. Set `quarkus.keycloak.devservices.enabled=false` (it added 33 s and a Keycloak container
  in the proof run) because auth points at staging Logto in every profile.
- Whole stack: `docker-compose.yml` at the repo root with `postgres:18-alpine` (5432, named volume) and
  `axllent/mailpit` (SMTP 1025, UI 8025; image on Docker Hub, updated 2026-09-27) for when the API runs as a
  jar next to web/landing/mobile; `%dev.quarkus.mailer.mock=false` + host `localhost:1025` to see real HTML.
  The Quarkiverse `io.quarkiverse.mailpit:quarkus-mailpit` extension can start Mailpit as a Dev Service and
  exposes `@InjectMailbox` for tests (https://docs.quarkiverse.io/quarkus-mailpit/dev/index.html); optional.
- Auth: the STAGING Logto for local sign-in (tax-agent's decision). The Next.js quick start registers exactly
  `http://localhost:3000/callback` and `http://localhost:3000/` as post sign-out
  (https://docs.logto.io/quick-starts/next-app-router), and redirect URIs accept wildcards
  (https://docs.logto.io/integrate-logto/application-data-structure), so localhost works without a tunnel. The
  API validates against the public JWKS (no secret); the M2M secret is needed locally only to exercise
  invitations and lives in an untracked `.env`. Native uses `klokka://auth/callback`; Metro on the LAN as Kulram.

**Decision:** Dev Services for the API, compose (Postgres + Mailpit) for the full stack, staging Logto.

## 8. Coding standards to carry into Klokka's AGENTS.md (distilled from tax-agent)

1. Java 25, static imports, single-line signatures, Lombok (`@RequiredArgsConstructor`), no Javadoc, no FQCN.
2. Boundaries fail fast: malformed input at parse/config/API edges throws a typed exception naming the field;
   absent may default, present-but-wrong never; no fallbacks, no silent degradation.
3. One exception taxonomy: every exception reaching REST carries a `ProblemCode`, rendered by one
   `ExceptionMapper`; narrow catches only, causes preserved.
4. Parse once, type strictly: `UUID`, `LocalDate`, `YearMonth`, enums, records, sealed interfaces.
5. No magic literals: quiet windows, caps, batch sizes, retry limits in `application.properties` via
   `@ConfigMapping` with validation; misconfiguration fails startup. Clock injected, UTC, `Clock` in tests.
6. Workspace isolation in app AND DB: every repository method takes `workspaceId`; child tables carry
   `workspace_id` with composite FKs; the request filter matches `organization_id` to the path.
7. Idempotent writes: `PUT` entry keyed by `(membership_id, work_date)`, invitation accept and month lock are
   repeat-safe, jobs keyed by unique rows (`digest_run`, `push_delivery`).
8. Robust loops: scheduler jobs isolate per-row failures, bounded batches, `SKIP_LOCKED`, never a silent death.
9. OpenAPI-first, absolute: no hand-rolled DTO or client on either side; spec change first.
10. Tests can fail: exact assertions (`containsExactly`), no wall-clock sleeps, positive controls for guards,
    every assertion scoped to the test's own rows on the shared Dev Services DB; `@QuarkusTest` for slices,
    `@QuarkusIntegrationTest` against the fast-jar; ArchUnit via `archunit-junit6` 1.5.1 (JUnit 6;
    https://github.com/TNG/ArchUnit/issues/1556) through ONE shared class holder; `%test.quarkus.http.test-port=0`.
11. Testcontainers: 2.0.5 worked without `-Dapi.version=1.43` in the proof; keep the flag as a documented
    fallback, not a default.

## Open questions for the owner

1. Where does Nexus 3.84.0 run now (the Coolify record is stale)? Needed only for the runbook, pushes work.
2. Reuse the Common Resources Postgres 18 for staging (recommended) or a dedicated container?
3. Upgrade staging Logto 1.41.0 -> 1.43.0 before Klokka starts (security hardening in 1.43)?
4. Accept that Klokka shares Kulram's sign-in experience, organization template and email connector on staging?
5. Migadu: 587/STARTTLS (tax-agent) or 465/TLS (Migadu's page)?
