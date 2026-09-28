# Releasing to production

A push to `main` builds and deploys **staging** only (`.github/workflows/ci.yml`). Production artifacts exist only
for a `v<major>.<minor>.<patch>` tag, and production runs only what the owner pins by hand.

## Cut a release

```bash
./release.sh patch      # or minor, major, or an explicit 1.2.3
```

From a clean `main` in sync with `origin/main`, it writes the version into `apps/api/**/pom.xml` and
`apps/mobile/app.config.ts` (version, `versionCode` + 1), commits `Release v<version>`, tags `v<version>` and pushes
both. The commit deploys staging like any push; the tag runs `.github/workflows/release.yml`:

| Job | Produces |
|---|---|
| `images` | `docker.nexus.coolify.ooguy.com/klokka-{api,web,landing}:v<version>`. The landing is built with the production URLs (Next.js bakes them). A `v*` tag never moves `:latest`. |
| `apk` | signed production APK at `klokka-downloads/prod/klokka-v<version>.apk` and `prod/klokka-latest.apk` (the landing's link). Refuses to build while a `PROD_*` app setting is empty. |

Nothing deploys automatically.

## Deploy (by hand)

In production Coolify (`https://coolify.prod.roxa.org`, project **Klokka**), set each app's image tag to
`v<version>` and deploy. Rollback is the same with an older tag; every release stays in Nexus. Never re-tag an old
commit to force a redeploy.

## Environment values

Build-time values are GitHub repository variables (`gh variable list`), one set per environment:

| Variable | Staging | Production |
|---|---|---|
| `*_SITE_URL` | `https://klokka.coolify.ooguy.com` | `https://klokka.se` |
| `*_APP_URL` | `https://klokka-app.coolify.ooguy.com` | `https://app.klokka.se` |
| `*_API_URL` | `https://klokka-api.coolify.ooguy.com` | `https://api.klokka.se` |
| `*_APK_URL` | `.../klokka-downloads/klokka-latest.apk` | `.../klokka-downloads/prod/klokka-latest.apk` |
| `*_LOGTO_ENDPOINT` | `https://klokka-logto.coolify.ooguy.com` | `https://auth.klokka.se` |
| `*_LOGTO_APP_ID` | the staging native app | the production Logto native app's id |
| `*_API_RESOURCE` | `https://api.klokka.app` | `https://api.klokka.se` |

Runtime values (database, secrets, Logto M2M, SMTP) live in each Coolify app's environment, not here.

The staging and production APKs share the package id `com.prasannjeet.klokka` and the signing key, so one phone
holds one of them at a time.
