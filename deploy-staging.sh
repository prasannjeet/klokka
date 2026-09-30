#!/usr/bin/env bash
# Manual STAGING build and deploy from this host: the delivery half of .github/workflows/ci.yml, through the same
# scripts (.github/scripts/image.sh, .github/scripts/coolify-deploy.sh).
#
#   ./deploy-staging.sh api|web|landing|all
#
# For each app: build from the checked-out commit (the tree must be clean, so the tag names exactly what is in the
# image), push docker.nexus.coolify.ooguy.com/klokka-<app>:sha-<short> and :latest, pin and deploy that tag on
# staging Coolify, and wait for the app's health URL; for the landing, then check that staging answers noindex
# (.github/scripts/index-check.sh). The API is built and tested with Maven first (SKIP_TESTS=1 skips its tests);
# web and landing are built inside their Dockerfiles. `all` skips an app whose Dockerfile does not exist yet.
#
# Credentials: .agents/local-credentials/coolify-staging.json (Coolify write token, app uuids, URLs, health paths)
# and this user's Nexus docker login (~/.docker/config.json). Production is never reachable from here: it is built by
# a v* tag that ./release.sh cuts (.github/workflows/release.yml, docs/RELEASING.md).
set -euo pipefail
cd "$(dirname "$0")"

usage() { echo "usage: $0 api|web|landing|all" >&2; exit 2; }
[ $# -eq 1 ] || usage
case "$1" in
  api | web | landing) targets=("$1") ;;
  all) targets=(api web landing) ;;
  *) usage ;;
esac

CRED=.agents/local-credentials/coolify-staging.json
[ -f "$CRED" ] || { echo "$CRED is missing" >&2; exit 1; }
for tool in docker git jq curl; do
  command -v "$tool" >/dev/null || { echo "$tool is not on PATH" >&2; exit 1; }
done
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "the working tree has uncommitted changes; commit or stash them so the image tag names the commit" >&2
  exit 1
fi
COOLIFY_URL=$(jq -r .base_url "$CRED")
COOLIFY_TOKEN=$(jq -r .token "$CRED")
export COOLIFY_URL COOLIFY_TOKEN
tag=sha-$(git rev-parse --short=7 HEAD)

deploy() {
  local app=$1 uuid fqdn health
  uuid=$(jq -r --arg a "klokka-$app" '.applications[$a].uuid' "$CRED")
  fqdn=$(jq -r --arg a "klokka-$app" '.applications[$a].fqdn' "$CRED")
  health=$(jq -r --arg a "klokka-$app" '.applications[$a].health' "$CRED")
  .github/scripts/coolify-deploy.sh "$uuid" "$tag" "$fqdn$health"
  # coolify-deploy.sh returns once the new container answers its health URL, so this checks the new build. Staging
  # must stay out of search results, exactly as ci.yml checks after its deploy.
  if [ "$app" = landing ]; then .github/scripts/index-check.sh "$fqdn" noindex; fi
}

echo "Releasing ${targets[*]} at $tag to STAGING"
for app in "${targets[@]}"; do
  if [ ! -f "apps/$app/Dockerfile" ]; then
    if [ "${#targets[@]}" -gt 1 ]; then echo "== $app: no apps/$app/Dockerfile yet, skipped"; continue; fi
    echo "apps/$app/Dockerfile does not exist in this checkout" >&2
    exit 1
  fi
  echo "== $app"
  if [ "$app" = api ]; then
    JAVA_HOME=${KLOKKA_JAVA_HOME:-$HOME/.sdkman/candidates/java/25.0.2-amzn}
    export JAVA_HOME
    mvn_args=(-B -ntp -f apps/api/pom.xml clean install)
    [ "${SKIP_TESTS:-}" = 1 ] && mvn_args+=(-DskipTests)
    PATH="$JAVA_HOME/bin:$PATH" mvn "${mvn_args[@]}"
  fi
  .github/scripts/image.sh "$app" "$tag"
  deploy "$app"
done
echo "Done: ${targets[*]} at $tag"
