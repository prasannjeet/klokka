# Social and link-preview images

Made 2026-09-29 for the SEO launch plan. Backgrounds come from Higgsfield (GPT Image 2.5, high quality, 2K), using the
live landing page and the app's month screen as references. The logo and all text are composited on top by
`compose.mjs` with the exact mark (`../final/klokka-mark.svg`) and the site's own fonts, so the logo is exact and
Swedish letters always render.

## Chosen (owner, 2026-09-29)

| Use | File |
|---|---|
| Link preview (og:image), Swedish | `cards/og-phones-sv.jpg` (1200x630) |
| Link preview (og:image), English | `cards/og-phones-en.jpg` (1200x630) |
| Square, for posts shared by hand | `cards/square-sv.jpg`, `cards/square-en.jpg` (1200x1200) |

The site will draw its cards at build time from the same backgrounds (`apps/landing/src/lib/brand-image.tsx`); these
files are the reference and the source for surfaces outside the site.

## Everything in here

- `backgrounds/`: the Higgsfield images at full size (2688x1520, squares 2048x2048), no logo or text.
  - `phones-right-{en,sv}`: two phones on the right (the chosen card). The `sv` version has Swedish screen labels.
  - `phones-sides-{en,sv}`: one phone at each edge, empty centre (crop-safe alternative).
  - `clock`, `week-grid`, `cafe`, `square-clock-grid`: the other directions.
  - `ai-card-{sv,en}`, `ai-square-{sv,en}`: cards drawn entirely by the model, logo and text included. The logo is
    close to ours but not exact; kept for reference only.
- `cards/`: every composited format, Swedish and English:
  - `og-*`: link previews, 1200x630
  - `square-*`: 1200x1200
  - `x-*`: 1200x600
  - `x-header-*`: 1500x500, X and LinkedIn headers
  - `github-*`: 1280x640, repository social preview
  - `play-feature-*`: 1024x500, Google Play feature graphic
  - `producthunt-*`: 1270x760
  - `page-*`: examples of the per-page SEO card template

The fine print on the phone screens was drawn by the model and is not meant to be read: it has small typos, which are
invisible at preview size.

## Regenerate

`node docs/brand/social/compose.mjs` from the repo root, after `npm install`. It uses Playwright's Chromium and the
`@fontsource` packages already in the workspace, and rewrites `cards/`.
