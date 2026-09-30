#!/usr/bin/env bash
# Build and push one Klokka image as <registry>/klokka-<app>:<tag>, plus :latest for a staging build. Used by
# .github/workflows/ci.yml and ./deploy-staging.sh (staging, tag sha-<short>) and by .github/workflows/release.yml
# (production, tag v<version>). A v* tag never moves :latest: production runs exactly the version it names.
#
#   image.sh <api|web|landing> <tag>
#
# api:          the Dockerfile copies the fast-jar, so run `mvn -f apps/api/pom.xml install` first; context apps/api.
# web, landing: multi-stage apps/<app>/Dockerfile with the repository root as context (npm workspaces).
# The landing bakes its public URLs at build time (NEXT_PUBLIC_*), so they are build arguments; the defaults are
# staging's. The web app bakes in NEXT_PUBLIC_SITE_URL too: its share-preview image lives on the landing.
# NEXT_PUBLIC_INDEXABLE (default false) lets search engines index the landing: only release.yml sets it to true, so
# a staging or local image is always noindex. KLOKKA_BUILD_VERSION overrides the API's reported version
# (release.yml passes the tag's version).
# The caller must already be logged in to the registry.
set -euo pipefail

if [ $# -ne 2 ]; then echo "usage: $0 <api|web|landing> <tag>" >&2; exit 2; fi
app=$1
tag=$2
[[ $tag =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || { echo "not a docker tag: $tag" >&2; exit 2; }
cd "$(git rev-parse --show-toplevel)"

REGISTRY=${REGISTRY:-docker.nexus.coolify.ooguy.com}
APP_URL=${NEXT_PUBLIC_APP_URL:-https://klokka-app.coolify.ooguy.com}
SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://klokka.coolify.ooguy.com}
APK_URL=${NEXT_PUBLIC_APK_URL:-https://nexus.coolify.ooguy.com/repository/klokka-downloads/klokka-latest.apk}

case "$app" in
  api)
    context=apps/api
    # /operator/health shows this as the running version.
    pom_version=$(sed -n 's:.*<version>\(.*\)</version>.*:\1:p' apps/api/pom.xml | head -1)
    build_args=(--build-arg "KLOKKA_BUILD_VERSION=${KLOKKA_BUILD_VERSION:-${pom_version%-SNAPSHOT}-$(git rev-parse --short=7 HEAD)}")
    [ -d apps/api/service/target/quarkus-app ] ||
      { echo "apps/api/service/target/quarkus-app is missing: run mvn -f apps/api/pom.xml install first" >&2; exit 1; }
    ;;
  web)
    context=.
    build_args=(--build-arg "NEXT_PUBLIC_APP_URL=$APP_URL" --build-arg "NEXT_PUBLIC_SITE_URL=$SITE_URL")
    ;;
  landing)
    context=.
    build_args=(--build-arg "NEXT_PUBLIC_SITE_URL=$SITE_URL" --build-arg "NEXT_PUBLIC_APP_URL=$APP_URL"
      --build-arg "NEXT_PUBLIC_APK_URL=$APK_URL" --build-arg "NEXT_PUBLIC_INDEXABLE=${NEXT_PUBLIC_INDEXABLE:-false}")
    ;;
  *) echo "unknown app: $app (api, web or landing)" >&2; exit 2 ;;
esac
dockerfile=apps/$app/Dockerfile
[ -f "$dockerfile" ] || { echo "$dockerfile does not exist in this checkout" >&2; exit 1; }

image=$REGISTRY/klokka-$app
revision=$(git rev-parse HEAD)
docker build --pull -f "$dockerfile" "${build_args[@]}" \
  --label "org.opencontainers.image.source=https://github.com/prasannjeet/klokka" \
  --label "org.opencontainers.image.revision=$revision" \
  --label "klokka.app=$app" \
  -t "$image:$tag" "$context"
docker push "$image:$tag"
if [[ $tag != v* ]]; then
  docker tag "$image:$tag" "$image:latest"
  docker push "$image:latest"
fi
echo "pushed $image:$tag"

# Keep the build host's disk in check: drop the immutable tag locally (it lives in Nexus) and the previous
# build of this app that the new :latest left dangling. Only images labelled by this script are touched.
docker image rm "$image:$tag" >/dev/null
docker image prune -f --filter "label=klokka.app=$app" >/dev/null
