# Operations runbook

How Klokka runs, how to reach every part of it, and how to check, deploy, fix and roll back, for **staging** and
**production**. No secrets in this file (the repository is public): every credential is named by the local file
that holds it (section 2). Deep background: `docs/INFRA.md` (staging build-out), `docs/DEPLOYMENT.md` (CI/CD, env
vars one by one), `docs/RELEASING.md` (the production release flow).

**Rule:** test, probe and experiment on staging. Anything that changes production (Coolify, Logto, Postgres,
Migadu) needs the owner's explicit go-ahead for that change.

## 1. The map

| Part | Staging | Production |
|---|---|---|
| Coolify | `https://coolify.coolify.ooguy.com`, project Klokka | `https://coolify.prod.roxa.org` (NetCup), project Klokka |
| Host shell | `ssh testenv` | `ssh netcup` (root) |
| Coolify MCP | `coolify-testenv` (read/write) | `coolify-prod` (read only), `coolify-prod-rw` (only with a go-ahead) |
| Landing | `https://klokka.coolify.ooguy.com` (`0sbvfkrt1vvbofzkk5q8ndv6`) | `https://klokka.se`, `www` (`f7t6h4recxky32cx06iknx2x`) |
| Web app | `https://klokka-app.coolify.ooguy.com` (`armlujpn5wkqd1d2nq0wkiiz`) | `https://app.klokka.se` (`kakqu4trsp8yddirzntj2uct`) |
| API | `https://klokka-api.coolify.ooguy.com` (`l5qbr0mxfwdfdgy7f4jndyde`) | `https://api.klokka.se` (`evaro481mmx2fpp5eev2cgj2`) |
| Logto | `https://klokka-logto.coolify.ooguy.com`, console `klokka-logto-admin.coolify.ooguy.com` (service `bfti53jkt7asbrlzftweijmn`) | `https://auth.klokka.se`, console `https://auth-admin.klokka.se` (service `logto-hxthesh8i3rgrca3yldartx9`) |
| Logto API resource | `https://api.klokka.app` | `https://api.klokka.se` |
| Postgres | Common Resources `k10e48k41urcbb1erev0vhmu`, database `klokka` | Common Resources `gual64hodx8mn2x4xr04lbhm`, database `klokka` |
| Logto's own Postgres | inside the Logto service (`postgres:14-alpine`) | inside the Logto service (`postgres-hxthesh8i3rgrca3yldartx9`) |
| Images | `docker.nexus.coolify.ooguy.com/klokka-{api,web,landing}:sha-<short>` | same repositories, `:v<version>` |
| Android APK | `.../klokka-downloads/klokka-latest.apk` | `.../klokka-downloads/prod/klokka-latest.apk` (+ `prod/klokka-v<version>.apk`) |
| Sender mailbox | `no-reply@cleanhq.se` (Migadu) | `no-reply@klokka.se` (Migadu) |
| Deploys | every push to `main` (CI) | `./release.sh`, then pin the tag in Coolify by hand |

All apps are Coolify `dockerimage` apps: 512 MB, `--init`, health checks on `127.0.0.1` (section 9). The web app
calls the API over the Docker network at `http://klokka-api:8080/v1` (the API app's network alias `klokka-api`),
never through the public domain. Push notifications: Expo project `f617e8bb-38d1-4247-9dde-d92bda37fe18`, Firebase
`klokka-64f3a`, package `com.prasannjeet.klokka` for both environments (one phone holds one of the two APKs).

## 2. Where the credentials are

All in `.agents/local-credentials/` on the dev host: gitignored, `chmod 600`, never pasted into tickets, commits or
chat. `README.md` in that folder lists every file.

| Need | Staging | Production |
|---|---|---|
| Coolify API token + app uuids | `coolify-staging.json` | `coolify-prod.json` (uuids); the write token is the `coolify-prod-rw` MCP's `COOLIFY_ACCESS_TOKEN` in `~/.claude.json` |
| Logto console login, M2M app, app ids and secrets, webhook key | `logto.json` | `logto-prod.json` |
| Postgres roles and passwords | `postgres.json` | `postgres-prod.json` |
| SMTP sender | `smtp.json` | `smtp-prod.json` |
| Test accounts | `staging-accounts.json` | none (use your own account) |
| Expo, Firebase, Android signing | `expo.json`, `firebase-service-account.json`, `google-services.json`, `klokka-release.keystore`, `android-signing.json` (shared by both) | same |
| Staging host sudo | `sudo.json` | n/a (`ssh netcup` is root) |

CI secrets and build values live in GitHub (`gh secret list`, `gh variable list`): `NEXUS_*`, `COOLIFY_TOKEN` +
`COOLIFY_APP_*_UUID` (staging deploys), `ANDROID_*`, `GOOGLE_SERVICES_JSON`, `EAS_PROJECT_ID`, `EXPO_TOKEN`, and the
`STAGING_*` / `PROD_*` variables (`docs/RELEASING.md`). App runtime values live in each Coolify app's environment.

Mailboxes are also in the email MCP (`mcp-email-server account list`): `cleanhq-noreply` (staging sender),
`klokka-noreply` (production sender), plus `blixo-test` / `cleanhq-info` for delivery tests.

## 3. Access

**Coolify:** the UI with your own login, or the MCPs in section 1. The REST API is `<coolify>/api/v1` with a bearer
token (staging: `coolify-staging.json` `.token`).

**Logto admin console:** staging `https://klokka-logto-admin.coolify.ooguy.com`, production
`https://auth-admin.klokka.se`. The console login (admin tenant) is `console_admin` in `logto.json` /
`logto-prod.json`; it is a different account from anyone who signs in to Klokka. For scripted changes use the M2M
app `klokka-api` (Management API access) from the same file:

```bash
L=.agents/local-credentials/logto-prod.json   # or logto.json for staging
E=$(jq -r .endpoint $L)
TOKEN=$(curl -s -u "$(jq -r '.applications["klokka-api"] | .id+":"+.secret' $L)" \
  -d grant_type=client_credentials -d resource=https://default.logto.app/api -d scope=all "$E/oidc/token" | jq -r .access_token)
curl -s -H "Authorization: Bearer $TOKEN" "$E/api/applications" | jq -r '.[] | "\(.name) \(.id)"'
```

**Postgres (Klokka's database):** neither server is published on the internet; go through the host.

```bash
# production: superuser, or read as the app with the runtime role
ssh netcup docker exec -it gual64hodx8mn2x4xr04lbhm psql -U postgres klokka
# staging
ssh testenv docker exec -it k10e48k41urcbb1erev0vhmu psql -U klokka_migrate klokka
# staging from a local tool: tunnel to the container IP (re-check it with docker inspect if it moved)
ssh -N -L 5433:172.18.0.6:5432 testenv    # then jdbc:postgresql://localhost:5433/klokka
```

Roles are the same in both: `klokka_migrate` owns the database and runs Flyway at API start, `klokka_runtime` is what
the app uses (DML only, through default privileges; it cannot create tables). A browser alternative on production
is DbGate (`https://dbgate.apps.prod.roxa.org`, Common Resources project).

**Logto's own Postgres** (users, sessions, apps): only for emergencies; change Logto through its console or API.

```bash
ssh netcup docker exec -it postgres-hxthesh8i3rgrca3yldartx9 psql -U "$(ssh netcup docker exec postgres-hxthesh8i3rgrca3yldartx9 printenv POSTGRES_USER)" logto
```

## 4. Daily checkup

Read-only, safe to run any time. Everything should print `200` (the API's `/v1/me` prints `401`: it wants a token).

```bash
for u in https://klokka.se/ https://app.klokka.se/healthz https://api.klokka.se/q/health/ready \
         https://auth.klokka.se/oidc/.well-known/openid-configuration \
         https://nexus.coolify.ooguy.com/repository/klokka-downloads/prod/klokka-latest.apk \
         https://klokka.coolify.ooguy.com/ https://klokka-app.coolify.ooguy.com/healthz \
         https://klokka-api.coolify.ooguy.com/q/health/ready \
         https://klokka-logto.coolify.ooguy.com/oidc/.well-known/openid-configuration; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$u")" "$u"
done
curl -s -o /dev/null -w '%{http_code} https://api.klokka.se/v1/me (expect 401)\n' https://api.klokka.se/v1/me
curl -s https://api.klokka.se/q/health/ready | jq -c '[.status, (.checks[] | .name + "=" + .status)]'
ssh netcup 'docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "evaro481|kakqu4tr|f7t6h4re|hxthesh8"'
gh run list --limit 5    # CI and release runs
```

What else to look at when something is off: the API's log (section 7), Coolify's deployment log for the app,
`gh run view <id> --log-failed` for CI, and the email MCP (`klokka-noreply` Sent folder) for mail.

## 5. Deploy and roll back

**Staging** deploys itself: every push to `main` builds what changed, pushes `sha-<short>` images, deploys through
the Coolify API and waits for health (`docs/DEPLOYMENT.md`). By hand from this host: `./deploy-staging.sh
api|web|landing|all`.

**Production** is two steps, by design:

1. `./release.sh patch` (or `minor`, `major`, `x.y.z`) on a clean, pushed `main`. The `v*` tag builds
   `klokka-{api,web,landing}:v<version>` and the production APK (`.github/workflows/release.yml`,
   `gh run watch`). A failed APK job refuses to publish an APK that carries the wrong environment.
2. In production Coolify set each app's image tag to `v<version>` and deploy, **API first** (it runs the migrations),
   then web and landing. Scripted, the same as CI does for staging:

```bash
T=$(jq -r '.mcpServers["coolify-prod-rw"].env.COOLIFY_ACCESS_TOKEN' ~/.claude.json)
for uuid in evaro481mmx2fpp5eev2cgj2 kakqu4trsp8yddirzntj2uct f7t6h4recxky32cx06iknx2x; do   # api, web, landing
  curl -s -X PATCH "https://coolify.prod.roxa.org/api/v1/applications/$uuid" -H "Authorization: Bearer $T" \
    -H 'Content-Type: application/json' -d '{"docker_registry_image_tag":"v1.2.3","instant_deploy":true}'; echo
done
```

Wait for the API's `/q/health/ready` before the web app. A `200` with a `message` in the body means the deploy was
skipped (one already running): read the body.

**Roll back:** the same PATCH (or the Coolify UI) with the previous tag; every version stays in Nexus. Never re-tag
an old commit. A rollback of the API across a migration needs thought: Flyway migrations only go forward.

## 6. Accounts and roles

- **Anyone** signs up on the web app or the phone (email + password, email confirmed by a code from the
  environment's sender mailbox). The first screen after sign-up creates their business; they become its EMPLOYER.
  Employees join through the invitation email an employer sends from the app. Nothing here needs an operator.
- **Operator (`platform-admin`)**: the operator console needs the Logto global role `platform-admin`. Grant it after
  the person has signed up once, with `$TOKEN`, `$E` and `$L` from section 3:

```bash
EMAIL=someone@example.com
USER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "$E/api/users?search=%25$EMAIL%25" | jq -r --arg e "$EMAIL" '.[] | select(.primaryEmail==$e) | .id')
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"roleIds\":[\"$(jq -r '.roles["platform-admin"].id' $L)\"]}" "$E/api/users/$USER_ID/roles"
```

  They sign out and in again to get a token with the `operator` scope.
- **Staging test accounts** (employer, employee, operator) are in `staging-accounts.json`. Production has none: test
  production with your own account.
- **Removing a user**: delete it in the Logto console (or `DELETE $E/api/users/<id>`). The API keeps its own
  `app_user` row and memberships; those stay unless removed in the database.

## 7. Logs

Coolify UI: the app, then Logs. From a shell (containers are named `<app uuid>-<timestamp>`):

```bash
ssh netcup 'docker logs --tail 200 -f $(docker ps -qf name=evaro481mmx2fpp5eev2cgj2)'   # production API
ssh netcup 'docker logs --tail 200 $(docker ps -qf name=kakqu4trsp8yddirzntj2uct)'       # production web
ssh netcup 'docker logs --tail 200 logto-hxthesh8i3rgrca3yldartx9'                      # production Logto
ssh testenv 'docker logs --tail 200 $(docker ps -qf name=l5qbr0mxfwdfdgy7f4jndyde)'      # staging API
```

The production host also ships container logs to the staging Elastic stack (service `elastic-agent-prod`).

## 8. Email

Both senders are Migadu mailboxes (`smtp.migadu.com:587` STARTTLS). Each is used twice: by the environment's Logto
(sign-up codes, password reset) and by the API (invitations, digests), which caps itself at
`KLOKKA_MAIL_MONTHLY_QUOTA` (100 in both environments today). Test delivery with the email MCP: send from
`klokka-noreply` to `blixo-test` and list `blixo-test`'s inbox, or `POST $E/api/connectors/simple-mail-transfer-protocol/test`
to test Logto's connector. A new Migadu mailbox may accept IMAP but reject SMTP (`535`) until sending is enabled
for it in Migadu.

## 9. Troubleshooting (things that already happened)

| Symptom | Cause | Fix |
|---|---|---|
| A new Coolify app deploys, then "New container is not healthy, rolling back" | Coolify probes `localhost`, which resolves to `::1`; Next.js listens on IPv4 only | set the app's health check host to `127.0.0.1` |
| A phone signs in against the wrong environment | Metro's cache inlined old `EXPO_PUBLIC_*` values (fixed in v1.0.2: job-local cache + a bundle check) | rebuild; never ship an APK whose check step failed |
| API answers 401 to a signed-in client | the client did not send `resource` (Logto then issues an opaque token) or the audience differs | clients must send the environment's API resource |
| Logto shows English to Swedish browsers | Logto has no built-in Swedish | custom phrases in Logto (not done yet) |
| Sign-up email never arrives | sender mailbox not allowed to send, or the monthly quota used up | section 8 |
| `v*` tag built but production unchanged | production deploys are by hand | section 5, step 2 |
| Coolify's "Redirect to non-www" setting has no effect on the landing | the apps were created through the API with stored custom labels, which Coolify uses as they are | redirects live in the landing app's labels (below); after a domain change, edit the labels, never "reset to defaults" |

**Landing proxy labels (2026-09-29, both environments).** The landing app's custom labels add three Traefik
middlewares: `klokka-https-301` (http to https, permanent), `klokka-www-apex` (`www.klokka.se` to `klokka.se`, permanent,
path and query kept) and `klokka-hsts` (`Strict-Transport-Security: max-age=31536000`, no subdomains, no preload).
Check: `curl -sI https://www.klokka.se/en` answers 301 to `https://klokka.se/en`. Staging's http answers 302 from the
homelab's front proxy before Traefik; Traefik itself answers 301.

## 10. Open items (production)

- **Backups (done 2026-09-30):** `klokka` and `sawerashree` joined the Common Resources job
  (`u9l6zw3q1fsnb1o6uupuefm3`, daily 01:05 CEST, to S3; first run succeeded). Logto's own Postgres has its own daily
  job (`h70ykdq94q5vitsilysuuhqz`, 02:25 CEST, S3 only, 30 copies / 30 days; test run succeeded). Service-database
  schedules are not visible through the API: read them in the Coolify UI (service, Postgres, Backups). Manual dump:
  `ssh netcup docker exec gual64hodx8mn2x4xr04lbhm pg_dump -U postgres -Fc klokka > klokka-$(date +%F).dump`.
- One `app_user` row (`5zgfj0ng8gnz`, `smoke-test@klokka.se`) from the go-live sign-in test; its Logto user is deleted.
- `prod/klokka-v1.0.1.apk` in Nexus carries staging URLs; delete it.
- Mail quota 100 per month; raise it to the Migadu plan's limit.
- Logto sign-in pages in Swedish (custom phrases).
