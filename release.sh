#!/usr/bin/env bash
# Cut a PRODUCTION release: bump the version, commit, tag v<version> and push both. The pushed tag runs
# .github/workflows/release.yml, which builds klokka-{api,web,landing}:v<version> and the production APK with the
# PROD_* repository variables. Nothing is deployed: pin the tag in production Coolify by hand (docs/RELEASING.md).
#
#   ./release.sh 1.2.3     explicit version
#   ./release.sh patch     1.2.3 -> 1.2.4, from the highest v* tag
#   ./release.sh minor     1.2.3 -> 1.3.0
#   ./release.sh major     1.2.3 -> 2.0.0
#
# The bump writes the version into apps/api (three poms) and apps/mobile/app.config.ts (version, and versionCode + 1
# so a phone accepts the APK as an update), as one "Release v<version>" commit on main. Staging deploys that commit
# like any other push. For a manual staging deploy, see ./deploy-staging.sh.
set -euo pipefail
cd "$(dirname "$0")"

usage() { echo "usage: $0 <major.minor.patch>|patch|minor|major" >&2; exit 2; }
[ $# -eq 1 ] || usage

branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = main ] || { echo "releases are cut from main, not $branch" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "the working tree is not clean" >&2; exit 1; }
git fetch -q origin main --tags
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] ||
  { echo "main is not in sync with origin/main (pull or push first)" >&2; exit 1; }

latest=$(git tag --list 'v*' --sort=-v:refname | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)
latest=${latest#v}
IFS=. read -r major minor patch <<<"${latest:-0.0.0}"
case "$1" in
  patch) version=$major.$minor.$((patch + 1)) ;;
  minor) version=$major.$((minor + 1)).0 ;;
  major) version=$((major + 1)).0.0 ;;
  *)
    [[ $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || usage
    version=$1
    ;;
esac
tag=v$version
if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then echo "$tag already exists" >&2; exit 1; fi
if [ -n "$latest" ] && [ "$(printf '%s\n%s\n' "$latest" "$version" | sort -V | tail -1)" != "$version" ]; then
  echo "$tag is not above the latest release v$latest" >&2
  exit 1
fi

current=$(sed -n 's:.*<version>\(.*\)</version>.*:\1:p' apps/api/pom.xml | head -1)
for pom in apps/api/pom.xml apps/api/contract/pom.xml apps/api/service/pom.xml; do
  # The first <version> is the project's (parent pom) or its parent reference (modules).
  sed -i "0,/<version>$current<\/version>/s//<version>$version<\/version>/" "$pom"
  grep -q "<version>$version</version>" "$pom" || { echo "could not set the version in $pom" >&2; exit 1; }
done
config=apps/mobile/app.config.ts
code=$(sed -n 's/^    versionCode: \([0-9]\+\),$/\1/p' "$config")
[ -n "$code" ] || { echo "no versionCode in $config" >&2; exit 1; }
sed -i "s/^  version: '.*',$/  version: '$version',/; s/^    versionCode: $code,$/    versionCode: $((code + 1)),/" "$config"
grep -q "^  version: '$version',$" "$config" || { echo "could not set the version in $config" >&2; exit 1; }

echo "Releasing $tag (previous: ${latest:+v}${latest:-none}; API $current -> $version; APK versionCode $code -> $((code + 1)))"
git add apps/api/pom.xml apps/api/contract/pom.xml apps/api/service/pom.xml "$config"
git commit -q -m "Release $tag"
git tag -a "$tag" -m "Klokka $tag"
git push -q origin main
git push -q origin "$tag"
echo "Pushed $tag: .github/workflows/release.yml now builds the production images and APK."
echo "Follow it with: gh run watch \$(gh run list --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId')"
