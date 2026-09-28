# Klokka staging infrastructure

What exists on staging as of 2026-09-27, how each piece was made, how to change it, and what the code
trains must still set. Staging only: nothing here touches production (`~/.agents/production-deploys.md`
covers the later `v*`-tag path). No secrets in this file; every secret lives in
`.agents/local-credentials/` (gitignored, `chmod 600`), see the file list at the end.

Tools used: the Coolify REST API (`https://coolify.coolify.ooguy.com/api/v1`, write token in
`coolify-staging.json`), `ssh testenv` (user `test`, sudo + docker group; Coolify itself talks to the
host as `root`), the Logto Management API, the Nexus REST API as `admin`, `keytool`, `gh secret set`.

## 1. Coolify project

| Object | Value |
|---|---|
| Coolify | `https://coolify.coolify.ooguy.com/` (4.3.23), server `bravo-se` (`uc0oo04c0ccwswowkwscw84w`, 192.168.0.20) |
| Project | **Klokka**, uuid `yyb9dryyibwilrmqurdzz7ry` |
| Environment | `production` (Coolify's default name; it is our staging), uuid `mf9btkp5kc6lzivimh7qv0ez` |
| Description | "Klokka - hours for small employers" (Coolify's validator rejects a colon in descriptions) |

Made with `POST /projects`. Everything below lives in this project and environment.

## 2. Applications (`dockerimage`, not deployed yet: no image exists)

| App | Coolify uuid | Image (Nexus) | Port | Health | Public URL |
|---|---|---|---|---|---|
| `klokka-api` | `l5qbr0mxfwdfdgy7f4jndyde` | `docker.nexus.coolify.ooguy.com/klokka-api:latest` | 8080 | `GET /q/health/ready` | `https://klokka-api.coolify.ooguy.com` |
| `klokka-web` | `armlujpn5wkqd1d2nq0wkiiz` | `docker.nexus.coolify.ooguy.com/klokka-web:latest` | 3000 | `GET /healthz` | `https://klokka-app.coolify.ooguy.com` |
| `klokka-landing` | `0sbvfkrt1vvbofzkk5q8ndv6` | `docker.nexus.coolify.ooguy.com/klokka-landing:latest` | 3000 | `GET /` | `https://klokka.coolify.ooguy.com` |

Shape copied from `kulram-web` (`xvlgpv6ezoj3prbwhjsn4jti`): `build_pack=dockerimage`, `limits_memory=512m`
(swap 512m, reservation 128m), `limits_cpus=1`, `custom_docker_run_options=--init`, HTTP health check every
30 s (timeout 5 s, 3 retries, 15 s start period, expects 200), force HTTPS, gzip, `redirect=both`. Status shows
`exited:unhealthy` until the first image is pushed and deployed.

Registry credentials: there is no per-app registry object in Coolify 4.3. `docker compose pull` runs on the
host as `root`, whose `/root/.docker/config.json` already holds the Nexus login (the same way `kulram-web`
pulls). Nothing to configure per app; if the Nexus password rotates, re-run `docker login
docker.nexus.coolify.ooguy.com` as root on `bravo-se` (needs `sudo`, credentials in `sudo.json`).

Made with `POST /applications/dockerimage` (bodies in the Coolify OpenAPI at `/var/www/html/openapi.yaml`
inside the `coolify` container). Change with `PATCH /applications/{uuid}` (same field names).
Deploy = `PATCH /applications/{uuid}` with `{"docker_registry_image_tag": "<immutable tag>",
"instant_deploy": true}`; rollback is the same call with the previous tag. `POST /deploy?uuid=<uuid>`
redeploys the pinned tag without changing it.

Env vars: only public values are set (URLs, ids, hostnames, role names). Secrets are added by the code
trains through `PATCH /applications/{uuid}/envs/bulk` from the local credential files. Names follow the
inventory in `docs/research/backend-and-infra.md` section 6; if the code picks other names, rename here
and in Coolify, do not keep both. Current keys:

- `klokka-api`: `LOGTO_ISSUER`, `LOGTO_ENDPOINT`, `LOGTO_M2M_CLIENT_ID`, `KLOKKA_API_RESOURCE`,
  `KLOKKA_WEB_BASE_URL`, `DB_URL` (JDBC, no password), `DB_APP_USER`, `DB_MIGRATE_USER`, `MAIL_HOST`,
  `MAIL_PORT`. Still to set (secret): `LOGTO_M2M_CLIENT_SECRET` (logto.json), `DB_APP_PASSWORD` and
  `DB_MIGRATE_PASSWORD` (postgres.json), `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` (smtp.json),
  `KLOKKA_EXPO_ACCESS_TOKEN` (expo.json), `KLOKKA_PUSH_QUIET_WINDOW` and `KLOKKA_PUSH_MAX_DELAY` (ISO durations,
  `docs/DEPLOYMENT.md`), `JAVA_OPTS`.
- `klokka-web`: `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_BASE_URL`, `KLOKKA_API_RESOURCE`, `API_BASE_URL`,
  `NEXT_PUBLIC_API_BASE_URL`. Still to set: `LOGTO_APP_SECRET` (logto.json), `LOGTO_COOKIE_SECRET`
  (generate, 32+ chars).
- `klokka-landing`: `NEXT_PUBLIC_APP_URL`. Still to set: the APK download URL once CI publishes one
  (section 7).

## 3. Klokka's own Logto (Coolify one-click service)

| Object | Value |
|---|---|
| Service | `klokka-logto`, uuid `bfti53jkt7asbrlzftweijmn`, type `logto`, image `svhd/logto:1.43.0` (env `TAG=1.43.0`) |
| Service application | `logto`, uuid `ogpwpyywwhxkmwf1yhqkxrrv`; database `postgres`, uuid `32vfrr0e8tehhkznokxqfgvz` (`postgres:14-alpine`, volume `logto-postgres-data`) |
| Endpoint (OIDC, apps, Management API) | `https://klokka-logto.coolify.ooguy.com` (container port 3001) |
| Admin console | `https://klokka-logto-admin.coolify.ooguy.com` (container port 3002) |
| Issuer | `https://klokka-logto.coolify.ooguy.com/oidc`, JWKS `/oidc/jwks` (one EC P-384 key, ES384) |
| Discovery | `https://klokka-logto.coolify.ooguy.com/oidc/.well-known/openid-configuration` answers 200 |
| Console admin | username `klokka_admin` (admin tenant), password in `logto.json` |

How it was made: `POST /services` with `type=logto` and `urls=[{name: "logto", url: "https://klokka-logto.coolify.ooguy.com:3001,https://klokka-logto-admin.coolify.ooguy.com:3002"}]`.
Coolify strips the ports on create, so the service application was then patched with
`PATCH /services/{uuid}/applications/{app_uuid}` `{"url": "...:3001,...:3002"}`; the ports end up in the
Traefik labels (`loadbalancer.server.port` 3001 for the endpoint host, 3002 for the admin host, verified
on the container). Envs `LOGTO_ENDPOINT`, `LOGTO_ADMIN_ENDPOINT`, `TAG` were set with
`PATCH /services/{uuid}/envs/bulk`; the compose (`PATCH /services/{uuid}` `docker_compose_raw`, base64)
got the same ops tweaks as Kulram's Logto: `mem_limit` 768m / 512m, `init: true`,
`NODE_OPTIONS=--max-old-space-size=576`. The entrypoint runs `npm run cli db seed -- --swe && npm run
alteration deploy latest && npm start`, so an image upgrade migrates the database on start.

Change it: bump `TAG` (env) and `POST /services/{uuid}/restart`; domains through the service-application
PATCH above (keep the `:3001`/`:3002` suffixes and the two `LOGTO_*_ENDPOINT` envs in step). The Logto
Postgres is `postgres:14-alpine` from the template (Logto needs 14+); moving it to a newer major is a
separate ticket with a dump/restore.

Bootstrap: the admin console's first-run page (`/console/welcome` -> "Create account" -> username ->
password) was driven with Playwright (script in the session scratchpad, not in the repo); usernames may
only contain letters, digits and underscores. From the console's own requests a Management API bearer
(audience `https://default.logto.app/api`, sent to the endpoint host, not the admin host) was captured
once and used only to create the M2M app below; everything else was done with that app's client
credentials.

## 4. Logto objects (default tenant)

All ids are public identifiers; secrets are in `logto.json`.

| Object | Id | Details |
|---|---|---|
| API resource "Klokka API" | `n6jrcpp1sbgc65ozk8y8p` | indicator `https://api.klokka.app`, access token TTL 3600 s, NOT the default API (every client must send `resource=`; without it Logto issues an opaque token) |
| Scope `workspace:read` | `1t7ufw91poppir57hi0qs` | on the API resource |
| Scope `workspace:write` | `nwt4i0hy8ac4j6hhz7thi` | on the API resource |
| Scope `operator` | `jtnh41fsib21xkv8n4hqi` | on the API resource; only `platform-admin` carries it |
| Organization role `EMPLOYER` | `da4ro7bg7wzjcjeycjwbj` | type User, resource scopes `workspace:read`, `workspace:write` |
| Organization role `EMPLOYEE` | `0ibpq0bo3w9b8p926ykrd` | type User, resource scope `workspace:read` |
| Global role `platform-admin` | `7p6e4ne1osq64kp8rn7xc` | type User, scope `operator` |
| Built-in M2M role "Logto Management API access" | `s1hecvqc0iytkarj7jkuc` | assigned to `klokka-api` |
| App `klokka-web` (Traditional web) | `ch5o6gx449u0oay57hrw9` | redirect `https://klokka-app.coolify.ooguy.com/callback`, `http://localhost:3000/callback`, `http://192.168.0.16:3000/callback`; post-logout the three origins; refresh tokens 14 days, rotating; secret in `logto.json` |
| App `klokka-mobile` (Native) | `1uhtt4uj8f0aevtgf6g3b` | redirect `klokka://auth/callback`, post-logout `klokka://auth/logout`; refresh tokens 30 days, rotating; public client (PKCE, no secret) |
| App `klokka-api` (M2M) | `ntk66uf3a0yvlqfqdry9f` | Management API access; token: `POST /oidc/token` with `grant_type=client_credentials`, `resource=https://default.logto.app/api`, `scope=all`, HTTP basic `client_id:secret`; 1 h tokens |
| Email connector | `jqol0o78ah62` | `simple-mail-transfer-protocol`: `smtp.migadu.com:587`, STARTTLS (`secure=false`, `requireTLS=true`), user `no-reply@cleanhq.se`, from `Klokka <no-reply@cleanhq.se>`; templates `SignIn`, `Register`, `ForgotPassword`, `Generic`, `OrganizationInvitation`, `UserPermissionValidation`, `BindNewIdentifier` (HTML, English placeholder copy) |
| Sign-in experience | (singleton) | sign-up: email + password, email verified by code; sign-in: email + password; primary colour `#FF006E` in light and dark, dark mode on; logo (light and dark) `https://nexus.coolify.ooguy.com/repository/klokka-downloads/brand/klokka-mark-heavy.png`; mode `SignInAndRegister`; no social connectors |
| Owner user | `6uqr9falofc6` | `sleep-chooser-coma@duck.com`, name "Prasannjeet Singh", role `platform-admin`; generated password in `logto.json`, flagged `must_change_password` |

Email path proven: `POST /api/connectors/simple-mail-transfer-protocol/test` to `test@blixo.ai` returned 204
and the message arrived (2026-09-27 23:02 UTC, subject "Your Klokka code: 000000", the `Generic`
template). Every test costs one of the ~100 emails per month on staging.

Notes and gaps:
- Logo: `POST /api/user-assets` fails with `storage.not_configured` (OSS has no storage provider set), so the
  PNG from `docs/brand/final/klokka-mark-heavy.png` is served from the Nexus raw repo (section 7) instead.
- "App name": Logto OSS has no app-name field in the sign-in experience; the sign-in page shows the logo and
  the application names are `klokka-web` / `klokka-mobile` (that is what `{{application.name}}` renders in
  templates, which is why the templates say "Klokka" literally).
- "Must change password": Logto has no forced-change flag. The owner changes it in the app's account page
  or through "Forgot password" (email code). The console admin `klokka_admin` is a different account
  (admin tenant) and is the only console login.
- No webhook yet. The API's membership mirror (`docs/DECISIONS.md` D1) needs a Logto webhook to
  `https://klokka-api.coolify.ooguy.com/...` created by the API code train (`POST /api/hooks`).
- Whether the `roles` claim reaches the API token is for the API train to verify; the `operator` scope on
  `platform-admin` is the fallback (`scope` claim) and is already in place.
- Email template copy is English-only placeholder text; replace through `PATCH /api/connectors/jqol0o78ah62`
  (`config.templates`) once the catalogue text exists (sv + en, no em dashes).

Change anything above through the Management API with the `klokka-api` credentials (`GET/POST/PATCH
https://klokka-logto.coolify.ooguy.com/api/...`, OpenAPI at https://openapi.logto.io) or in the admin
console as `klokka_admin`. Sign in as the owner (`platform-admin`) happens through the apps, not the console.

## 5. Postgres (shared Common Resources PostgreSQL 18)

| Object | Value |
|---|---|
| Coolify database | `postgresql-database-k10e48k41urcbb1erev0vhmu`, uuid `k10e48k41urcbb1erev0vhmu`, project "Common Resources", image `postgres:18-alpine` (18.6) |
| Container / network | container `k10e48k41urcbb1erev0vhmu` on the docker network `coolify` (alias = uuid, IP 172.18.0.6 today); no host port published |
| Internal JDBC URL | `jdbc:postgresql://k10e48k41urcbb1erev0vhmu:5432/klokka` (the three dockerimage apps land on the `coolify` network, so the alias resolves; `kulram-web` runs there too) |
| Database | `klokka`, owner `klokka_migrate`; `CONNECT` revoked from PUBLIC, granted to `klokka_runtime`; schema `public` (owner = database owner, `CREATE` revoked from PUBLIC, `USAGE` to `klokka_runtime`) |
| Role `klokka_migrate` | LOGIN; DDL owner; Flyway runs as this role |
| Role `klokka_runtime` | LOGIN; DML only: default privileges from `klokka_migrate` grant `SELECT, INSERT, UPDATE, DELETE` on tables, `USAGE, SELECT` on sequences, `EXECUTE` on functions, so every future Flyway table is covered without further grants |
| External access | none published. Local dev: `ssh -N -L 5433:172.18.0.6:5432 testenv` then `jdbc:postgresql://localhost:5433/klokka` (verified answering), or `ssh testenv docker exec -it k10e48k41urcbb1erev0vhmu psql -U klokka_migrate klokka` |

Made with `psql` as `postgres` over `ssh testenv docker exec -i k10e48k41urcbb1erev0vhmu psql`; the SQL
was piped over stdin (the remote shell mangles `$$` in a `-c` string). Passwords in `postgres.json`;
rotate with `ALTER ROLE ... PASSWORD` the same way and update the Coolify env plus the file. If Flyway
ever creates objects as another role, re-run the `ALTER DEFAULT PRIVILEGES FOR ROLE <that role>` lines.
The Coolify env `DB_URL` on `klokka-api` already holds the internal URL; `DB_APP_PASSWORD` and
`DB_MIGRATE_PASSWORD` are still to be set (secrets).

## 6. Android release keystore

`.agents/local-credentials/klokka-release.keystore`: PKCS12, alias `klokka`, RSA 2048, SHA384withRSA,
`CN=Klokka`, valid until 2054-02-12 (10000 days), made with JDK 21 `keytool -genkeypair`. Passwords in
`android-signing.json` (PKCS12 keeps one password for store and key; keytool ignores a separate
`-keypass`). GitHub repository secrets on `prasannjeet/klokka`, set with `gh secret set` on 2026-09-27:
`ANDROID_KEYSTORE_BASE64` (the file, `base64 -w0`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`
(`klokka`), `ANDROID_KEY_PASSWORD`. Already present before: `COOLIFY_TOKEN`, `EAS_PROJECT_ID`,
`EXPO_TOKEN`, `GOOGLE_SERVICES_JSON`, `NEXUS_USERNAME`, `NEXUS_PASSWORD`.

Never regenerate this keystore: Android treats a new signing key as a different app, and sideloaded
users would have to uninstall. Rotating the password means re-setting the two password secrets. Keep an
offline copy (owner).

## 7. Nexus raw repository for downloads

| Object | Value |
|---|---|
| Repository | `klokka-downloads`, format raw, type hosted, blob store `default`, write policy ALLOW (re-upload of the same path allowed), content disposition ATTACHMENT (browsers download instead of rendering) |
| Base URL | `https://nexus.coolify.ooguy.com/repository/klokka-downloads/` |
| Listing (anonymous) | `https://nexus.coolify.ooguy.com/service/rest/repository/browse/klokka-downloads/` answers 200; the bare repo root answers 404 until a file exists at `/index.html` (raw repos have no auto index) |
| Contents today | `brand/klokka-mark-heavy.png` (the Logto sign-in logo, 38 KB) |
| Suggested APK paths | `android/klokka-<version>.apk` (immutable) and `android/klokka-latest.apk` (overwritten by CI); the landing page links the latter |

Upload from CI (Nexus admin or a CI user with `nx-repository-view-raw-klokka-downloads-*`):
`curl -sf -u "$NEXUS_USERNAME:$NEXUS_PASSWORD" --upload-file app-release.apk
https://nexus.coolify.ooguy.com/repository/klokka-downloads/android/klokka-<version>.apk`.

Anonymous read, and what changed globally: Nexus anonymous access was disabled on this instance. It is now
enabled, but the `anonymous` user was moved off the built-in `nx-anonymous` role (which reads every
repository) onto a new role `klokka-downloads-anon` holding only
`nx-repository-view-raw-klokka-downloads-read` and `-browse`. Verified after the change: anonymous GET on
`maven-releases` and `docker-hosted` still 401, `npm-hosted` invisible (404), `klokka-downloads` readable.
To give another repo anonymous read, add its `nx-repository-view-*-read/-browse` privileges to that role.
To revert entirely: `PUT /service/rest/v1/security/anonymous` with `enabled=false`, or put the user back
on `nx-anonymous`. Done through the REST API (`/service/rest/v1/repositories/raw/hosted`,
`/security/roles`, `/security/users/anonymous`, `/security/anonymous`) with the admin login that
`~/.docker/config.json` holds for `docker.nexus.coolify.ooguy.com`.

## 8. What the code trains must set (env var homes)

| Component | Where values live | Public (already set) | Secret (to set from local-credentials) |
|---|---|---|---|
| API (`klokka-api`, Coolify env) | Coolify app `l5qbr0mxfwdfdgy7f4jndyde`; locally `.env` (gitignored) | `LOGTO_ISSUER`, `LOGTO_ENDPOINT`, `LOGTO_M2M_CLIENT_ID`, `KLOKKA_API_RESOURCE`, `KLOKKA_WEB_BASE_URL`, `DB_URL`, `DB_APP_USER`, `DB_MIGRATE_USER`, `MAIL_HOST`, `MAIL_PORT` | `LOGTO_M2M_CLIENT_SECRET` (logto.json), `DB_APP_PASSWORD`, `DB_MIGRATE_PASSWORD` (postgres.json), `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` (smtp.json), `EXPO_ACCESS_TOKEN` (expo.json) |
| Web (`klokka-web`, Coolify env) | Coolify app `armlujpn5wkqd1d2nq0wkiiz`; locally `.env.local` | `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_BASE_URL`, `KLOKKA_API_RESOURCE`, `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL` | `LOGTO_APP_SECRET` (logto.json), `LOGTO_COOKIE_SECRET` (generate 32+ random chars, never reuse) |
| Landing (`klokka-landing`, Coolify env) | Coolify app `0sbvfkrt1vvbofzkk5q8ndv6` | `NEXT_PUBLIC_APP_URL` | none; add the APK URL (`NEXT_PUBLIC_APK_URL`) once CI publishes one |
| Mobile (Expo, `EXPO_PUBLIC_*` at Metro/EAS build time) | `apps/mobile/.env` (gitignored) and the CI workflow | `EXPO_PUBLIC_LOGTO_ENDPOINT=https://klokka-logto.coolify.ooguy.com`, `EXPO_PUBLIC_LOGTO_APP_ID=1uhtt4uj8f0aevtgf6g3b`, `EXPO_PUBLIC_API_RESOURCE=https://api.klokka.app`, `EXPO_PUBLIC_API_BASE_URL=https://klokka-api.coolify.ooguy.com` | none (native app is a public client); `google-services.json` copied from local-credentials at build |
| CI (GitHub Actions, `prasannjeet/klokka`) | repository secrets | app uuids above, image names `docker.nexus.coolify.ooguy.com/klokka-{api,web,landing}`, downloads repo | `NEXUS_USERNAME`, `NEXUS_PASSWORD`, `COOLIFY_TOKEN`, `EXPO_TOKEN`, `EAS_PROJECT_ID`, `GOOGLE_SERVICES_JSON`, `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (all present) |

Quarkus mapping for the API (from `docs/research/backend-and-infra.md` 4b/4d): `quarkus.oidc.auth-server-url`
= `LOGTO_ISSUER`, `quarkus.oidc.token.audience` = `KLOKKA_API_RESOURCE`, `quarkus.oidc-client.*` from the
`LOGTO_M2M_*` pair with `resource=https://default.logto.app/api`, `scope=all`; Management API base
`LOGTO_ENDPOINT/api`.

Still to be created by code trains, not by this setup: the Logto webhook for membership mirroring, the
`v*` production path, the CI workflow files, and any Logto organization (workspaces are created by the API
at runtime).

## 9. Needs the owner

- Change the owner's Logto password (`sleep-chooser-coma@duck.com`): generated, stored in `logto.json`,
  Logto cannot force a change on first sign-in.
- Keep an offline copy of `klokka-release.keystore` and `android-signing.json`; losing them means a new
  app identity for every sideloaded install.
- Confirm the Nexus change (anonymous access enabled with a repo-scoped role, section 7) is acceptable.
  It is instance-wide even though only `klokka-downloads` is readable.
- Logto's own Postgres is the template's `postgres:14-alpine` (EOL November 2026). Decide when to move it
  to 17/18 (dump and restore, separate ticket).
- Email template copy (sv + en) and the sign-in page wording are placeholders until the catalogue exists.
- Push (`docs/DECISIONS.md` D5): the FCM service account still has to be uploaded to the EAS project's
  Android credentials; not part of this setup.
- `docs/DECISIONS.md` D6's "upgrade staging Logto 1.41.0 to 1.43.0" concerns Kulram's Logto, which was
  not touched; Klokka's runs 1.43.0 from the start.

## 10. Credential files (`.agents/local-credentials/`, gitignored, chmod 600)

| File | Holds |
|---|---|
| `coolify-staging.json` | Coolify staging write token, project/environment/server uuids, the three app uuids, the Logto service and sub-resource uuids, shared Postgres uuid |
| `logto.json` | console admin (`klokka_admin`), M2M `klokka-api` id + secret, API resource and scope ids, org role ids, `platform-admin` id, `klokka-web` id + secret, `klokka-mobile` id, connector id, sign-in experience summary, owner user id + password |
| `postgres.json` | database, roles and passwords, internal JDBC URL, tunnel recipe |
| `klokka-release.keystore`, `android-signing.json` | Android release signing |
| `smtp.json` | Migadu sender (also inside the Logto connector) |
| `expo.json`, `google-services.json`, `firebase-service-account.json` | push prerequisites (owner-supplied) |
| `sudo.json` | staging host sudo (host-level changes only) |
