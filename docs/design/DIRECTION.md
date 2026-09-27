# Klokka design direction (v0, design phase)

Status: DRAFT, 2026-09-27. Nothing is implemented. This document, the tokens and the two mockups
(`mockups/landing.html`, `mockups/login.html`) are the design lead's proposal for the owner's review.
Two more designers build the web-app and mobile mockups on top of these tokens and the shell; the
rules they must follow are in section 8.

Files in this folder:

| File | What it is |
|---|---|
| `DIRECTION.md` | this document |
| `tokens.css` | the three themes as CSS custom properties, light and dark, one file |
| `tokens.json` | the same values as data, the future source for `packages/tokens`, plus the computed contrast report |
| `mockups/_shell.css`, `mockups/_shell.js` | the mockup shell: tokens, fonts, page base, floating theme and mode switcher |
| `mockups/landing.html` | the marketing landing page, complete |
| `mockups/login.html` | sign-in, invitation, employer sign-up and create-workspace, four states in one file |
| `screenshots/*.png` | verification captures (see section 9) |

## 1. The problem in one sentence

Klokka has to make one shared number (the hours a person worked) feel trustworthy to two people who
do not fully trust each other, and it has to do it in a product that a 19-year-old barista and a
54-year-old cleaning-firm owner both want to open.

## 2. Anchor and point of view

Klokka means "the clock" in Norwegian. The most famous clock design in the world is the Swiss railway
clock: one grotesk, black on white, a red paddle for a second hand that sweeps in 58.5 seconds and
waits at twelve for the minute impulse. That clock is the design lead's muse for the recommended theme.

The anchor (from the frontend-design skill's eight territories) for the recommended theme is
**Swiss**, chosen over the safe pairing (a dark violet gradient page, which is what every hours app
and most of 2026's SaaS ships). The reason is not taste: time is numerals, and Swiss is the one
territory where numerals are the composition. The month total, the week grid and the "22.5 h" toast
are the design, not decoration around it.

Differentiator, visible in the rendered output: **the railway clock and its paddle second hand**. It
runs at the real time in the hero and on the sign-in page (58.5 s sweep, 1.5 s wait at twelve, minute
hand stepping), and the same paddle is the brand mark's red stroke and the blinking dot in badges.
Nothing else in the category owns a clock that behaves like a real one.

The owner's words, checked against the mockups:

- modern, Gen Z: giant expanded grotesk, one loud colour, no gradients, no card soup;
- a bit funky: the rotating "Made for the cafe / salon / cleaning crew" line, the toast landing on the
  week grid, the marquee of things Klokka says, the cropped giant wordmark closing the page;
- smooth and popping: Kulram's motion vocabulary (section 5) with a harder, faster curve; orange
  cells popping into the grid one by one;
- never corporate: no stock illustrations, no gradient blobs, no "trusted by" logos, no pricing tiers
  (there are none to show);
- never silly: standard UI copy for standard actions, real English, illustrative numbers labelled as
  such, no emoji in headings, no unicode-glyph icons.

## 3. What we carry over from Kulram, and what we change

Studied: the staging site at `kulram.coolify.ooguy.com/en` (screenshots at 1440 and 390, stepped
scroll captures, two hero captures 3.6 s apart) and the source (`app/globals.css` tokens,
`components/**`).

Carried over, because the owner loves it and it works:

| Kulram | Klokka |
|---|---|
| Signature curve `cubic-bezier(.2,.7,.2,1)` everywhere | same curve as `--ease-out`; it is the enter curve of Signal |
| Hero rise `kRise` 0.9 s, scene 1.1 s with 0.15 s offset | `--dur-rise` 800 to 1100 ms per theme, staggered with `--stagger` |
| Headline rotator: `kSwapIn` 0.55 s / `kSwapOut` 0.36 s, rotateX and blur, 3.4 s hold | identical mechanics on the "Made for the ..." line |
| Scene stage that cycles and restarts | the hero week grid choreography, 9.2 s loop |
| `Reveal`: CSS scroll timeline `animation-timeline: view()`, range `entry 0% entry 40%` | same, plus an IntersectionObserver fallback for browsers without scroll timelines |
| Stat counter: ease-out cubic, 1100 ms, once, on view | same (`data-count`) |
| Prompt ticker marquee, 46 s, paused on hover, second copy `aria-hidden` | notification ticker, 52 s |
| Float 6 to 7 s on the phone | 7 s |
| 1160 px container, 20 / 24 px gutters, 80 to 104 px section padding | `--container` 1160, `--gutter` clamp(20, 4vw, 24), `--section-y` clamp(80, 6vw + 32, 128) |
| Hairline card grids (1 px lines from a gap on a line-coloured background) | `.hgrid`, driven by `--grid-gap` / `--grid-line` tokens so the same markup is hairlines in Signal and gapped cards in the other two |
| Dark and light sections alternating, ending in a dark CTA pair and a giant cropped wordmark | same structure, the colour blocks come from `--primary` and `--secondary` |
| Chips as the interaction unit (tabs, prompts, filters) | quick-hour chips, pills, week-grid cells |
| Reduced motion kills every animation | same, in `_shell.css` and in the page |

Deliberately changed:

- **Palette.** Kulram is night violet with a lilac light side. Klokka's recommended theme is white,
  black and International Orange. The two products stay siblings by behaviour (motion, rhythm), not by
  colour, so they are never mistaken for each other. Nightshift keeps the violet family as the "closest
  to Kulram" option for the owner to compare.
- **Type.** Kulram's slab serif (Alfa Slab One) says "ledger". Klokka's display face is a wide grotesk
  (Archivo at 125 % width, weight 800), which says "timetable". One family for display and body, per the
  Swiss anchor; the mono is for IDs and code only. Numbers use the body face with `tabular-nums` in
  columns and proportional figures when large.
- **Radius.** Kulram rounds everything at 24 px. Signal is tight (4 px controls, 12 px cards), which is
  what makes the hairline grids read; Nightshift and Clay round generously.
- **Hero composition.** Kulram is a two-column hero with a square scene. Klokka runs the headline across
  the full width at poster size with the clock in the right margin, then a two-column row underneath
  (copy left, week grid right). At phone widths the clock moves above the headline.
- **No photography.** Kulram uses photos in three sections. Klokka has none: the app itself, drawn as
  CSS fake UI, is the imagery. That also keeps the landing free of licensing and art direction cost.
- **Section list.** Kulram sells a promise (bookkeeping done). Klokka sells a relationship, so the page
  is built around the two roles: how it works, for employers, for employees, the pay switch, insights,
  open source, FAQ.

## 4. The three themes

All three are complete (light and dark, type, radius, shadow, motion, texture, chart palette) and live
in `tokens.css` and `tokens.json`. Switch with the dev bar or `?theme=`.

### 4.1 Signal (recommended)

Anchor: Swiss. Surface white `#FFFFFF` / near-black `#0B0B0C`; one family, Archivo (display at width
125 %, weight 800; body at width 100 %); Geist Mono for IDs and code. One loud colour, International
Orange `#FF4F00`, used as fill with black text on it (5.97:1). Because orange cannot carry small text
on white, `--accent` is a darker orange `#C43C00` (5.26:1) for links and eyebrows; in dark mode the
accent brightens to `#FF6A2A`. Secondary is black (white in dark). Hairline rules from `--border`,
strong rules from `--rule` (the text colour). No shadows except a single float for popovers and
toasts. Radius 2 / 4 / 8 / 12 / 16, controls 4, cards 12. Pops for blocks and playful tiles: Klein
blue `#002FA7`, signal yellow `#FFD400`, signal green `#1B9E4B` (railway signal colours, which is
where the name comes from). Chart order, validated: orange, blue, green, magenta (section 6.3).
Motion: `--ease-out` for entrances, 140 / 260 / 480 / 800 ms, stagger 60 ms. Texture: none; the
grid lines and the paddle are the texture.

Why it wins: it is the unexpected pairing that is also the honest one (time is numerals); both modes
are trivially AA; the same tokens serve web, Android and the operator console with nothing to render
(no gradients, no blur, no grain); it photographs well in a 1200 x 630 social card; and it keeps the
whole Kulram motion vocabulary without looking like Kulram.

Risk: an owner who wants "bold colour" to mean many colours will find it strict. The answer is in the
page: orange full-bleed blocks, a black block, a black-on-orange CTA pair; boldness by area, not by
count.

### 4.2 Nightshift

Anchor: Aurora Maximalism. Base `#0D0620` under a three-blob mesh (violet `#5D34D0`, magenta
`#FF006E`, cyan `#00F0FF`) drawn by `body::before` from the `--mesh-*` tokens; the light mode is a
pale lavender `#F5F1FF` under the same mesh at low alpha. Display Unbounded 800 (scaled to 0.8 of the
shared scale because it is a wide face), body Inter, mono JetBrains Mono. Primary magenta with dark
text on it (5.15:1 dark, 4.86:1 light), secondary violet with white text, accent cyan in dark and a
deep cyan `#006B7D` in light (5.56:1). Glow on accent text through `--glow-text` (55 % of
currentColor in dark, 22 % in light). Radius 6 / 10 / 14 / 20 / 28, pills for controls, cards 24.
Motion: a spring `linear()` curve for entrances, 200 / 400 / 700 / 1100 ms, stagger 90 ms. Chart order,
validated: violet, magenta, teal, amber (dimmer steps in dark to stay in the dark lightness band).

Why it exists: it is the direct descendant of the Kulram hero the owner loves, pushed to its anchor.
It is the most "popping" of the three on a phone in the dark.

Risk: it is the look of most 2024 to 2026 SaaS; the light mode is its weaker half; mesh, glow and
blur cost battery on cheap Android phones; and on a page full of them the magenta buttons start to
shout. The mockup shows it holds, but it needs the most discipline to stay out of template territory.

### 4.3 Clay

Anchor: Organic. Sand `#E8DCC7` page, `#E0D2B9` cards, oat `#D4B895` second surface, espresso text
`#2B2118`; dark mode is espresso `#1E1812` with sand text. Display Fraunces (optical size 144, weight
650, SOFT 100, WONK on: the wonky "k" and "a" are the funk), body Epilogue, mono DM Mono. Primary is a
lighter terracotta `#D4794A` carrying espresso text (4.97:1; the anchor's `#C66B3D` fails AA either
way and was lightened), accent is a burnt rust `#74350F` for links (6.86:1 on sand, 4.9:1 on oat),
secondary moss `#606C38`. Radius 8 / 12 / 16 / 24 / 32, cards 28. Grain at 3.5 % from an SVG
feTurbulence overlay (`body::after`, blend overlay). Motion: gentle `cubic-bezier(.45,0,.2,1)`,
200 / 380 / 600 / 1000 ms, stagger 80 ms, 7 s breathing on the phone. Chart order, validated:
terracotta, lake blue, moss, heather.

Why it exists: it is the warm, tactile option that looks like the businesses that will use Klokka
(cafes, salons, bakeries) rather than like software. Fraunces gives it a personality no competitor has.

Risk: "popping" is its weakest quality; the sand palette photographs as beige; ochre and moss had to
be kept out of the chart order because colour-blind readers cannot separate them.

### 4.4 Recommendation

**Signal.** See 4.1. If the owner wants the Kulram lineage to be visible at first glance, Nightshift
is the fallback and the tokens already carry it in full; nothing in the mockups is Signal-only.

## 5. Motion vocabulary (shared by all themes, tuned per theme)

Four moves, no others. Every new mockup uses these and nothing else.

1. **Rise.** Entrance for anything: opacity 0 to 1 with a 22 to 28 px upward travel. On load in the
   hero (staggered with `--stagger`), on scroll everywhere else (`.reveal`, scroll timeline, range
   `entry 0% entry 38%`). Duration `--dur-rise`, curve `--ease-enter`.
2. **Swap.** One line of text replaces another: out with rotateX(40deg), 60 % upward travel and 6 px
   blur in 360 ms; in from the opposite side in 550 ms. 3.4 s hold. Only ever one swap on a screen.
3. **Pop.** A small thing lands: scale 0.85 and 4 px travel to rest, `--dur-base`, `--ease-enter`,
   staggered 110 ms across a row (week-grid cells, chips, a toast, a tile appearing when a switch
   turns on). Removal is a plain fade in 500 ms with `--ease-exit`; nothing pops out.
4. **Paddle.** The clock: second hand 58.5 s sweep then 1.5 s hold (`--paddle-cycle` 60 s), minute
   hand `steps(60)`, hour hand linear 12 h, all synced to the real time with negative
   `animation-delay`. Slow, continuous, the only always-on motion besides the ticker.

Curves: `--ease-out` `cubic-bezier(.2,.7,.2,1)` (Kulram's, the default), `--ease-in-out`
`cubic-bezier(.65,0,.35,1)`, `--ease-spring` a `linear()` spring with 2 % overshoot (Nightshift's
enter curve), `--ease-exit` a fast ease-in for removals.

Durations per theme: Signal 140 / 260 / 480 / 800 ms; Nightshift 200 / 400 / 700 / 1100 ms; Clay
200 / 380 / 600 / 1000 ms (`--dur-fast` / `--dur-base` / `--dur-slow` / `--dur-rise`).

Reduced motion: `tokens.css` zeroes every duration and stagger under `prefers-reduced-motion`;
`_shell.css` also clamps every animation and transition to 0.01 ms. Pages must show their final
state under reduced motion (the hero stage does: cells filled, toast visible), never an empty one.

Hover: buttons lift 1 px and brighten 6 %; list rows tint 5 % of the text colour; nothing scales on
hover except swatches. Press: scale 0.985. Focus: a 2 px `--focus` outline, 2 px offset, everywhere.

## 6. Tokens

### 6.1 Mechanism

`tokens.css` declares every colour once as a `light-dark(light, dark)` pair. `:root` sets
`color-scheme: light dark`, so with no attribute the pair resolves by `prefers-color-scheme`;
`<html data-mode="dark">` or `data-mode="light"` sets `color-scheme` and forces it. There are no
duplicated dark blocks to drift. `tokens.json` carries explicit `light` and `dark` objects for the
native side.

Themes are `:root[data-theme="signal"]`, `:root[data-theme="nightshift"]`,
`:root[data-theme="clay"]`; a missing attribute is Signal. Everything theme-independent (spacing, type
scale, container, z-index, base easings) sits on `:root`.

### 6.2 Names

Colour: `--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`, `--border`, `--rule`,
`--primary` / `--on-primary` (a fill and its text), `--secondary` / `--on-secondary`, `--accent` (a
text colour that passes AA on bg and surface; never a fill), `--success` / `--warning` / `--danger`
with `-soft` tints (text on tint passes AA), `--pop-1..3` (block fills that carry their own text),
`--chart-1..4` (the validated categorical order, marks only, never text), `--focus`, `--mesh-1..3`,
`--glow-color`.

Type: `--font-display`, `--font-body`, `--font-mono`, `--font-display-weight`,
`--font-display-stretch`, `--font-display-variation`, `--font-display-scale`,
`--font-display-leading`, `--font-display-tracking`; sizes `--text-display-xl`, `--text-display-l`,
`--text-h1..h3`, `--text-lead`, `--text-body`, `--text-small`, `--text-caption`, `--text-eyebrow`
(all `clamp()` on viewport width); `--leading-*`, `--tracking-*`.

Layout: `--space-1..13` (4 px base), `--container` 1160, `--container-narrow` 760, `--gutter`,
`--section-y`, `--nav-h` 76, `--tap-min` 44.

Shape and depth: `--radius-xs..xl`, `--radius-pill`, `--radius-control`, `--radius-card`;
`--shadow-sm`, `--shadow-md`, `--shadow-float`, `--shadow-glow`; `--card-border`; `--grid-gap`,
`--grid-line`, `--cell-radius` (hairline grid vs gapped cards); `--bg-image` (mesh),
`--grain-opacity`, `--glow-text`.

Motion: `--ease-out`, `--ease-in-out`, `--ease-spring`, `--ease-enter`, `--ease-exit`, `--dur-fast`,
`--dur-base`, `--dur-slow`, `--dur-rise`, `--stagger`, `--paddle-cycle`.

### 6.3 Contrast, computed

Every text-on-surface pair was computed (WCAG 2 relative luminance), not judged by eye, for all six
theme and mode combinations: text and text-muted on bg, surface and surface-2; on-primary on
primary; on-secondary on secondary; accent on bg and surface; success, warning and danger on bg and
on their soft tints. All pass 4.5:1. Focus ring and the four chart colours pass 3:1 on bg and on
surface. The full table with ratios is in `tokens.json` under `contrast`. The lowest passing pairs
are Signal light `warning` on `warning-soft` (4.54) and Clay light `text-muted` on `surface-2`
(4.70); anything that needs more headroom goes on `--surface` instead of `--surface-2`.

The chart order of each theme and mode was run through the dataviz skill's palette validator
(lightness band, chroma floor, colour-vision-deficiency separation, normal-vision floor, contrast)
and passes all checks. The pops were deliberately kept out of the chart order: Swiss yellow is a
block colour, not a series.

### 6.4 Consumption later

- Web (`apps/web`, `apps/landing`, Tailwind v4): `@theme` maps `--color-bg: var(--bg)` and so on
  from `tokens.css`, exactly as Kulram's `globals.css` does; `data-theme` and `data-mode` on `<html>`
  stay the switch. Kulram's `@utility no-scrollbar` and focus-visible rules carry over unchanged.
- Mobile (`apps/mobile`, Expo): `packages/tokens` exports `tokens.json`; the app picks
  `themes[theme].color[mode]` from the device scheme. `light-dark()` is a CSS convenience, not the
  source of truth; the JSON is.
- Fonts: the Google Fonts request each theme needs is in `tokens.json` under `themes.*.font.google`
  (pipe-separated families); the shell loads all three for the mockups.

## 7. The mockup shell

Every mockup includes exactly this, in `<head>`, and nothing else for tokens, fonts or switching:

```html
<link rel="stylesheet" href="_shell.css">
<script src="_shell.js" defer></script>
```

`_shell.css` imports `../tokens.css` and the Google Fonts for all three themes, applies the theme to
the page (html background, `body::before` mesh layer, `body::after` grain layer, text colour, body
font, selection, focus ring), gives `h1`/`h2`/`h3`/`.display` the display face and `.mono` the mono
face, clamps all motion under reduced motion, and styles the dev bar. `_shell.js` injects the dev bar
(bottom right: Signal, Nightshift, Clay; Auto, Light, Dark; the live viewport size; a collapse
button) and sets `data-theme` and `data-mode` on `<html>`. It stores nothing, so it runs inside a
sandboxed iframe.

Initial state, in order: URL query (`?theme=clay&mode=dark`, `?bar=0` hides the bar), then attributes
already on `<html>` (a mockup may hardcode `data-theme="nightshift"`), then Signal and Auto. Script
API: `KlokkaShell.setTheme("clay")`, `KlokkaShell.setMode("dark")`, `KlokkaShell.get()`, and a
`klokka:change` event on `document` with `{ theme, mode }`. Auto removes `data-mode`, so the page
follows the device.

Everything a mockup draws must read tokens through `var(--...)`. The only hardcoded colours allowed
in a mockup are inside the dev bar, which is intentionally not themed.

## 8. Rules for the web-app and mobile mockups

Content discipline (from the frontend-design skill, non-negotiable):

- Standard copy for standard actions: Sign in, Continue, Save, Cancel, Next, Create workspace. No
  themed replacements, no "Authenticate session".
- No filler: no mono-caps subtitles that add no information, no `//` kickers, no fake telemetry, no
  invented status strips. If removing a string removes no information, remove it.
- Sample data reads as sample: name the example workspace ("Café Nord, example workspace"), label
  illustrative figures ("Illustrative numbers"), keep the same people (Nora the employer; Maria,
  Jonas, Ayla, Sam) so the story is consistent across mockups.
- Icons are inline SVG in the Lucide style (24 grid, 2 px stroke, round caps), from a `<symbol>`
  sprite at the top of the body; copy the sprite in `landing.html` and add to it. No icon fonts, no
  unicode glyphs as icons, no external images.
- Never an em dash in any user-facing text, in any language. Use a comma, colon, parentheses or a
  full stop.
- English and Swedish exist from day one in the product; mockups are English, but leave room for
  Swedish strings that run 20 to 30 % longer.

Layout:

- Content sizes the UI. No fixed heights, no pixel nudging; cap with `dvh` / `svh`, never `vh`.
- Tap targets 44 px (`--tap-min`). Phones from 360 px up, no horizontal scroll; verify at 360, 390,
  412 and 430 with Playwright (the scratch script in section 9 is the pattern) and, for anything
  with an input, with the soft keyboard opened and closed.
- Give grid and flex children `min-width: 0` when they hold nowrap or long unbroken content (a URL, a
  code line); that was the one overflow found in the landing page.
- Sections alternate `--bg`, `--surface`, and colour blocks from `--primary` / `--secondary` with
  their `--on-*` text. Do not invent a fourth surface.
- Cards: `background: var(--surface); border: var(--card-border); border-radius:
  var(--radius-card); box-shadow: var(--shadow-md)`. Groups of equal cards: the `.hgrid` pattern
  (hairlines in Signal, gapped in the others, from tokens, no theme checks in page CSS).
- Numbers: `tabular-nums` in columns, proportional when large (stat tiles, month totals).

Motion: the four moves in section 5, nothing else; final state under reduced motion.

Charts (dataviz skill): series colours are `--chart-1..4` in that fixed order and never re-assigned
when a series is filtered out; bars at most 24 px thick with a 4 px rounded data end and a square
baseline, 2 px lines, 8 px markers with a 2 px surface ring; a legend for two or more series;
values and labels in text tokens, never in the series colour; status colours (`--success`,
`--warning`, `--danger`) never used as a series; one axis, never two.

Reuse from the two mockups, by copying the CSS you need (this is not a framework): `.btn` and its
variants, `.card`, `.hgrid`, `.pill`, `.av`, `.wk` (the week grid), `.switch`, `.tile`, `.bars`,
`.cols`, `.spark`, `.faq` from `landing.html`; `.input`, `.field`, `.pw`, `.seg`, `.swatches`,
`.emojis`, `.steps`, `.note` from `login.html`. Workspace colour swatches are `--primary`,
`--chart-2..4`, `--pop-2`, `--secondary`, so every workspace colour exists in every theme and mode.

Operator console: same tokens, same four moves, denser type scale (body 14, small 13), `--surface`
tables with `--border` hairlines, no colour blocks. It is a route group of the web app, not a
generic admin template.

## 9. Verification

Captures were made with Playwright 1.61 (Chromium) from a jobs file: 1440 x 900 and 390 x 844, both
modes, all three themes for the landing hero (each hero captured 5.6 s after load so the toast and
the "Maria's phone" card are on screen), full pages under `prefers-reduced-motion` so scroll-timeline
reveals are in their final state (a full-page capture otherwise shows sections outside the first
viewport at opacity 0, which is a capture artefact, not a page defect), the four login states, and a
`document.scrollWidth <= innerWidth` check at 360, 390, 412 and 430 for both pages. Fonts were
confirmed loaded (`document.fonts.ready`, computed `font-family` printed per capture) and the
computed body background printed per theme and mode.

Files in `screenshots/`:

- `landing-hero-<theme>-<mode>-1440.png`, `landing-hero-<theme>-<mode>-390.png` for
  signal / nightshift / clay and light / dark (12 files)
- `landing-full-signal-light-1440.png`, `landing-full-signal-dark-1440.png`,
  `landing-full-signal-light-390.png`, `landing-full-nightshift-dark-1440.png`,
  `landing-full-clay-light-1440.png`
- `login-<state>-signal-light-1440.png` for signin / invite / signup / workspace;
  `login-<state>-signal-light-390.png` for signin / invite / workspace;
  `login-signin-nightshift-dark-1440.png`, `login-invite-clay-light-1440.png`,
  `login-workspace-signal-dark-1440.png`, `login-invite-nightshift-dark-390.png`

Full-page captures and the phone captures of `login.html` were taken with the dev bar hidden
(`?bar=0`) so it does not sit on top of the content in a tall image; the viewport captures keep it.

Iframe: both mockups were also loaded inside `<iframe sandbox="allow-scripts">` (opaque origin, no
storage) from a local HTTP server, with the theme and mode passed in the `src` query; the tokens,
fonts, dev bar and animations render, and the console stays clean. Note for whoever previews the
files: a sandboxed iframe cannot load `file://` subresources in Chromium, so an iframe preview must be
served over HTTP; opening the files directly works without a server.

Not verified, by honesty: real devices (Playwright only), the soft keyboard on `login.html` (needs a
phone; the layout has no fixed heights so the risk is low), Safari (scroll timelines and
`light-dark()` are supported from Safari 26 and 17.5; the reveal has an observer fallback,
`light-dark()` has none, which is acceptable for mockups and must be revisited in `packages/tokens`
if Safari 16 support is required).

## 10. Mockup notes

### 10.1 landing.html

Sections in order: nav; hero (badge, poster headline, railway clock, "Made for the ..." rotator,
lead, two actions, four trust lines, the week-grid stage); notification ticker; how it works
(primary colour block, 01 / 02 / 03 with a vignette each: invitation email, quick chips, the
notification); for employers (feature list and the big week grid with an open chip popover, close
month, export CSV, one open flag); for employees (surface band, feature list and a phone with the
month calendar, total, delta, two notifications); the pay switch (secondary colour block, a real
switch that reveals money figures beside every hours figure and a labour-cost tile in insights);
insights (six stat tiles: hours this month with sparkline and counter, busiest day, projected month
end, per employee bars with legend, weekday distribution, days with nothing logged); free and open
source (giant MIT, clone command, GitHub link placeholder, three cards); FAQ (eight questions,
native `details`); CTA pair (secondary block: create; primary block: got an invitation); footer
with the cropped giant wordmark.

Hero choreography, 9.2 s loop: cells pop in from 0.5 s at 110 ms intervals; the toast ("Nora added 5
days for you, 22.5 h in week 39") lands at 3.2 s; "Maria's phone: 22.5 h, +2 h vs last week" lands
at 4.6 s; both fade at 8.3 s; restart. The clock runs at the real time throughout.

### 10.2 login.html

Four states, switched by the state bar at the top or `?state=signin|invite|signup|workspace`:

- **Sign in**: one card for both roles; the role comes from the workspace membership, which the
  brand panel says in plain words. The card sits inside a dashed frame labelled "Logto hosted page,
  branded": Logto renders it, Klokka supplies logo, primary colour, font and dark mode through
  Logto's sign-in experience settings and custom CSS. Everything outside the frame (brand panel,
  footer links, language) is Klokka's.
- **Invited**: reached from the invitation email. The workspace tile (emoji, colour, employer name,
  "You join as employee") is above the fold; the card says "You have been invited by Café Nord", the
  email is prefilled and read-only, choose and repeat a password, "Join Café Nord". No workspace or
  role is typed by the invitee; the invitation carries them.
- **Sign up**: Logto's account creation (name, email, password), marked step 1 of 2.
- **Create your workspace**: Klokka's own screen, step 2 of 2: name, country and time zone, currency
  (noted as only shown if pay is on), week start (Monday / Sunday segmented), colour swatches, emoji
  grid, with a live preview of the workspace tile in the brand panel.

## 11. Open questions for the owner

1. Theme: Signal is recommended; Nightshift is the visible Kulram descendant; Clay is the warm
   outlier. All three are complete, so the choice costs nothing technically.
2. Tagline: "One clock. Both sides." is the proposed English line and the design hangs on it. The
   Swedish line is not written; it should be a translation of the idea, not the words.
3. The business nouns in the rotator (cafe, salon, bakery, cleaning crew, corner shop, small
   agency): are these the customers you mean?
4. Wordmark: lower-case "klokka" with the clock mark. If a distinct mark is wanted, the paddle hand
   is the element to keep.
5. FAQ facts to confirm before launch: hosting region wording ("in the EU"), the iOS timing line,
   the "public with the first release" note on the GitHub link.
6. Whether the landing ships in Swedish as well at launch (Kulram does sv and en).
