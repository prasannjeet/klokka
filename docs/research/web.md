# Klokka research: web frontend (`apps/web`, `apps/landing`)

Status: pre-implementation research, 2026-09-27. Nothing here is implemented. Package versions are from the npm
registry on 2026-09-27 (`npm view <pkg> version`) unless another source is cited. Anything not checked is marked
**(unverified)**. Scratch experiments live in the session scratchpad under `web/`: a three-package npm workspace
built with Next 16.3.6 (`mono/`), a dev-origin blocking test (`devtest.sh`) and an ESLint 9 vs 10 test (`eslint10/`).

## Decisions at a glance

| # | Topic | Decision | Why |
|---|---|---|---|
| 1 | Next.js | Next 16.3 (start on 16.3.7, due 2026-09-30), App Router, Turbopack, `output: "standalone"`. Two apps: `apps/web` and `apps/landing` | Different audiences, rendering, env handling and release cadence. The landing stays a kulram-web sibling |
| 2 | Auth | `@logto/next` 4.2.11 (server actions API). The browser never holds a token: a BFF route handler adds the bearer. What a user may see comes from the API's `/me`, not from token claims | No CORS, no token in JS, runtime-only env, one image for every environment |
| 3 | UI | Tailwind 4.3 CSS-first + shadcn/ui on **Base UI** + kulram's CSS keyframe vocabulary + `motion` 13 only for layout, exit and gesture animation + NumberFlow for count-ups | Base UI is shadcn's default since July 2026; CSS covers entrances for free; `motion` covers what CSS cannot |
| 4 | Charts | Recharts 3 through shadcn's `chart` wrapper; the calendar heat-map is our own CSS grid | Maintained, accessible by default in v3, themed by the same CSS variables |
| 5 | Operator console | No Refine. TanStack Table 9 + shadcn table + the same query layer as the rest of the app | Four or five read-mostly screens do not need a second data layer |
| 6 | Monorepo | npm workspaces, packages export TypeScript source, no TS project references, root `overrides` pin React 19.2.3, TypeScript 6.0.3 everywhere | Tax-agent precedent, verified to build with Next 16.3.6; matches Expo SDK 57 pins |
| 7 | i18n | Hand-rolled typed catalogue in `@klokka/core/i18n` (kulram `dictionaries.ts` style); no next-intl | Zero runtime, identical on React Native, compile-time checked, no locale routing needed behind a login |
| 8 | Quality | Vitest 5 + Testing Library, Playwright 1.63 (`visual`, `layout`, `lan` projects + a dev-only preview harness), ESLint **9.39** flat config, Prettier 3.9, TS strict | ESLint 10 crashes `eslint-config-next` today (tested); TS 7 is not supported by typescript-eslint |
| 9 | Data | TanStack Query 5 in client components, through the BFF, with optimistic cache updates; server actions only for sign-in/out and cookies | Server actions run one at a time, which a spreadsheet-like week grid cannot live with |

## Brief corrections

1. **Pin the toolchain below "latest".** npm `latest` is ESLint 10.11 and TypeScript 7.0.2, but `eslint-config-next`
   16.3.6 throws on ESLint 10 (`react/display-name: contextOrFilename.getFilename is not a function`, reproduced in
   `eslint10/`) and `typescript-eslint` 8.70.1 declares `typescript >=4.8.4 <6.1.0`. Expo SDK 57's template pins
   `typescript ~6.0.3`. Use ESLint `^9.39` and TypeScript `~6.0.3` across the repo.
2. **One React version, Expo's.** Expo SDK 57 pins `react`/`react-dom` 19.2.3 (`expo@57.0.25`
   `bundledNativeModules.json`); npm `latest` is 19.3.0, and Expo warns "Duplicate React version in a single app will
   cause runtime errors". Pin 19.2.3 with root `overrides`. Next's App Router runs its own bundled React canary, so
   the web app loses nothing (`next build` verified with 19.2.3).
3. **Next.js security release.** Next announced 16.3.7 for 2026-09-30 fixing nine vulnerabilities, one critical
   ([blog](https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026)). Start on >= 16.3.7.
   kulram-web is on 16.3.4, two security releases behind.
4. **Per-workspace Logto tokens are costly on the web.** "Roles = organization roles" implies one organization
   token per workspace. `@logto/next` keeps every token in one encrypted cookie (no chunking), ID-token organization
   claims go stale after membership changes (Logto docs), and a user reported empty-scope organization tokens after
   the first organization is created until a new consent ([logto-io/dart#109](https://github.com/logto-io/dart/issues/109)).
   Recommended: one API-resource token without `organization_id`; the API authorizes from its own `membership`
   table (hezdar-panel rule: "Never read access out of token claims"). Open question 1.
5. **The catalogue is needed by the API too.** Push notifications are shown by the OS from server-sent text, so the
   API must localize "Maria added 5 days, 22.5 h" itself. A TypeScript catalogue with functions cannot be read by
   Java. Proposal in section 7; open question 2.
6. **The operator is not an organization role.** It spans all workspaces, so it is a Logto global role (`roles`
   claim), enforced by the API with a global API permission.
7. **Invites need a public API endpoint.** The `/join/<invitationId>` page must show "Maria's Cafe invited you"
   before sign-in, so the API needs an unauthenticated invitation lookup (name, emoji, inviter, status only).
8. **The week grid wants a batch endpoint.** Saving a week cell by cell is up to 7 x N requests; one batch upsert
   per save is also the natural "sitting" for coalesced notifications. Open question 3.
9. **Chart parity means data parity**: web and mobile share chart input shapes, not a chart library (section 4).
10. **Health check**: kulram-web's check fetches `/`, which on the app redirects to Logto. Add `/healthz`.

## 1. Next.js: version, build, split, images

**Decision:** Next 16.3 (>= 16.3.7), App Router, Turbopack (default), `output: "standalone"`, two apps. `apps/web`
image is environment-agnostic (runtime env only); `apps/landing` bakes `NEXT_PUBLIC_SITE_URL` like kulram-web.

| Fact | Evidence |
|---|---|
| `next` 16.3.6 is latest (2026-09-26), called "Active LTS"; 16.3 shipped 2026-08-03 | npm; [16.3 blog](https://nextjs.org/blog/next-16-3); [security update](https://nextjs.org/blog/nextjs-security-update-september-22-2026) |
| App Router "uses the latest React Canary release" bundled with Next | [v16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) |
| Turbopack is default for `next dev` and `next build`; FS cache on by default for both; a custom `webpack` config fails the build | upgrade guide; 16.3 blog |
| `middleware` renamed `proxy.ts`, Node runtime only; `next lint` removed, `next build` no longer lints | upgrade guide |
| Node >= 20.9 (use `node:24-alpine`, matches local 24.14 and Vitest 5's `^22.12 \|\| ^24`) | `npm view next engines`; upgrade guide |
| `next build` type-checks by running the project's `tsc` CLI (enables TS 7 while its JS API is missing) | [useTypeScriptCli](https://nextjs.org/docs/app/api-reference/config/next-config-js/useTypeScriptCli) |
| 16.3 adds `next/root-params`, `catchError` boundaries, `@next/playwright` `instant()` helper | 16.3 blog |

**`allowedDevOrigins` (tested, `devtest.sh`, `next dev -H 0.0.0.0`, host LAN IP 192.168.0.16):**

| Config | Page via LAN IP | `/_next/*` with `Origin: http://192.168.0.16:3990` |
|---|---|---|
| none | 200 | **403**, log: "Blocked cross-origin request to Next.js dev resource" |
| `allowedDevOrigins: ["192.168.*.*"]` | 200 | passes (404 for the fake asset) |

The page HTML loads but dev resources and HMR are refused, which is the "static HTML, dead client JS" failure in
AGENTS.md. A `*` matches exactly one hostname label, IP octets included (matcher in
`next/dist/server/app-render/csrf-protection.js`; [docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins)).
So a committed `["192.168.*.*"]` works for every developer's LAN IP. `next dev` must also bind `-H 0.0.0.0`.

**Monorepo standalone (built in `mono/`):** with `outputFileTracingRoot` and `turbopack.root` both set to the repo
root, `.next/standalone` mirrors the repo: the server is `apps/web/server.js`, static files go to
`apps/web/.next/static`, public to `apps/web/public`. The standalone tree was 48 MB; workspace packages were
bundled, not copied. Do **not** copy kulram-web's `turbopack: { root: process.cwd() }`: Turbopack does not resolve
files outside its root ([turbopack docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)),
so `packages/*` would break. `npm ci --workspace @klokka/web --include-workspace-root` installed web deps and linked
`@klokka/*` while skipping a sibling workspace's deps (tested), so the web image never installs React Native.

**One app or two:**

| | Two apps (chosen) | One app, host-based routing in `proxy.ts` |
|---|---|---|
| Rendering | Landing static and SEO'd; app dynamic behind auth | Both modes in one build |
| Locale | Landing: path locale (`/`, `/en`) for hreflang, kulram style. App: cookie/profile locale, no path prefix | Two locale strategies in one router |
| Env | Landing bakes `NEXT_PUBLIC_SITE_URL` (canonical, sitemap). App reads Logto and API settings at runtime | Build-time URL forces per-env images for the app too |
| Release | Copy tweaks never redeploy the app | Every landing edit redeploys the product |
| Precedent | kulram-web is its own app | none |

**Images (both: multi-stage, repo-root build context, `node:24-alpine`, non-root `nextjs` user, `HOSTNAME=0.0.0.0`,
`PORT=3000`, Coolify `dockerimage` app with `--init` like kulram-web):**

| | `klokka-web` | `klokka-landing` |
|---|---|---|
| deps stage | copy root `package.json` + lock + every workspace `package.json`; `npm ci -w @klokka/web --include-workspace-root` | same with `-w @klokka/landing` |
| build args | none | `NEXT_PUBLIC_SITE_URL` |
| runtime env | `APP_BASE_URL`, `API_BASE_URL`, `LOGTO_ENDPOINT`, `LOGTO_APP_ID`, `LOGTO_APP_SECRET`, `LOGTO_COOKIE_SECRET` (>= 32 chars), `LOGTO_API_RESOURCE` | none |
| CMD | `node apps/web/server.js` | `node apps/landing/server.js` |
| health | `GET /healthz` (new route handler, no auth) | `GET /` |
| one image per env? | no, the same image runs on staging and prod | yes, URL is baked (as kulram-web) |

## 2. Logto in Next.js

**Decision:** `@logto/next` 4.2.11 via `@logto/next/server-actions`. Server components only check the session
(`getLogtoContext`, ID-token claims, no network). All API calls go through one BFF route handler,
`app/api/k/[...path]/route.ts`, which calls `getAccessToken(config, LOGTO_API_RESOURCE[, orgId])` and forwards to
`API_BASE_URL`. Route handlers can write cookies, so a refreshed token is persisted; the browser never sees a token.

**API surface** (from the package typings `lib/server-actions/index.d.ts` and the
[App Router quick start](https://docs.logto.io/quick-starts/next-app-router)):

| Function | Where | Notes |
|---|---|---|
| `signIn(config, { redirectUri, postRedirectUri?, firstScreen?, loginHint?, identifiers?, directSignIn?, prompt?, extraParams? })` | server action | `firstScreen`: `signIn`, `register`, `identifier:sign_in`, `identifier:register`, `reset_password`, `single_sign_on` |
| `handleSignIn(config, searchParams)` | `app/callback/route.ts` | redirects to `postRedirectUri` when one was given |
| `signOut(config, redirectUri?)` | server action | clears the session cookie |
| `getLogtoContext(config, { fetchUserInfo? })` | RSC, actions, routes | `isAuthenticated`, `claims`; `fetchUserInfo` calls `/oidc/me` for fresh data |
| `getAccessToken(config, resource?, organizationId?)` / `getOrganizationToken` | server actions, route handlers | resource + org id gives an organization-level API token (`aud` = API, `organization_id` claim) ([docs](https://docs.logto.io/authorization/organization-level-api-resources)) |
| `getAccessTokenRSC` / `getOrganizationTokenRSC` | RSC | typings: "You can't write to the cookie in a React Server Component, so if the access token is refreshed, it won't be persisted in the session" |

Session storage (read in `@logto/node` 3.1.11 `CookieStorage`): one encrypted cookie `logtoCookies`, `maxAge` 14
days, no chunking, holding the ID token, refresh token and every access token fetched. **(inference, measure on
staging)** each organization token adds roughly 1 KB, so two or three workspaces approach the browser's 4 KB cookie
limit. The quick start offers external session storage (`SessionWrapper`) for exactly this. A single
non-organization API token avoids it (brief correction 4).

**Calling the API:**

| Option | Verdict |
|---|---|
| Browser fetches `api.example.com` with a token handed out by a server action | Token in JS, CORS on the API, refresh handled in two places. Rejected |
| RSC fetch with `getAccessTokenRSC` | Refreshes are not persisted; every render after expiry refreshes again. Rejected for data |
| **BFF route handler** (Next's documented pattern, [backend-for-frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)) | Chosen. Same-origin `/api/k/*`, cookie auth, the generated client just uses `basePath: "/api/k"` |

Risk to test in the first ticket **(unverified)**: parallel BFF calls with an expired token all refresh at once.
Logto rotates a confidential client's refresh token only after 70% of its lifetime
([Logto blog](https://blog.logto.io/understanding-refresh-token-rotation)), so it should be rare; prove it on staging.

**Roles and routing.** Access comes from the API (`GET /me` returns memberships with workspace id, slug, name, emoji,
colour, role, status), not from `organization_roles` claims, which Logto says go stale: "The ID token is only issued
during authentication and may become stale" ([docs](https://docs.logto.io/end-user-flows/organization-experience/get-user-info)).
Operator is a Logto global role read from the `roles` claim (`UserScope.Roles`) to show the `/ops` nav; the API
enforces it. Route map:

```
app/
  callback/route.ts            handleSignIn
  healthz/route.ts             liveness for Coolify
  api/k/[...path]/route.ts     BFF: token + forward, strips hop-by-hop headers
  (public)/sign-in/page.tsx    branded page, two buttons -> signIn(firstScreen signIn | register)
  (public)/join/[invitationId]/page.tsx    invite landing (public API lookup)
  (public)/join/[invitationId]/accept/page.tsx
  (app)/layout.tsx             requires session; loads /me once (React cache)
  (app)/page.tsx               0 memberships -> onboarding; else last workspace (cookie) -> /w/[slug]
  (app)/w/[slug]/layout.tsx    resolves membership; 404 if none; shell + switcher
  (app)/w/[slug]/{today,week,people,insights,month/[ym],settings,notifications}/page.tsx
  (operator)/ops/{workspaces,users,invites,notifications,health}/page.tsx
  %5F%5Fpreview/[screen]/page.tsx   dev-only harness, notFound() in production
```

Pages that differ by role (for example `insights`) render the employer or employee component from the membership
role; employer-only pages call a `requireRole("EMPLOYER")` helper that returns `notFound()`. The workspace switcher
lists `/me` memberships (emoji, colour, role badge); switching is a `<Link>` plus a `last_ws` cookie. No `proxy.ts`
in v1: Next itself says not to rely on proxy alone for auth, and layouts already check.

**Invite acceptance on the web:**

1. Email link (the API composes it through Logto's `messagePayload.link`,
   [docs](https://docs.logto.io/end-user-flows/organization-experience/invite-organization-members)) opens
   `app.example.com/join/<id>`.
2. The page shows the workspace card from the public lookup and two actions: "Create account" (new email) or
   "Sign in" (existing Klokka user).
3. Both are server actions calling `signIn` with `loginHint: email`, `firstScreen: "register"` or `"signIn"`, and
   `postRedirectUri: /join/<id>/accept`.
4. `accept` calls the API, which checks the email, calls Logto `PUT /api/organization-invitations/{id}/status`
   (Accepted, `acceptedUserId`), and returns the workspace slug; the page redirects to `/w/<slug>` with a
   celebratory first-run state.
5. If per-organization tokens are kept, step 4 must be followed by a silent `signIn({ prompt: "consent" })`
   (dart#109 workaround). Same after "create workspace".

Logto's experimental one-time-token (magic link) parameter exists in `@logto/js` (`oneTimeToken`, marked
`@experimental`) but is not in `@logto/next`'s `SignInOptions`; not for v1.

**LAN development:** Logto redirect URIs must list `http://<LAN_IP>:3000/callback` and the post sign-out URI;
`baseUrl` comes from `APP_BASE_URL`; `cookieSecure: false` only on plain http.

## 3. UI stack: distinctive but usable

**Decision:** Tailwind 4.3.3 CSS-first (no config file, tokens in `@theme`), shadcn/ui components initialized on
Base UI (`@base-ui/react` 1.8.0), `motion` 13.4.4 for layout/exit/gesture only, kulram-web's CSS keyframes for
entrances and ambient motion, `@number-flow/react` 0.6.2 (MIT) for animated figures.

| Primitive base | Status | Verdict |
|---|---|---|
| Radix (`radix-ui` 1.6.7) | "fully supported, no deprecation planned" | Fine, but no longer shadcn's default |
| **Base UI** | shadcn default for new projects since July 2026; "users chose it 2-to-1" ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)) | Chosen: default path, most current examples |
| React Aria (`react-aria-components` 1.21.1) | first-class shadcn base since July 2026, `init --base aria` ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-react-aria)) | Strongest a11y and date i18n, smaller shadcn community; keep as the fallback if Base UI's date inputs disappoint |

**Kulram-web's motion vocabulary** (read from its source; it uses no animation library at all):

| Pattern | Kulram implementation | Reuse in Klokka |
|---|---|---|
| Scroll reveal | `ui/Reveal.tsx`: `kRise` keyframe on `animation-timeline: view()`; unsupported browsers just show the final state | Landing sections, insights cards |
| Count-up | `stats/StatCounter.tsx`: server renders the final number, IntersectionObserver + rAF counts once, skipped under reduced motion | Landing; in the app use NumberFlow (animates value *changes*, locale-aware, `respectMotionPreference` default true, [site](https://number-flow.barvian.me/)) |
| Word rotator | `hero/HeadlineRotator.tsx`: `kSwapIn`/`kSwapOut` (3D flip + blur), fixed line height so nothing reflows | Landing hero |
| Marquee | `hero/PromptTicker.tsx`: list rendered twice, `kTick` translates -50%, pauses on hover, copy 2 `aria-hidden` | Landing testimonials or feature chips |
| Entrances | `kPop`, `kRise`, `kDrop`, `kMenuIn` with the house easing `cubic-bezier(.2,.7,.2,1)` | Dialogs, menus, toasts, saved-cell "pop" |
| Ambient | `kFloat`, `kBlink`, `kZoom` (scroll-linked photo zoom) | Empty states, onboarding |
| Safety net | global `prefers-reduced-motion` rule zeroes durations; decorative motion under `motion-safe:` | Same rule in `@klokka/tokens` CSS |

Split rule: CSS first (free, no hydration); `motion` only for list/layout animation (week grid rows, notification
list), `AnimatePresence` exits, shared-layout indicators (switcher pill), drag. Import `motion/react` in client
components; `motion/react-client` lets a server component render a `motion.div` without `"use client"`
([docs](https://motion.dev/docs/react-motion-component)). `AnimateNumber` is Motion+ (paid), hence NumberFlow.
Easing and durations live in `@klokka/tokens` so mobile uses the same curve (`Easing.bezier(0.2, 0.7, 0.2, 1)`).
One kulram habit not to copy: `SceneStage` scales a fixed 520 px design with a ResizeObserver; use container query
units instead (AGENTS.md "ask the platform").

**Keeping shadcn from looking like every shadcn app:**

1. Own tokens, shadcn's names: swap the neutral oklch palette for Klokka's brand ramp plus a second accent, but keep
   the semantic variables (`--background`, `--primary`, `--chart-1..5`) so components keep working.
2. Change the bones: 44 px controls, pill chips, 20 to 24 px cards, tinted shadows, thick accent focus rings.
3. Type with character: a display face for headings and big numbers, `tabular-nums` on every hours figure.
4. Hours are the hero (oversized figures), workspaces are colour-coded (emoji + colour from the data model).
5. One motion signature (cell-save "pop", spring presses, insight reveals) and illustrated empty states.
6. We own the code: every `shadcn add` output gets a pass against the tokens before first use.

Dark and light: semantic tokens switch per theme so components rarely need `dark:`. "Follow the device" is the CSS
media query with no script; an explicit choice is a cookie the root layout renders as `data-theme`, so there is no
flash. The `dark:` variant is redefined with `@custom-variant` ([docs](https://tailwindcss.com/docs/dark-mode)) and
must cover both the attribute and the media-query case **(exact variant syntax unverified)**.

## 4. Charts for insights

**Decision:** Recharts 3.10.1 through shadcn's `chart` wrapper (which "now uses Recharts v3",
[docs](https://ui.shadcn.com/docs/components/chart)). The calendar heat-map is a plain 7-column CSS grid, not a chart.

| Library | Latest (npm) | Last publish | Fit |
|---|---|---|---|
| **Recharts** | 3.10.1 | 2026-09-21 | Bars, lines, areas, composed charts; `accessibilityLayer` on by default in v3 ([migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide)); colours from `--chart-*` so light/dark come free |
| Nivo | 0.99.0 | 2025-05-23 | Has a calendar chart, but 16 months without a release |
| visx | 4.0.0 | 2026-06-11 | Low-level d3 primitives; we would build every chart and its a11y ourselves |
| Tremor (`@tremor/react`) | 3.18.7 | 2025-01-13 | Package frozen since Vercel bought Tremor; now copy-paste components built on Recharts ([Vercel](https://vercel.com/blog/vercel-acquires-tremor)). Useful as design reference only |
| ECharts | 6.1.0 | 2026-05-19 | Canvas, very capable, large bundle, theming outside our CSS tokens |

Mapping: bars per employee (horizontal `BarChart`), week-by-week (`AreaChart` with gradient), weekday distribution
(`BarChart` Mon to Sun ordered by workspace `week_start`), calendar heat-map (CSS grid, colour scale from tokens,
each day a real button with an `aria-label` like "Tue 9 Sep, 7.5 h"), count-ups (NumberFlow). Every chart also
renders its figures as text (a caption or a visually hidden table).

**Parity with mobile:** chart components take plain series, never raw entries. The shapes come from the API's
insights DTOs (generated types) or, where the client derives them, from pure functions in `@klokka/core/insights`
(`hoursByMember`, `weeklyTrend`, `weekdayDistribution`, `monthGrid`). Mobile feeds the same series to its own chart
library, so the numbers cannot drift even though the renderers differ.

## 5. Operator console

**Decision:** no Refine. The `(operator)` route group uses TanStack Table 9.2.4 with shadcn's `table` (its data table
guide already uses v9's `useTable`, [docs](https://ui.shadcn.com/docs/components/data-table)), server-side
pagination through the API, and the same TanStack Query + api-client as the rest of the app.

| Option | For | Against |
|---|---|---|
| Refine headless + `@refinedev/nextjs-router` 7.0.5 | CRUD plumbing, access control hooks | Second data layer over TanStack Query; last release 2026-04. In hezdar-panel the team already wraps it (`useRows` around `useList`, a hand-written `dataProvider` mapping) to get the shapes it wants |
| **TanStack Table + own components** | Headless sorting/filtering/column state, shadcn styling, one data layer | We write the list screens (four or five, read-mostly) |
| Nothing special | Least code | Sorting/filtering re-invented per table |

"Never a generic admin" is then a design task: operator screens use the same tokens, type and motion as the product.

## 6. Monorepo

**Decision:** npm workspaces (npm 11.9 installed), packages publish TypeScript source through `exports` (no build
step), no TS project references, one `package-lock.json`.

| | npm workspaces (chosen) | pnpm 12.6 | bun 1.4.2 |
|---|---|---|---|
| Precedent | tax-agent (web + Expo + core) | none here | none here |
| Expo | supported; hoisted layout by default | isolated installs since SDK 54 but "not all packages you install will work", `nodeLinker: hoisted` advised ([Expo monorepos](https://docs.expo.dev/guides/monorepos/)) | supported |
| Docker/CI | `npm ci -w <app>` tested | extra tool in every image | runtime drift risk |

```
klokka/
  package.json          workspaces: apps/web, apps/landing, apps/mobile, packages/*   (apps/api is Maven, not a workspace)
                        overrides: react 19.2.3, react-dom 19.2.3; devDeps: typescript ~6.0.3, prettier
  package-lock.json
  tsconfig.base.json    strict, noUncheckedIndexedAccess, moduleResolution bundler
  apps/
    api/                Java; owns src/main/openapi/openapi.yaml
    web/                Next.js app (app.example.com)
    landing/            Next.js site (example.com)
    mobile/             Expo app
  packages/
    core/               @klokka/core        pure TS, zero runtime deps
    api-client/         @klokka/api-client  generated typescript-fetch, committed
    tokens/             @klokka/tokens      design tokens: TS source + generated theme.css
```

| Package | `exports` | Contents |
|---|---|---|
| `@klokka/core` | `.`, `./hours`, `./month`, `./insights`, `./format`, `./i18n`, `./test/*` | rounding (none / 0.25 / 0.5), hours input parsing ("2,5" and "2.5"), month and week math with `week_start`, insights series builders, `Intl` formatters (hours, money, dates) per locale, the sv/en catalogue, test fixtures. A `platformNeutrality` test (tax-agent precedent) forbids DOM and React Native imports |
| `@klokka/api-client` | `.` | `openapi-generator-cli` typescript-fetch output (tax-agent's options) plus `createApi({ basePath, fetchApi, middleware })`. Web uses `basePath: "/api/k"`; mobile uses the API URL and an `accessToken` callback. Output is committed so the web Docker build needs no JVM; a check regenerates and fails on diff |
| `@klokka/tokens` | `.`, `./theme.css` | `src/tokens.ts` is the source (colours in **hex**: React Native does not parse `oklch`, [RN colors](https://reactnative.dev/docs/colors)); `scripts/build.ts` writes `dist/theme.css` (`@theme inline` mappings plus light and dark variable sets), committed with the same regenerate-and-diff check. Node 24 runs the `.ts` script directly (tested). Web does `@import "@klokka/tokens/theme.css"` after `@import "tailwindcss"` (tested with a plain `@theme` block; Tailwind documents sharing a theme file across a monorepo, [theme docs](https://tailwindcss.com/docs/theme)) |

Verified in `mono/`: Turbopack compiled TS-source workspace packages without `transpilePackages` (Next docs: workspace
packages are transpiled automatically, [transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)),
the tokens CSS landed in the build, and the page rendered the core catalogue.

Expo side (mobile researcher to confirm): Metro auto-configures monorepos since SDK 52, but keep tax-agent's
`resolver.blockList` for `apps/api/target`, Docker volumes and `.claude/` worktrees (a directory removed mid-crawl
kills the dev server). Keep `@types/react` ~19.2.2 and `typescript` ~6.0.3 at Expo's pins.

## 7. i18n

**Decision:** hand-rolled typed catalogue in `@klokka/core/i18n`: `sv` is the source, `en: Messages` is typed
against it (a missing key fails the build), values are strings or small typed functions, plurals and numbers go
through `@klokka/core/format` (`Intl`). Web: the root layout resolves the locale (profile, then cookie, then
`Accept-Language`, default `sv`); server components pass `t` slices down (kulram rule); client components read a
tiny `LocaleProvider`. Landing keeps kulram's path-based `/` and `/en` routing with its own marketing dictionary.

| | next-intl 4.14.7 (+ `use-intl` on mobile) | Hand-rolled typed catalogue (chosen) |
|---|---|---|
| Runtime | plugin, request config, ICU parser | none |
| React Native | `use-intl` works in React apps ([docs](https://next-intl.dev/docs/environments/core-library)); Hermes `Intl` coverage for ICU plurals **(unverified)** | plain objects, same code |
| Type safety | keys via `AppConfig` augmentation; ICU argument typing needs extra setup | keys and arguments checked by `tsc` |
| Locale routing | its strength, not needed behind a login | not needed |
| Precedent | none here | kulram-web `dictionaries.ts`, tax-agent `packages/core/src/i18n` |

For the API (brief correction 5): author the notification and email subset as `{name}`-placeholder strings, not
functions, so a small script can export `notifications.{sv,en}.json` for the Java side. Pending the backend decision.

## 8. Testing and quality

**Decision:**

| Tool | Version | Role |
|---|---|---|
| Vitest + Testing Library + jsdom | 5.0.2, 16.3.3, 30.1.1 | `@klokka/core` (most logic lives here), client components. Next: "Vitest currently does not support" async Server Components, so keep them thin and cover pages with Playwright ([Vitest guide](https://nextjs.org/docs/app/guides/testing/vitest)) |
| Playwright | 1.63.0 | projects below |
| ESLint | **9.39.5** | `eslint-config-next/core-web-vitals` + `/typescript` + `eslint-config-prettier/flat`; ESLint 10 crashes today (brief correction 1) |
| Prettier | 3.9.9 + `prettier-plugin-tailwindcss` 0.8.1 | formatting and class order |
| TypeScript | ~6.0.3 | `strict`, `noUncheckedIndexedAccess`; `tsc --noEmit` per workspace |

Playwright projects, copying tax-agent's split (`app/src/main/frontend/playwright.config.ts`):

- `visual`: non-gating screenshot producer. Drives a dev-only preview harness that renders real components with
  fixture data built from the generated API types (no Logto, no API), light and dark, at 360x640, 390x844, 412x915,
  430x932 and 1440x900. Next treats `_folders` as private, so tax-agent's `/__preview` URL needs the folder name
  `%5F%5Fpreview` ([project structure](https://nextjs.org/docs/app/getting-started/project-structure)).
- `layout`: the gating real-browser checks jsdom cannot see (no horizontal overflow, week grid scrolls inside its
  own container with a sticky name column, 44 px targets), at the same viewports, including a soft-keyboard-shaped
  viewport change for the entry sheet.
- `lan`: `baseURL` from `PW_BASE_URL=http://<hostname -I first IP>:3000`; proves hydration over the LAN by typing
  into a week-grid cell and asserting the row total changes. This is the AGENTS.md rule made executable.

Lint findings worth carrying: tax-agent's em dash rule (`Literal` and `TemplateElement` selectors) does **not** catch
JSX text; adding `JSXText[value=/\u2014/]` does (tested in `eslint10/`). Keep kulram-web's `grep` gate too, since it
also covers JSON, CSS and Markdown.

## 9. Forms and data

**Decision:** TanStack Query 5.104 in client components, calling `@klokka/api-client` through the BFF. Server
components render the shell, auth and membership gate, and skeletons. Server actions only for `signIn`, `signOut`,
locale and theme cookies.

Why not server actions for mutations: Next says the client "dispatches and awaits them one at a time" and "Server
Actions are queued. Using them for data fetching introduces sequential execution"
([mutating data](https://nextjs.org/docs/app/getting-started/mutating-data), [BFF guide](https://nextjs.org/docs/app/guides/backend-for-frontend)).
A week grid with dozens of cells, each followed by a full RSC refresh, would feel sluggish. Query also gives
polling for the notification badge (`refetchInterval` plus refetch on focus; no web push in v1) and matches what the
mobile app will most likely use with the same client.

Optimistic updates use the cache approach (`onMutate`: cancel, snapshot, `setQueryData`; `onError`: roll back;
`onSettled`: invalidate), because one edit changes the grid, row and column totals and the month view at once;
TanStack recommends the cache approach when "multiple places on the screen" need the update
([guide](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)). Week grid: edits collect
in a dirty map, save on blur or after a short idle as one batch mutation (open question 3), failed cells keep their
value with an error ring and a retry. Forms (add employee, settings) are small controlled forms with inline
validation shared from `@klokka/core`; no form library until one is clearly needed.

## Open questions

1. **Token model (owner + backend):** one API-resource token with API-side membership checks (recommended for the
   web), or per-workspace organization tokens (needs external session storage and re-consent after create/accept)?
2. **Server-side strings (backend):** does the API take the exported `notifications.{sv,en}.json` from
   `@klokka/core`, or keep its own bundle?
3. **Batch entries endpoint (backend):** `PUT /workspaces/{id}/entries` with a list, returning the saved rows, as the
   unit of a "sitting" for notification coalescing?
4. **Insights computation (backend):** API-computed aggregates (preferred: one source for both clients) or
   client-derived from raw entries?
5. **Invite links on Android (mobile):** should `app.example.com/join/*` be an Android App Link that opens the app
   when installed?
6. **Logto branding (design):** how far can the hosted sign-in pages be themed to match the app **(unverified)**;
   this is the first screen every employee sees.
