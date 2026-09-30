# Link-preview, icon and store image specs for Klokka (researched 2026-09-29)

Scope: what klokka.se (Next.js 16.3 App Router, `sv` at `/`, `en` at `/en`) and app.klokka.se need to ship so every
share surface, browser, search result and store listing renders a good image.

Legend for confidence:
- **[official]** quoted from the platform's own docs or source code (link given).
- **[source]** read from the platform's open-source client/server code.
- **[observed]** community-tested behaviour, no official doc. Treat as likely, not guaranteed.

## 0. Bottom line

1. **One 1200x630 PNG/JPEG per language as `og:image` + `twitter:image`** covers every platform. Design it so the
   essential mark/wordmark survives a centre square crop (central ~560x560) and a 2:1 crop (15 px off top and bottom).
2. **Do not add a second (square) `og:image`.** The OGP spec gives the *first* tag preference, Mastodon and Signal
   read only the first, and behaviour of the others with multiple tags is undocumented. Square fallbacks on small
   previews come from the **apple-touch-icon / favicon**, not from a second og:image.
3. **Icons:** `favicon.ico` (16+32+48), `icon.svg`, a PNG `icon` of 96 or 192 px (Google Search does not list SVG as a
   supported favicon format), `apple-icon` 180, manifest 192 + 512 (`any`) + 512 (`maskable`, separate file).
   Safari `mask-icon` and Windows tiles are obsolete.
4. **Weight:** keep each OG image under 300 KB (WhatsApp's documented cap is 600 KB, Bluesky's thumb blob is 1 MB and
   Signal's fetch cap is 2 MB). The current staging images are ~116 KB PNG, which is fine.
5. **Formats:** use PNG or JPEG. X and Mastodon document WebP support, but Meta, LinkedIn, WhatsApp and Apple don't, and
   the Next.js static file convention accepts only jpg/png/gif. Never SVG (X says outright that it is unsupported).

## 1. Platform table

| Platform | Tags read | Recommended | Aspect | Min | Max file | Formats | Crop / display behaviour | Cache / refresh |
|---|---|---|---|---|---|---|---|---|
| **Facebook / Messenger** | `og:image` (+`:width`/`:height`/`:alt`/`:type`) | 1200x630 or larger **[official]** | 1.91:1 "to display the full image in Feed without any cropping" **[official]** | 200x200 hard floor; 600x315 practical minimum **[official]** | 8 MB **[official]** | Docs don't list formats. JPEG/PNG are safe, WebP renders **[observed]** | Off-ratio images get cropped. Small images show as a small thumbnail | Cached **by image URL**: "won't be updated unless the URL changes" **[official]**. Sharing Debugger re-scrapes the page. OG tags must be in the first 1 MB of HTML **[official]** |
| **LinkedIn** | `og:image` (ignores `twitter:*`) | 1200x627 **[official]** | 1.91:1 **[official]** | 1200x627 stated as minimum. Under 401 px wide renders as a small thumbnail **[official]** | 5 MB **[official]** | JPG/PNG safe. WebP was reportedly added Dec 2024 **[observed]** | Full-width card at 1.91:1 | ~7-day cache **[observed]**. Post Inspector (linkedin.com/post-inspector) forces a refresh, which only affects *new* posts **[official]** |
| **X (Twitter)** | `twitter:card`, `twitter:image` → falls back to `og:image` **[official]** | 1200x630 works (2:1 crop of 15 px top and bottom) | `summary_large_image`: 2:1. `summary`: 1:1 | 300x157 (large), 144x144 (summary). Max 4096x4096 **[official]** | < 5 MB **[official]** | JPG, PNG, WEBP, GIF (first frame). **SVG not supported** **[official]** | 2:1 centre crop for large. `summary` is "cropped to a square on all platforms" **[official]** | Re-crawled "roughly every seven days" **[official]**. The Card Validator lost its preview in 2022 **[observed]**. To bust the cache, share a URL variant (e.g. `?v=2`) |
| **WhatsApp** | `og:title`, `og:description`, `og:url` required and non-empty, `og:image` **[official]** | 1200x630 | ≤ 4:1 **[official]** | ≥ 300 px wide **[official]** | **< 600 KB** **[official]**. Some reports say it silently drops > ~300 KB **[observed]** | Not documented. JPEG/PNG safe | `<head>` must be within the first 300 KB of HTML **[official]**. Large full-width preview for wide images. Small square thumbnail (centre crop) in compact layouts, older clients and some chats **[observed]** | Fetched by the sender's device and cached there. No refresh tool. Change the URL (query string) to force a refetch |
| **iMessage / Apple Messages** | `og:image`, `og:title` (no site name in title), `og:site_name`, `og:video`, `twitter:card`. Icon from `apple-touch-icon`, favicon or `<link rel>` **[official]** | ≥ 900 px wide **[official]** | Not specified. 1.91:1 shows large | Images < 150 px wide "may be ignored or presented as icons". Icons square ≥ 108 px **[official]** | Page HTML ≤ 1 MB. All resources (icons, images, video) ≤ 10 MB **[official]** | Not specified. JPEG/PNG safe | Apple: "Avoid text in preview images... may be displayed at varying sizes". Doesn't run JS or follow meta refresh **[official]** | Sender device fetches at send time. No tool |
| **Slack** | oEmbed, Twitter Card and Open Graph tags **[official]**. Order oEmbed > Twitter > OG **[observed]** | 1200x630 | any | small images → thumbnail on the right **[observed]** | not documented | JPEG/PNG/GIF | Large image or small right-aligned thumbnail depending on size **[observed]** | Cached globally ~30 min **[official]**. No public refresh tool. UA `Slackbot-LinkExpanding 1.0` |
| **Discord** | `og:*`, `theme-color` (embed accent bar). `twitter:card=summary_large_image` switches to the large image layout **[observed]** | 1200x630 | ~1.91:1 to 2:1 | not documented | not documented (8 MB is often quoted) **[observed]** | PNG/JPEG/GIF/WebP **[observed]** | Large image under the text with `summary_large_image`, otherwise a small thumbnail on the right **[observed]** | No official doc or refresh tool. Append a query string |
| **Telegram** | `og:*`, `twitter:card` **[observed]** | 1200x630 | ~1.91:1 | ~200x200 **[observed]** | ~5 MB **[observed]** | JPEG/PNG | Large media under the text or a small square thumbnail on the right (centre crop). Senders can toggle "larger/smaller media" | Server-side cache with no documented expiry. **@WebpageBot**: send it the URL to re-crawl **[observed]** |
| **Signal** | `og:*` via regex on `property="og:..."` (double-quoted). Falls back to favicon when there is no og:image **[source]** | 1200x630 | any | n/a | **2 MB** fetch cap. Re-compressed to JPEG in the client **[source]** | anything Android can decode | Previews only for **https** URLs **[source]** | Sender device fetches at send time |
| **Microsoft Teams** | Generic links: OG tags **[observed]**. Rich app-less previews from schema.org JSON-LD "micro-capabilities" **[official]** | 1200x630 | any | n/a | n/a | JPEG/PNG | Card with image, title, description | Unfurl result cached 30 min **[official]** (documented for app unfurls). UA `SkypeUriPreview` |
| **Mastodon** | **first** `og:image`, `og:image:alt`, `og:title`, `og:description`, `og:site_name`, `fediverse:creator`, JSON-LD **[source]** | 1200x630 | any | n/a | **8 MB**. Resized to 230,400 px area (640x360) **[source]** | JPEG, PNG, GIF, WebP **[source]** | Card with the image at 16:9-ish | Card re-fetched only if older than **2 weeks** **[source]**. Each instance fetches separately |
| **Bluesky** | `og:title`, `og:description`, **first** `og:image` (via the app's cardyb proxy) **[official]** | 1200x630 | any | n/a | thumb blob **1,000,000 bytes**. The app downscales to 2000 px / 1 MB with a 15 s download timeout **[source]** | `image/*` | Client composes the card at post time and stores it in the record | No server cache. Each new post re-fetches |
| **Pinterest (Rich Pins)** | OG + schema.org, auto-synced, updates within ~24 h **[official]** | For link Pins the og:image is used as-is. Native Pins prefer 1000x1500 (2:3) **[observed]** | - | - | - | JPEG/PNG | 1.91:1 shows letterboxed/small in the grid | Not a launch priority for a B2B SaaS |
| **Reddit** | `og:image` **[observed]** | 1200x630 | - | - | - | JPEG/PNG | Small square thumbnail (centre crop) in feed, larger in post view **[observed]** | No tool |
| **Google Search / Discover** | `og:image`, schema.org `image`, `max-image-preview:large` **[official]** | ≥ 1200 px wide, > 300,000 px, 16:9 **[official]** | 16:9 | - | - | JPEG/PNG/WebP | Discover crops toward 16:9 (1120x630 from a 1200x630). "Avoid using generic images (for example, your site logo)", "avoid text-heavy images" **[official]** | Normal recrawl |

Notes on the table:
- X's docs pages moved off developer.x.com in 2026 and the card pages are no longer live on docs.x.com. The X numbers
  are quoted from the last published version (Wayback snapshots of 2026-01/02). Next.js still cites them for its build
  limit.
- **Next.js limits:** static `opengraph-image` files over 8 MB and `twitter-image` files over 5 MB fail the build
  **[official]**.

## 2. Minimal image set for link previews

| File | Pixels | Format | Tag(s) | Why |
|---|---|---|---|---|
| `og.png` (sv) | **1200x630** | PNG (flat art, < 300 KB) or JPEG q80-85 if it has photos/gradients | `og:image` + `og:image:width=1200` `:height=630` `:type` `:alt`, **and** `twitter:image` (same URL), `twitter:card=summary_large_image` | Meets FB (≥1200x630, 1.91:1), LinkedIn (1200x627), X (2:1 with a 15 px crop), WhatsApp (≥300 wide, <600 KB), Apple (≥900 wide), Discover (≥1200 wide, >300k px) |
| `og-en.png` (en) | 1200x630 | same | same, on `/en` | Language-specific copy. Both already exist as route handlers in `apps/landing/src/app/og*.png/route.tsx` |

That is the whole set. What was considered and rejected:

- **A separate 1200x600 `twitter-image`:** not needed. X centre-crops 1200x630 to 2:1 by trimming 15 px top and
  bottom. Keep 40 px or more of vertical margin and the crop is invisible.
- **A 1200x1200 square second `og:image` for WhatsApp/iMessage:** not recommended.
  - OGP spec: "The first tag (from top to bottom) is given preference during conflicts." **[official]**
  - Mastodon (`at_xpath`, first match), Signal (a regex map, so effectively one value) and Bluesky (`soup.find`, first)
    read **one** image **[source]**. Facebook's docs describe multiple images but not which one a share card uses.
  - For WhatsApp, community reports conflict on first vs last tag **[observed]**. No platform documents a "best fit"
    choice between several og:image tags.
  - So a second image adds risk and no documented benefit. The small-square previews in iMessage, Signal, Slack and
    Telegram draw on the **icon** (apple-touch-icon/favicon) or a centre crop of the main image. The fix is a
    crop-safe layout (section 5), not a second image.
- **A 1200x675 (16:9) main image:** it would suit Discover slightly better, but Discover is for articles and
  recommends against logo/text images anyway. 1.91:1 is the native ratio of FB and LinkedIn, the two strictest.

If a page later needs a different image (e.g. a blog post), use the file convention per segment
(`app/[lang]/blog/[slug]/opengraph-image.tsx`, `size = {width:1200,height:630}`, `contentType='image/png'`). File-based
metadata overrides the `metadata` object **[official]**. Nested `openGraph` objects are **shallow-merged and replaced
per segment**, so a child that sets `openGraph` without `images` loses the parent's image **[official]**.

### Next.js 16 implementation notes (from the docs, v16.3.7)
- File conventions: `opengraph-image.(jpg|jpeg|png|gif)` / `twitter-image.(...)` or `.(js|ts|tsx)` generating via
  `ImageResponse` (always PNG). `opengraph-image.alt.txt` emits `og:image:alt`. Config exports: `alt`, `size`,
  `contentType`. `params` is a Promise since v16. Generated images are statically optimized unless they use
  request-time APIs.
- `generateImageMetadata` returns `[{id, size, alt, contentType}]` and emits one tag per item. Useful for icon sizes,
  not for adding a second og:image (see above).
- `metadataBase` is needed for relative URLs. A relative URL without it is a **build error** **[official]**. Klokka
  already sets `metadataBase: new URL(siteUrl)` and passes absolute URLs.
- **Streaming metadata:** with a dynamic `generateMetadata`, Next streams metadata into `<body>` except for UAs in
  `htmlLimitedBots`. The default list covers facebookexternalhit, Twitterbot, LinkedInBot, Slackbot, Discordbot,
  WhatsApp, SkypeUriPreview (Teams), redditbot, applebot and Google/Bing. **It does not cover TelegramBot, Mastodon,
  Bluesky's cardyb, Pinterestbot or Signal** **[source]**. The landing pages are statically prerendered, so the
  metadata is in `<head>` regardless. If any shared page becomes dynamic, set `htmlLimitedBots: /.*/` or extend the
  regex.

## 3. Icon / favicon set

| File (Next.js convention) | Size(s) | Format | Emits | Consumer |
|---|---|---|---|---|
| `app/favicon.ico` | **16, 32, 48** layers | ICO | `<link rel="icon" href="/favicon.ico" sizes="any">` | Legacy browsers, plus tools that request `/favicon.ico` blindly. **Currently 404 on the landing (staging checked)** |
| `app/icon.svg` (or the existing `icon.tsx` returning SVG) | vector | SVG, may carry `prefers-color-scheme` | `rel=icon type=image/svg+xml` | Modern browser tabs |
| `app/icon1.png` (or `icon.tsx` + `generateImageMetadata`) | **96x96** (or 192) | PNG | `rel=icon sizes=96x96` | **Google Search:** supported formats are "BMP, GIF, ICO, PNG, JPEG, PPM, and TIFF" (SVG is not listed), square, ≥ 8x8, "larger than 48x48px" recommended, stable URL, one favicon per **hostname** **[official, updated 2026-08-28]** |
| `app/apple-icon.png` / `apple-icon.tsx` | **180x180** | PNG, **opaque** background, ~20 px padding | `rel=apple-touch-icon sizes=180x180` | iOS home screen, iMessage preview icon (≥ 108 px), and Google accepts `apple-touch-icon` as a favicon source **[official]**. Already exists |
| manifest icon | **192x192** | PNG, `purpose: "any"` | manifest | Android/Chrome install |
| manifest icon | **512x512** | PNG, `purpose: "any"` | manifest | Splash / install |
| manifest icon | **512x512** | PNG, `purpose: "maskable"`, full-bleed background | manifest | Masked launchers. Safe zone: "a circular area in the center of the icon with a radius equal to 40% of the icon width" (a ~410 px circle on 512). **Use a separate file, not `"any maskable"`** **[official, web.dev]** |

Notes:
- The "multiple of 48 px" rule is **gone** from Google's current favicon doc. It now reads "at least 8x8px ...
  recommend ... larger than 48x48px". 48, 96, 144 and 192 remain safe choices.
- **Safari pinned tab (`mask-icon`): obsolete.** "Since Safari 12, we can use a regular favicon for pinned tabs"
  (Evil Martians favicon guide, the one the Next.js docs link to, updated 2026-01-21).
- **Windows tiles (`browserconfig.xml`, `msapplication-*`): obsolete.** "For recent versions of Windows, this is no
  longer required" (same source).
- Next.js: `favicon` is only valid in the root `app/` and cannot be generated. `icon` accepts
  ico/jpg/png/svg. `apple-icon` accepts jpg/png only (no SVG). Numbered files (`icon1.png`, `icon2.png`) sort
  lexically **[official]**.
- **app.klokka.se** is its own hostname, so Google treats it as its own site for favicons. It is `noindex`, so Search
  doesn't matter there, but browser tabs, bookmarks and link unfurls of app URLs (Slack and Signal fall back to the
  favicon) still need icons. Today `apps/web` only has an SVG `icon.tsx`. Add the same `favicon.ico`, `apple-icon` (180)
  and a PNG icon there.
- The current landing manifest lists only `/logo.png` 512 with no `purpose`. Add 192 + 512 `any` + 512 `maskable`.
- The native Android app (Expo) uses adaptive icons, which is separate from the above: 108x108 dp layers, **66x66 dp
  safe zone**, 72x72 dp visible, plus an optional monochrome layer for Android 13+ theming **[official]**. The assets
  already exist in `apps/mobile/assets/adaptive-icon-*`.

## 4. Other brand-image surfaces for launch

| Surface | Size | Format / limit | Notes | Source |
|---|---|---|---|---|
| **GitHub repo social preview** (`prasannjeet/klokka`) | **1280x640** (min 640x320) | PNG/JPG/GIF, **< 1 MB** | Transparent PNG renders differently per platform and theme, so use a solid background. This image becomes the og:image when the repo URL is shared | [GitHub docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview) **[official]** |
| **Google Play app icon** | **512x512** | 32-bit PNG with alpha, sRGB, **≤ 1024 KB** | Full square, no rounded corners, no drop shadow. Play applies a 30% corner radius and the shadow itself. Avoid transparency | [Play icon spec](https://developer.android.com/distribute/google-play/resources/icon-design-specifications), [Play preview assets](https://support.google.com/googleplay/android-developer/answer/9866151) **[official]** |
| **Google Play feature graphic** | **1024x500** | JPEG or 24-bit PNG, **no alpha** | Keep the focal point centred and away from the edges (cropped in some layouts). Required for featuring | same **[official]** |
| **Google Play phone screenshots** | 2 to **8** per device type. Each side 320 to 3840 px, long side ≤ 2x short side | JPEG or 24-bit PNG, no alpha | For promotion eligibility: **≥ 4 screenshots at ≥ 1080 px**, i.e. **1080x1920 (9:16) portrait** or 1920x1080 landscape | same **[official]** |
| Google Play tablet screenshots | ≥ 4, 1080 to 7680 px, 16:9 or 9:16 | same | Only if listing for tablets | same **[official]** |
| Google Play preview video | YouTube URL, public/unlisted, ads off, embeddable | - | Optional | same **[official]** |
| **LinkedIn Page logo** | **400x400** recommended (268x268 min) | PNG/JPEG, ≤ 3 MB | Shown in a circle/rounded square in many places, so keep the mark centred | [LinkedIn Help a563309](https://www.linkedin.com/help/linkedin/answer/a563309) **[official]** |
| **LinkedIn Page cover** | **1512x256** (min and recommended) | PNG/JPEG, ≤ 3 MB | The widely quoted 1128x191 is the old spec. The logo overlaps the bottom-left, so keep text centred/right | same **[official]** |
| **X profile photo** | **400x400** | JPG/PNG/GIF (no animation) | Displayed as a circle | X Help Center "How to upload X profile photos and headers" (page blocks fetches; numbers via search snippet) |
| **X header** | **1500x500** (3:1) | JPG/PNG/GIF | "Up to 60 px at the top and bottom ... can be cropped", and the avatar overlaps the bottom-left | same |
| **Product Hunt thumbnail** | **240x240** | PNG/JPG/GIF (animates on hover, so the first frame matters), **< 3 MB** | Square | [PH: Preparing for launch](https://www.producthunt.com/launch/preparing-for-launch) **[official]** |
| **Product Hunt gallery** | **1270x760**, ≥ 2 images | PNG/JPG/GIF, < 3 MB | First image = the main visual on the launch page. Video is YouTube only | same **[official]** |
| **AlternativeTo logo** | **no published spec found** | - | The upload form takes a square logo. Supply the 512x512 PNG icon (transparent or solid). **Uncertain** | - |
| app.klokka.se favicon | same set as section 3 | - | Separate hostname. See section 3 | - |

A master **1024x1024** mark on a transparent background and a **1024x1024 on a solid brand background** will serve
every square slot above (Play 512, LinkedIn 400, X 400, PH 240, AlternativeTo) by downscaling.

## 5. Text safe area (one 1200x630 image, many crops)

Crops a 1200x630 image goes through:

| Crop | Resulting region | What is lost |
|---|---|---|
| X `summary_large_image` 2:1 | 1200x600 | 15 px top + 15 px bottom |
| 16:9 (Discover and some cards) | 1120x630 | 40 px left + 40 px right |
| **Centre square** (WhatsApp/Telegram/Reddit/Slack/Discord small thumbnails, X `summary`) | **630x630 at x = 285..915** | **285 px on each side (47.5% of the width)** |
| Circle-ish avatars/icons (rare for OG) | ~630 px circle | corners of the square |

Rules for the Klokka card:
- **Everything that must survive a square crop (the mark, and the wordmark if it should be readable) sits inside
  the centre 560x560** (x 320..880, y 35..595), which gives ~35 px of breathing room inside the 630 square.
- **The headline and tagline can use the full width but should stay inside x 60..1140, y 60..570** (60 px margins).
  They will be cut in square thumbnails, which is acceptable because those thumbnails are tiny (≈ 60 to 100 px) and
  the title and description are shown as text next to them anyway.
- Apple's guidance is to "avoid text in preview images" and to let `og:title`/`og:description` carry the text. Google
  Discover says to avoid text-heavy images. So one short line of large type (≥ 60 px cap height at 1200 wide) plus the
  mark beats a paragraph.
- Practical layout that satisfies all crops: **mark centred** (or centre-left inside x ≤ 880) with the wordmark under
  it in the centre square, and the short sv/en headline spanning the width below or around it. Avoid a hard left/right
  split where the logo sits in the outer 285 px bands.

## 6. Performance, formats, delivery

- **File weight target: ≤ 300 KB per OG image** (WhatsApp documents < 600 KB, with reports of failures above ~300 KB
  **[observed]**. Signal caps at 2 MB. Bluesky thumbs cap at 1 MB and larger images are recompressed. FB allows 8 MB and
  LinkedIn 5 MB). Flat vector-style art compresses best as PNG (current staging: 116 KB). Use JPEG q80-85 only if the
  card gains photos or heavy gradients.
- **Formats per crawler:**
  - PNG and JPEG: universally safe.
  - WebP: documented for X and Mastodon. Undocumented for Meta, WhatsApp, LinkedIn and Apple, where community
    testing says it mostly works (LinkedIn reportedly since Dec 2024) **[observed]**. Not worth the risk for a
    ~100 KB file.
  - Next.js static `opengraph-image` files accept only jpg/jpeg/png/gif, and `ImageResponse` emits PNG.
  - AVIF: avoid. SVG: never (X explicitly unsupported; Google favicon list excludes it).
- **Absolute https URLs** for `og:image`. FB, Telegram and Signal need absolute URLs. Signal only previews `https`
  links **[source]**. `og:image:secure_url` is redundant when `og:image` is already https.
- **Always emit `og:image:width`/`:height`**: FB renders on first share without downloading the image first
  **[official]**. Discord and WhatsApp also use them to pick the layout **[observed]**.
- **Cache headers:** crawlers largely ignore them. What matters is that **the URL changes when the image changes**,
  because FB caches by image URL permanently **[official]**, Telegram indefinitely and LinkedIn ~7 days. Staging
  currently serves `og.png` with `Cache-Control: public, max-age=0, must-revalidate`. That is harmless, but better:
  - `public, max-age=86400, stale-while-revalidate=604800` on a stable URL, and
  - a version query on the image URL in metadata (e.g. `/og.png?v=2`) whenever the design changes, then re-scrape in
    the FB Sharing Debugger and LinkedIn Post Inspector and send the page URL to @WebpageBot.
- **Reachability:** no auth, no bot-blocking WAF rules for `facebookexternalhit`, `Twitterbot`, `LinkedInBot`,
  `Slackbot-LinkExpanding`, `Discordbot`, `TelegramBot`, `WhatsApp`, `SkypeUriPreview`, and `robots.txt` must not
  block the image path (X and Google check robots.txt). Respond within a few seconds (FB: "within a few seconds").
  Server-side redirects are fine, meta refresh and JS are not (Apple).
- **HTML head position:** OG tags within the first 300 KB (WhatsApp) / 1 MB (FB) of HTML. Next.js puts them in
  `<head>` for static pages.

## 7. Refresh / debug tools

| Platform | Tool |
|---|---|
| Facebook, Messenger, (WhatsApp shares Meta infra but caches on the device) | Sharing Debugger: developers.facebook.com/tools/debug |
| LinkedIn | Post Inspector: linkedin.com/post-inspector |
| X | No live validator preview. Compose a draft post, or use a `?v=` URL variant |
| Telegram | @WebpageBot (send the URL) |
| Slack | none, ~30 min global cache. Use a URL variant |
| Mastodon | per-instance. Re-fetches only when the card is > 2 weeks old |
| Discord, WhatsApp, iMessage, Signal | none. Use a URL variant |
| Google | Search Console URL Inspection. Rich Results Test for JSON-LD |

## Sources

- Meta, images: https://developers.facebook.com/docs/sharing/webmasters/images/
- Meta, sharing webmasters: https://developers.facebook.com/docs/sharing/webmasters/
- Meta, web crawlers: https://developers.facebook.com/docs/sharing/webmasters/web-crawlers/
- WhatsApp link previews (Cloud API docs): https://developers.facebook.com/docs/whatsapp/link-previews/
- LinkedIn shared link image: https://www.linkedin.com/help/linkedin/answer/a521928
- LinkedIn Post Inspector help: https://www.linkedin.com/help/linkedin/answer/a6233775
- LinkedIn Page image specs: https://www.linkedin.com/help/linkedin/answer/a563309
- X cards (last published versions, Wayback): https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image ,
  https://web.archive.org/web/20260128060618/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary ,
  https://web.archive.org/web/20260201012312/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup ,
  https://web.archive.org/web/20260124210156/https://developer.x.com/en/docs/x-for-websites/cards/guides/troubleshooting-cards
- Apple TN3156 Create rich previews for Messages: https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages
- Slack robots: https://api.slack.com/robots
- Microsoft Teams link unfurling: https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/link-unfurling
- Mastodon source: https://github.com/mastodon/mastodon/blob/main/app/models/preview_card.rb , https://github.com/mastodon/mastodon/blob/main/app/lib/link_details_extractor.rb , https://github.com/mastodon/mastodon/blob/main/app/services/fetch_link_card_service.rb
- Mastodon PreviewCard entity: https://docs.joinmastodon.org/entities/PreviewCard/
- Bluesky posts guide (website card embeds): https://github.com/bluesky-social/bsky-docs/blob/main/docs/advanced-guides/posts.md , lexicon https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/embed/external.json , app resize https://github.com/bluesky-social/social-app/blob/main/src/lib/api/resolve.ts
- Signal Android source: https://github.com/signalapp/Signal-Android/blob/main/app/src/main/java/org/thoughtcrime/securesms/linkpreview/LinkPreviewRepository.java , .../linkpreview/LinkPreviewUtil.java , .../util/LinkUtil.kt
- Open Graph protocol (arrays, structured properties): https://ogp.me/ (source https://github.com/facebook/open-graph-protocol)
- Google favicon in Search (updated 2026-08-28): https://developers.google.com/search/docs/appearance/favicon-in-search
- Google Discover: https://developers.google.com/search/docs/appearance/google-discover
- Google robots meta (max-image-preview): https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Next.js opengraph-image / twitter-image (v16.3.7): https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
- Next.js app icons: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
- Next.js manifest: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
- Next.js generateImageMetadata: https://nextjs.org/docs/app/api-reference/functions/generate-image-metadata
- Next.js generateMetadata (metadataBase, merging, streaming, htmlLimitedBots): https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js HTML-limited bot list: https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/router/utils/html-bots.ts
- web.dev maskable icons: https://web.dev/articles/maskable-icon
- Evil Martians favicon guide (updated 2026-01-21): https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs
- Android adaptive icons: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- Google Play icon spec: https://developer.android.com/distribute/google-play/resources/icon-design-specifications
- Google Play preview assets: https://support.google.com/googleplay/android-developer/answer/9866151 , https://support.google.com/googleplay/android-developer/answer/1078870
- GitHub social preview: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview
- Product Hunt: https://www.producthunt.com/launch/preparing-for-launch
- Pinterest Rich Pins: https://help.pinterest.com/en/business/article/rich-pins
- Community observations (flagged [observed]): https://opengraphplus.com/consumers/whatsapp/images , https://opengraphplus.com/consumers/telegram/caching , https://opengraphplus.com/consumers/discord/tags , https://www.ctrl.blog/entry/webp-ogp.html , https://darekkay.com/blog/open-graph-image-formats/ , https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo
