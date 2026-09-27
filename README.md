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

Prerequisites: JDK 25 (`sdk env` reads `.sdkmanrc`; on this host `~/.sdkman/candidates/java/25.0.2-amzn`),
Maven 3.9, Node 24 (`nvm use` reads `.nvmrc`), npm 11, Docker.

```sh
# JavaScript workspaces: tokens, core, api-client (web, landing and mobile arrive with their tickets)
npm install
npm run build          # tokens -> dist/theme.css, core -> typed catalogue, api-client -> typecheck
npm test               # Vitest in every workspace
npm run lint           # ESLint (em dash rule incl. JSX), Prettier, the repo-wide em dash grep
npm run check          # regenerate-and-diff guards for every committed generated output

# API (Quarkus, JDK 25). Tests start a Postgres 18 container through Dev Services / Testcontainers.
export JAVA_HOME=~/.sdkman/candidates/java/25.0.2-amzn
mvn -f apps/api/pom.xml clean install            # contract (generated interfaces) + service, with tests
mvn -f apps/api/service/pom.xml quarkus:dev      # http://localhost:8080/v1, Dev Services Postgres, Mailpit off

# The whole local stack: Postgres 18 on 5434 and Mailpit (UI 8025, SMTP 1025). To point dev mode at it
# instead of Dev Services, export QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://localhost:5434/klokka
# QUARKUS_DATASOURCE_USERNAME=klokka QUARKUS_DATASOURCE_PASSWORD=klokka before quarkus:dev.
docker compose up -d

# A mock API from the contract, for the frontends before the real endpoints exist (D13):
npm run mock:api       # http://localhost:4010/me (Prism serves the paths without the /v1 prefix)

# After a change to apps/api/contract/src/main/openapi/openapi.yaml:
mvn -f apps/api/pom.xml install                  # regenerates the server interfaces
npm run generate -w @klokka/api-client            # regenerates the committed TypeScript client
```

Ports on this host (docs/DECISIONS.md D10): API 8080, web 3000, landing 3001, Metro 8083, mock API 4010,
compose Postgres 5434, Mailpit 8025/1025. Tests bind a random port (`%test.quarkus.http.test-port=0`).

The API reads its environment from `KLOKKA_*` variables (see `.env.example` and
`apps/api/service/src/main/resources/application.properties`): `KLOKKA_DB_URL`, `KLOKKA_DB_USER`,
`KLOKKA_DB_PASSWORD`, `KLOKKA_DB_MIGRATE_USER`, `KLOKKA_DB_MIGRATE_PASSWORD`, `KLOKKA_AUTH_ISSUER`,
`KLOKKA_AUTH_AUDIENCE`, `KLOKKA_AUTH_JWKS`, `KLOKKA_LOGTO_ENDPOINT`, `KLOKKA_LOGTO_M2M_CLIENT_ID`,
`KLOKKA_LOGTO_M2M_CLIENT_SECRET`, `KLOKKA_LOGTO_WEBHOOK_SIGNING_KEY`, `KLOKKA_MAIL_HOST`, `KLOKKA_MAIL_PORT`,
`KLOKKA_MAIL_USERNAME`, `KLOKKA_MAIL_PASSWORD`, `KLOKKA_MAIL_FROM`, `KLOKKA_MAIL_START_TLS`,
`KLOKKA_MAIL_MONTHLY_QUOTA`, `KLOKKA_WEB_BASE_URL`, `KLOKKA_EXPO_ACCESS_TOKEN`. The image is built from
`apps/api/Dockerfile` after `mvn package` (context `apps/api`, fast-jar on `eclipse-temurin:25-jre`, port 8080).

`docs/CONTRACT.md` indexes every operation of the API contract.

## License

MIT. See `LICENSE`.
