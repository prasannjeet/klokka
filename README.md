# Klokka

Klokka ("the clock" in Norwegian) is a free, open-source app for small employers who pay by the hour.
The employer logs the hours each employee worked, day by day, and both sides see the month add up:
hours always, money only if the employer switches it on. Employees get a notification the moment their
hours are added or changed, can flag an entry they think is wrong, and can share a monthly card.

One API, two clients with full feature parity: an Android app (iOS-ready, Expo) and a web app, plus a
marketing site.

**Status: design phase.** Nothing is implemented yet. The product brief, the research and the mockups
are in `docs/`; implementation starts after the owner approves the preliminary report.

## Stack (locked, see `docs/DECISIONS.md`)

| Part | Choice |
|---|---|
| API | Java 25, Quarkus (Maven), PostgreSQL 18, Flyway, Hibernate ORM with Panache, OpenAPI-first |
| Auth | Logto (OIDC). Workspaces are Logto organizations; the API authorizes from its own membership table |
| Mobile | Expo SDK 57, React Native 0.86, Expo Router, prebuild + development builds (never Expo Go), Android first |
| Web app | Next.js 16 (App Router), Tailwind v4, shadcn/ui on Base UI, Recharts 3, TanStack Query |
| Landing | Next.js 16 static, Swedish default + English |
| Shared | `packages/core` (domain rules + i18n catalogue), `packages/api-client` (generated), `packages/tokens` (design tokens) |
| Hosting | Docker images on our Nexus registry, Coolify (staging now, production by `v*` tag later) |
| Notifications | Expo push (FCM on Android), in-app center, email only for invitations and opt-in digests |

## Repository layout

```
apps/api        Quarkus API (Maven)
apps/web        Next.js product app (app.example.com), includes the operator console
apps/landing    Next.js marketing site (example.com)
apps/mobile     Expo app (Android now, iOS-ready)
packages/core   Pure TypeScript: domain helpers, the typed i18n catalogue (JSON, also read by the API)
packages/api-client  TypeScript client generated from apps/api's openapi.yaml
packages/tokens Design tokens: CSS variables for the web, a TS object for mobile
docs/           Brief, decisions, research, design (tokens, mockups), brand (logo), Jira plan
```

## Documentation

- `docs/PRODUCT_BRIEF.md`: what Klokka is, roles, the core loop, v1 scope, data model.
- `docs/DECISIONS.md`: cross-cutting decisions and the questions still open for the owner.
- `docs/research/backend-and-infra.md`, `docs/research/web.md`, `docs/research/mobile.md`: the
  verified research behind every stack choice (versions, proofs, citations).
- `docs/design/DIRECTION.md`: visual direction, the theme options, motion vocabulary; mockups in
  `docs/design/mockups/` (open any `.html` file in a browser; the floating bar switches theme and mode).
- `docs/brand/`: logo concepts and, once chosen, the final logo files.
- `docs/JIRA_PLAN.md`: the epic and story ladder mirrored in Jira (project CHQ, prefix `KLOKKA:`).
- `AGENTS.md`: conventions and engineering rules for anyone (human or agent) working in this repo.

## Running it

Coming with the first implementation ticket (E0 in `docs/JIRA_PLAN.md`): `docker compose up` for
Postgres and Mailpit, `mvn quarkus:dev` for the API, `npm run dev` per web app, and the Expo development
build loop for the phone.

## License

MIT. See `LICENSE`.
