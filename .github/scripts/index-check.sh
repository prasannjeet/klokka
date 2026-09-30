#!/usr/bin/env bash
# Check that the landing at <base-url> tells search engines what its build is meant to: `index` for production
# (release.yml, against the freshly built image) and `noindex` for everything else (ci.yml, against staging after
# the deploy). The flag behind it is NEXT_PUBLIC_INDEXABLE, baked in at build time (apps/landing/src/lib/links.ts).
#
#   index-check.sh <base-url> <index|noindex>
#
# For / and /en, one request each:
#   noindex: a <meta name="robots" content="noindex..."> tag AND an X-Robots-Tag header containing noindex.
#   index:   a <meta name="robots" content="index, follow..."> tag and no X-Robots-Tag header containing noindex.
# Prints one line per URL and exits 1 on the first mismatch (or failed request), 2 on a usage error.
set -euo pipefail

usage() { echo "usage: $0 <base-url> <index|noindex>" >&2; exit 2; }
if [ $# -ne 2 ]; then usage; fi
base=${1%/}
want=$2
[[ $base =~ ^https?://[^/]+$ ]] || { echo "not a base URL (scheme and host, no path): $1" >&2; exit 2; }
case "$want" in index | noindex) ;; *) usage ;; esac

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

check() {
  local url=$base$1 meta header
  curl -sf --max-time 15 -D "$work/headers" -o "$work/body" "$url" ||
    { echo "FAIL $url: the request failed"; exit 1; }
  # Next renders the tag as <meta name="robots" content="..."/>; empty when there is none.
  meta=$(grep -o '<meta name="robots" content="[^"]*"' "$work/body" | head -1 | sed 's/.*content="//; s/"$//' || true)
  header=$(tr -d '\r' <"$work/headers" | grep -i '^x-robots-tag:' | sed 's/^[^:]*:[[:space:]]*//' | paste -sd, - || true)
  if [ "$want" = noindex ]; then
    [[ $meta == noindex* ]] || { echo "FAIL $url: robots meta is '${meta:-absent}', want noindex"; exit 1; }
    [[ $header == *noindex* ]] || { echo "FAIL $url: X-Robots-Tag is '${header:-absent}', want noindex"; exit 1; }
  else
    [[ $meta == 'index, follow'* ]] || { echo "FAIL $url: robots meta is '${meta:-absent}', want index, follow"; exit 1; }
    [[ $header != *noindex* ]] || { echo "FAIL $url: X-Robots-Tag is '$header', want no noindex"; exit 1; }
  fi
  echo "ok   $url: $want (robots meta '$meta', X-Robots-Tag '${header:-absent}')"
}

check /
check /en
