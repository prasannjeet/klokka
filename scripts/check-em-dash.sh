#!/usr/bin/env bash
# Repo-wide em dash gate for user-facing text (AGENTS.md). ESLint covers TS/JSX; this covers the string
# catalogue, the OpenAPI contract, SQL, Java and app sources, which ESLint never sees.
set -euo pipefail
cd "$(dirname "$0")/.."

paths=(
  packages/core/i18n
  packages/core/src
  packages/tokens/src
  packages/api-client/src/index.ts
  apps/api/contract/src/main/openapi
  apps/api/service/src
  apps/mobile/fastlane/metadata
)
existing=()
for p in "${paths[@]}"; do
  [ -e "$p" ] && existing+=("$p")
done
for p in apps/web/src apps/web/app apps/landing/src apps/landing/app apps/mobile/src apps/mobile/app; do
  [ -d "$p" ] && existing+=("$p")
done

if [ ${#existing[@]} -eq 0 ]; then
  echo "check-em-dash: nothing to scan"
  exit 0
fi

# U+2014 EM DASH. grep -P is not portable to every grep; the literal UTF-8 byte sequence is.
if hits=$(grep -rn --exclude-dir=node_modules --exclude-dir=generated --exclude-dir=target \
  --exclude='*.generated.ts' -e $'\xe2\x80\x94' "${existing[@]}"); then
  echo "check-em-dash: em dash found in user-facing sources:"
  echo "$hits"
  exit 1
fi
echo "check-em-dash: clean (${#existing[@]} paths)"
