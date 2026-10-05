#!/usr/bin/env bash
# Google Play phone screenshots (CHQ-153): each raw capture (1080x2340 from the test phone, docs: android-test-phone
# skill) goes onto a 1080x1920 Nightshift canvas under a caption from play-screens.json, because Play rejects a side
# more than twice the other. Usage: play-screens.sh <raw dir with <lang>-<name>.png> ; writes into the fastlane
# metadata folders. Needs ImageMagick 7 and the repo's node_modules (fonts).
set -euo pipefail
cd "$(dirname "$0")/../../.."
raw=${1:?raw screenshot directory}
night='#0D0620'; lavender='#F5F1FF'
font=node_modules/@expo-google-fonts/unbounded/800ExtraBold/Unbounded_800ExtraBold.ttf
captions=docs/brand/social/play-screens.json
for lang in sv-SE en-US; do
  out=apps/mobile/fastlane/metadata/android/$lang/images/phoneScreenshots
  rm -rf "$out" && mkdir -p "$out"
  for name in $(python3 -c "import json,sys;print(' '.join(json.load(open('$captions'))))"); do
    src="$raw/$lang-$name.png"
    [ -f "$src" ] || { echo "missing $src"; exit 1; }
    caption=$(python3 -c "import json;print(json.load(open('$captions'))['$name']['$lang'])")
    # Screenshot at 1520 px tall with rounded corners, on the canvas below a 300 px caption band.
    magick "$src" -resize x1520 \
      \( +clone -alpha extract -fill black -colorize 100 -fill white -draw "roundrectangle 0,0 %[fx:w-1],%[fx:h-1] 44,44" \) \
      -alpha off -compose CopyOpacity -composite /tmp/play-shot.png
    magick -size 1080x1920 "xc:$night" \
      \( -size 960x220 -background none -fill "$lavender" -font "$font" -gravity center caption:"$caption" \) \
      -gravity north -geometry +0+50 -composite \
      /tmp/play-shot.png -gravity north -geometry +0+330 -composite \
      -alpha off -depth 8 "$out/$name.png"
  done
done
rm -f /tmp/play-shot.png
echo "play-screens: wrote $(ls apps/mobile/fastlane/metadata/android/*/images/phoneScreenshots/*.png | wc -l) screenshots"
