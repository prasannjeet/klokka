#!/usr/bin/env bash
# Publish the API contract to Nexus (docs/DECISIONS.md D13), from the commit that is checked out:
#   - Maven com.prasannjeet.klokka:klokka-api-contract (+ its parent pom) to maven-snapshots or maven-releases;
#   - npm @klokka/api-client to npm-hosted, at the API version, or <version>-sha.<short sha> while the API
#     version is a -SNAPSHOT (dist-tag `next`; a release version gets `latest`).
# A version that already exists is skipped, never overwritten (maven-releases and npm-hosted are write-once).
#
# Env: NEXUS_USERNAME, NEXUS_PASSWORD (required); JAVA_HOME pointing at JDK 25; node + npm on PATH.
# Run from anywhere inside the repository. Used by .github/workflows/ci.yml (job `contract`).
set -euo pipefail

: "${NEXUS_USERNAME:?NEXUS_USERNAME is not set}"
: "${NEXUS_PASSWORD:?NEXUS_PASSWORD is not set}"
cd "$(git rev-parse --show-toplevel)"

NEXUS=https://nexus.coolify.ooguy.com
NPM_REGISTRY=$NEXUS/repository/npm-hosted/
GROUP_PATH=com/prasannjeet/klokka
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

version=$(mvn -B -q -f apps/api/pom.xml help:evaluate -Dexpression=project.version -DforceStdout 2>/dev/null |
  grep -E '^[0-9]+\.[0-9]+\.[0-9]+(-SNAPSHOT)?$' | tail -1 || true)
[ -n "$version" ] || { echo "could not read the API version from apps/api/pom.xml" >&2; exit 1; }
base=${version%-SNAPSHOT}
short=$(git rev-parse --short=7 HEAD)
# A numeric semver identifier may not start with 0; an all-digit short sha would make an invalid version.
[[ $short =~ ^0[0-9]*$ ]] && short=$(git rev-parse HEAD)
if [ "$version" != "$base" ]; then
  npm_version="$base-sha.$short"
  npm_tag=next
else
  npm_version=$base
  npm_tag=latest
fi
echo "API version $version, commit $short -> Maven $version, npm $npm_version ($npm_tag)"

# ---- Maven: the server ids match distributionManagement in apps/api/pom.xml; credentials stay in the env ----
cat >"$work/settings.xml" <<'XML'
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <servers>
    <server><id>nexus-releases</id><username>${env.NEXUS_USERNAME}</username><password>${env.NEXUS_PASSWORD}</password></server>
    <server><id>nexus-snapshots</id><username>${env.NEXUS_USERNAME}</username><password>${env.NEXUS_PASSWORD}</password></server>
  </servers>
</settings>
XML
maven_exists=false
if [ "$version" = "$base" ]; then
  pom_url="$NEXUS/repository/maven-releases/$GROUP_PATH/klokka-api-contract/$version/klokka-api-contract-$version.pom"
  code=$(curl -sS -o /dev/null -w '%{http_code}' -u "$NEXUS_USERNAME:$NEXUS_PASSWORD" -I "$pom_url")
  case "$code" in
    200) maven_exists=true ;;
    404) ;;
    *) echo "Nexus answered HTTP $code for $pom_url" >&2; exit 1 ;;
  esac
fi
if [ "$maven_exists" = true ]; then
  echo "Maven klokka-api-contract $version is already in maven-releases, skipping"
else
  mvn -B -ntp -s "$work/settings.xml" -f apps/api/pom.xml -pl contract -am deploy
fi

# ---- npm: publish a copy of the package so the checkout is never modified ----
auth=$(printf '%s:%s' "$NEXUS_USERNAME" "$NEXUS_PASSWORD" | base64 -w0)
npmrc="$work/npmrc"
printf '//%s:_auth=%s\n' "${NPM_REGISTRY#https://}" "$auth" >"$npmrc"
chmod 600 "$npmrc"
existing=$(npm view "@klokka/api-client@$npm_version" version --registry "$NPM_REGISTRY" --userconfig "$npmrc" 2>/dev/null ||
  true)
if [ "$existing" = "$npm_version" ]; then
  echo "npm @klokka/api-client@$npm_version is already in npm-hosted, skipping"
  exit 0
fi
mkdir "$work/pkg"
cp -R packages/api-client/package.json packages/api-client/src "$work/pkg/"
cp LICENSE "$work/pkg/"
# `private` guards the workspace against an accidental publish to npmjs; the copy drops it and takes the version.
(cd "$work/pkg" && npm pkg delete private && npm pkg set "version=$npm_version")
(cd "$work/pkg" && npm publish --tag "$npm_tag" --registry "$NPM_REGISTRY" --userconfig "$npmrc")
echo "published @klokka/api-client@$npm_version to $NPM_REGISTRY"
