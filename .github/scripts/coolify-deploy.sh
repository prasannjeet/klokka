#!/usr/bin/env bash
# Deploy one immutable image tag to a Klokka app on STAGING Coolify, wait for the deployment to finish and,
# optionally, for a health URL to answer. Used by .github/workflows/ci.yml and by ./release.sh.
#
#   coolify-deploy.sh <app-uuid> <image-tag> [health-url]
#
# Env: COOLIFY_TOKEN (write scope, required), COOLIFY_URL (default https://coolify.coolify.ooguy.com).
# The one call that pins AND deploys the tag is PATCH /api/v1/applications/{uuid}
# {"docker_registry_image_tag": "<tag>", "instant_deploy": true} (~/.agents/production-deploys.md section 4).
# Every wait is bounded: at most 40 polls, 15 s apart.
set -euo pipefail

usage() { echo "usage: $0 <app-uuid> <image-tag> [health-url]" >&2; exit 2; }
if [ $# -lt 2 ] || [ $# -gt 3 ]; then usage; fi
APP_UUID=$1
TAG=$2
HEALTH_URL=${3:-}
COOLIFY_URL=${COOLIFY_URL:-https://coolify.coolify.ooguy.com}
: "${COOLIFY_TOKEN:?COOLIFY_TOKEN is not set}"
MAX_POLLS=40
POLL_SECONDS=15

# Staging only. Production is a v*-tag path of its own, never this script.
case "$COOLIFY_URL" in
  https://coolify.coolify.ooguy.com) ;;
  *) echo "refusing to deploy: $COOLIFY_URL is not the staging Coolify" >&2; exit 2 ;;
esac
[[ $APP_UUID =~ ^[a-z0-9]{24}$ ]] || { echo "not a Coolify uuid: $APP_UUID" >&2; exit 2; }
[[ $TAG =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || { echo "not a docker tag: $TAG" >&2; exit 2; }

API="$COOLIFY_URL/api/v1"
warn() { if [ "${GITHUB_ACTIONS:-}" = true ]; then echo "::warning::$*"; else echo "WARNING: $*"; fi; }

body_file=$(mktemp)
trap 'rm -f "$body_file"' EXIT

auth=(-H "Authorization: Bearer $COOLIFY_TOKEN" -H 'Accept: application/json')
# Coolify's deployment records do not carry the image tag of an API deploy, so the deployment this call queues is
# found as "the newest record that was not there before the PATCH".
latest_deployment() {
  curl -sS --max-time 30 "${auth[@]}" "$API/deployments/applications/$APP_UUID?skip=0&take=1" |
    jq -r '.deployments[0].deployment_uuid // "none"'
}
before=$(latest_deployment)

echo "Deploying $TAG to Coolify app $APP_UUID"
code=$(curl -sS --max-time 60 -o "$body_file" -w '%{http_code}' -X PATCH "${auth[@]}" \
  -H 'Content-Type: application/json' \
  -d "{\"docker_registry_image_tag\":\"$TAG\",\"instant_deploy\":true}" \
  "$API/applications/$APP_UUID")
echo "PATCH -> HTTP $code: $(cat "$body_file")"
if [ "$code" != 200 ]; then
  echo "Coolify rejected the deploy" >&2
  exit 1
fi
# 200 + {"uuid"} = queued; 200 + {"message"} = the tag was pinned but no new deployment was queued (one for this
# exact tag is already queued or running). Say so distinctly, then wait for that one like any other.
skipped=false
if jq -e 'has("message")' "$body_file" >/dev/null; then
  warn "Coolify did not queue a new deployment: $(jq -r .message "$body_file")"
  skipped=true
elif ! jq -e '.uuid' "$body_file" >/dev/null; then
  echo "unexpected Coolify response" >&2
  exit 1
fi

deployment=""
status=""
for i in $(seq 1 "$MAX_POLLS"); do
  if [ -z "$deployment" ]; then
    newest=$(latest_deployment || echo none)
    if [ "$newest" != none ] && { [ "$newest" != "$before" ] || [ "$skipped" = true ]; }; then
      deployment=$newest
      echo "Coolify deployment $deployment"
    fi
  fi
  if [ -n "$deployment" ]; then
    status=$(curl -sS --max-time 30 "${auth[@]}" "$API/deployments/$deployment" | jq -r '.status // "unknown"' ||
      echo unreachable)
  else
    status="no deployment record yet"
  fi
  echo "deployment poll $i/$MAX_POLLS: $status"
  case "$status" in
    finished) break ;;
    failed | cancelled*) echo "Coolify deployment $deployment of $TAG ended as $status" >&2; exit 1 ;;
  esac
  [ "$i" -lt "$MAX_POLLS" ] && sleep "$POLL_SECONDS"
done
[ "$status" = finished ] || { echo "deployment of $TAG did not finish within $((MAX_POLLS * POLL_SECONDS)) s" >&2; exit 1; }

[ -n "$HEALTH_URL" ] || exit 0
for i in $(seq 1 "$MAX_POLLS"); do
  hcode=$(curl -sS --max-time 10 -o "$body_file" -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)
  echo "health poll $i/$MAX_POLLS: HTTP ${hcode:-000}"
  if [ "$hcode" = 200 ]; then
    echo "healthy: $HEALTH_URL $(head -c 300 "$body_file")"
    exit 0
  fi
  [ "$i" -lt "$MAX_POLLS" ] && sleep "$POLL_SECONDS"
done
echo "$HEALTH_URL did not answer 200 within $((MAX_POLLS * POLL_SECONDS)) s; last body: $(head -c 500 "$body_file")" >&2
exit 1
