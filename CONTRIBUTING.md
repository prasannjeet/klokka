# Contributing to Klokka

Thanks for looking. Klokka is small and opinionated; the conventions below keep it that way.

## Before you start
- Read `AGENTS.md`: it is the rulebook for humans and agents alike (parity between the web app and the
  phone, the OpenAPI-first contract, authorization from the membership table, the shared catalogue for
  every string, the Java and frontend rules).
- Read `docs/DECISIONS.md` for the calls already made and why.

## Setting up
See "Running it" in `README.md`. You need JDK 25, Maven, Node 24, npm 11 and Docker.

## Making a change
1. A feature or fix that changes what the API returns starts in
   `apps/api/contract/src/main/openapi/openapi.yaml`; regenerate the server interfaces (`mvn install`)
   and the client (`npm run generate -w @klokka/api-client`) and commit both.
2. Every user-facing string goes into `packages/core/i18n/sv.json` and `en.json` (both, always), then
   `npm run gen-i18n -w @klokka/core`.
3. Ship the feature on the API, the web app and the phone in the same change. If one client must wait,
   say so in the pull request and open an issue for it.
4. Tests: `mvn -f apps/api/pom.xml clean install`, `npm test`, `npm run lint`, `npm run check`.
5. Never commit credentials. `.agents/local-credentials/`, `.env*`, keystores and
   `google-services.json` are ignored on purpose.

## Style
- No em dash characters in user-facing text (the linter enforces it).
- Commit subjects start with the issue key when there is one.

## Reporting a security issue
See `SECURITY.md`.
