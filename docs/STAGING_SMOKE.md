# Staging smoke (CHQ-143, integration pass)

End-to-end run of Klokka on STAGING with real accounts, 2026-09-28. Every step below was driven against
`https://klokka-app.coolify.ooguy.com` (web), `https://klokka-api.coolify.ooguy.com/v1` (API) and Klokka's own
Logto with Playwright 1.61 (headless Chromium) plus the API and the Logto Management API for the checks a
browser cannot see. Staging holds test data only; nothing here touched production.

Accounts (passwords in `.agents/local-credentials/staging-accounts.json`, gitignored, never in a doc):

| Role | Login (mailbox) | Logto user |
|---|---|---|
| Employer | `admin@blixo.ai` | `wzs936oq5rt2` |
| Employee | `test@blixo.ai` | (filled in below) |
| Operator (`platform-admin`) | `sleep-chooser-coma@duck.com` (password in `logto.json`) | `6uqr9falofc6` |

Workspace(s) created: filled in below. They stay in place for the owner to look at.

## Before the pass: what was broken on arrival

| # | Finding | Fix |
|---|---|---|
| A | Web app answered `500` on every page: `KLOKKA_API_RESOURCE` missing (Coolify had the provisional name `LOGTO_API_RESOURCE`). | Env renamed on Coolify (`KLOKKA_API_RESOURCE`, plus `KLOKKA_ANDROID_APK_URL`); `docs/DEPLOYMENT.md` names now match `apps/web/src/lib/env.ts`. |
| B | API `/q/health/well` reported Logto DOWN (`HTTP 401`); workspace creation and invitations would have failed. Cause: `ExpoAuthHeaders` was a `@Provider`, so Quarkus registered it on every REST client and the Expo access token replaced the Logto bearer (`ERR_JWS_INVALID` from Logto). Invisible locally because the Expo token is empty there. | `c3a3816` (regression test `ExpoAuthHeadersTest`). |
| C | Logto hook lacked `User.Deleted` (DEPLOYMENT.md asked for it). | Added through the Management API (`PATCH /api/hooks/eoeb31x3brwyfaeb5081x`). |
| D | `KLOKKA_OPERATOR_API_URL` / `KLOKKA_OPERATOR_LANDING_URL` were not set on Coolify, so the operator Health page could only probe the web app. | Set on Coolify. |

## The checklist

Legend: PASS, FAIL (with the fix commit), OPEN (stays open, with the reason).

