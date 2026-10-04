#!/usr/bin/env bash
# Google Play listing gate (docs/PLAY_STORE.md): every text file in both languages, within Play's limits, and the
# same business-model rule as the landing (free to use, never prices, tiers or seats; apps/landing/test/pages.test.ts).
set -euo pipefail
# wc -m counts characters only in a UTF-8 locale (in C it counts bytes, and å, ä, ö count twice).
export LC_ALL=C.UTF-8
cd "$(dirname "$0")/../apps/mobile/fastlane/metadata/android"

fail=0
check() { # file max
  local file=$1 max=$2 text length
  if [ ! -s "$file" ]; then echo "check-play-metadata: $file is missing or empty"; fail=1; return; fi
  text=$(cat "$file")
  length=$(printf '%s' "$text" | wc -m)
  if [ "$length" -gt "$max" ]; then echo "check-play-metadata: $file has $length characters, Play allows $max"; fail=1; fi
  if printf '%s' "$text" | grep -qiE '\b(pric(e|es|ing)|tiers?|seats?|subscriptions?|premium|paid plans?|pris(er|plan)?|abonnemang|licensavgift|per användare)\b'; then
    echo "check-play-metadata: $file talks about pricing"; fail=1
  fi
}
for lang in sv-SE en-US; do
  check "$lang/title.txt" 30
  check "$lang/short_description.txt" 80
  check "$lang/full_description.txt" 4000
  check "$lang/changelogs/default.txt" 500
  if grep -qi personalliggare "$lang/title.txt" 2>/dev/null; then
    echo "check-play-metadata: $lang/title.txt names personalliggare (Klokka is not one)"; fail=1
  fi
done
[ "$fail" -eq 0 ] && echo "check-play-metadata: clean"
exit "$fail"
