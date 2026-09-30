# Releasing to production

A push to `main` builds and deploys **staging** only (`.github/workflows/ci.yml`). Production artifacts exist only
for a `v<major>.<minor>.<patch>` tag, and production runs only what the owner pins by hand.

## Before tagging

Gates the tag waits for. Each is checked by hand; tick them in the release's Jira ticket.

- [x] The public contact mailbox `hej@klokka.se` exists and receives mail (done 2026-09-30); the site, the
  Organization JSON-LD and the legal pages print it.
- [ ] Production Logto's sign-in experience links the terms and privacy pages: terms `https://klokka.se/villkor`,
  privacy `https://klokka.se/integritet` (console `https://auth-admin.klokka.se`, Sign-in experience, Terms).
- [ ] The owner has read the Swedish text of the labour-law guides (`/guide/arbetstidslagen`,
  `/guide/far-arbetsgivaren-andra-tidrapport`, `/guide/personalliggare-eller-tidrapport`). For the first SEO release
  (CHQ-149) the owner chose to do this read after the release; later releases that change these guides read them
  before tagging.

## Cut a release

```bash
./release.sh patch      # or minor, major, or an explicit 1.2.3
```

From a clean `main` in sync with `origin/main`, it writes the version into `apps/api/**/pom.xml` and
`apps/mobile/app.config.ts` (version, `versionCode` + 1), commits `Release v<version>`, tags `v<version>` and pushes
both. The commit deploys staging like any push; the tag runs `.github/workflows/release.yml`:

| Job | Produces |
|---|---|
| `images` | `docker.nexus.coolify.ooguy.com/klokka-{api,web,landing}:v<version>`. The landing is built with the production URLs (Next.js bakes them) and `NEXT_PUBLIC_INDEXABLE=true`; the job then runs it and fails unless `/` and `/en` are indexable (`.github/scripts/index-check.sh`). A `v*` tag never moves `:latest`. |
| `apk` | signed production APK at `klokka-downloads/prod/klokka-v<version>.apk` and `prod/klokka-latest.apk` (the landing's link). Refuses to build while a `PROD_*` app setting is empty. |

Nothing deploys automatically.

## Deploy (by hand)

In production Coolify (`https://coolify.prod.roxa.org`, project **Klokka**), set each app's image tag to
`v<version>` and deploy, the API first (it runs the Flyway migrations).

Pin a tag in production only if its Release run is green (the landing image is pushed before its index check runs):
a red `images` job can leave a `klokka-landing:v<version>` in Nexus that failed the check.

| App | Coolify uuid | Domain | Health |
|---|---|---|---|
| `klokka-api` | `evaro481mmx2fpp5eev2cgj2` | `https://api.klokka.se` (network alias `klokka-api`, which the web app calls) | `/q/health/ready` |
| `klokka-web` | `kakqu4trsp8yddirzntj2uct` | `https://app.klokka.se` | `/healthz` |
| `klokka-landing` | `f7t6h4recxky32cx06iknx2x` | `https://klokka.se`, `https://www.klokka.se` | `/` |

Logto is the Coolify service `logto-hxthesh8i3rgrca3yldartx9` (`https://auth.klokka.se`, console
`https://auth-admin.klokka.se`), in the same project. The database is `klokka` on the Common Resources Postgres 18
(`gual64hodx8mn2x4xr04lbhm`), owned by `klokka_migrate`, with `klokka_runtime` for the app. Health checks call
`127.0.0.1`: with Coolify's default `localhost` they resolve to `::1`, which Next.js does not listen on. Rollback is the same with an older tag; every release stays in Nexus. Never re-tag an old
commit to force a redeploy.

## After the landing is deployed

Once `klokka-landing` runs the new tag:

1. Check it is indexable in production (the same script CI runs against the image):
   `bash .github/scripts/index-check.sh https://klokka.se index`
2. Tell search engines what changed: submit every URL in the sitemap to IndexNow (Bing, Yandex and others share
   it), once per release. The key file `apps/landing/public/97610e0ce4b2f414fb199ad350852ed0.txt` is served at the
   site root and proves the site is ours. One request, bounded, and it stops on an empty sitemap. It runs in a
   subshell, so a stop ends only the subshell, never the terminal it is pasted into:

   ```bash
   (
     key=97610e0ce4b2f414fb199ad350852ed0
     urls=$(curl -sf --max-time 20 https://klokka.se/sitemap.xml | grep -o '<loc>[^<]*</loc>' | sed -e 's/<loc>//' -e 's/<\/loc>//')
     [ -n "$urls" ] || { echo "empty sitemap: is the build indexable?"; exit 1; }
     jq -n --arg key "$key" --arg urls "$urls" '{host: "klokka.se", key: $key,
         keyLocation: "https://klokka.se/\($key).txt", urlList: ($urls | split("\n"))}' |
       curl -s --max-time 30 -X POST https://api.indexnow.org/indexnow \
         -H 'Content-Type: application/json; charset=utf-8' --data-binary @- -o /dev/null -w '%{http_code}\n'
   )
   ```

   `200` or `202` (key not verified yet) is fine; `403` means the key file is not reachable, `422` that a URL is not
   on klokka.se. Do not run it on staging: its sitemap is empty by design.
3. Refresh the link previews: re-scrape `https://klokka.se/` and `https://klokka.se/en` in the Facebook Sharing
   Debugger (`https://developers.facebook.com/tools/debug/`) and the LinkedIn Post Inspector
   (`https://www.linkedin.com/post-inspector/`), so a share shows the new card rather than a cached one.

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
