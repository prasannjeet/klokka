# Klokka: Jira ticket ladder (project CHQ)

Conventions (locked):
- Every summary starts with `KLOKKA: `. Every ticket carries the label `klokka`. The CHQ "Repository"
  select has no klokka option yet, so it stays unset; the repo is named in the description.
- Every feature ticket has a **Parity** section: what the API, the web app and the mobile app each
  deliver. A ticket that ships one client only is not done. Deferring one client needs an explicit
  follow-up ticket linked from the deferring one.
- Every ticket created from a Claude Code session links that session (`https://claude.ai/code/session_<id>`).
- Branch `CHQ-<n>-<slug>`, commit subject `CHQ-<n>: ...` once implementation starts.

Status: this ladder is the PLAN. Tickets are created in Jira after the owner reviews the preliminary
report; anything changed in review is changed here and there.

## Epics

| # | Epic | Contains |
|---|---|---|
| E0 | KLOKKA: Foundations | monorepo, API skeleton, OpenAPI contract + generated client, Logto tenant objects, Postgres, release script, staging deploy of empty apps |
| E1 | KLOKKA: Identity and workspaces | sign-up, create workspace, invite employee, accept invite, roles, workspace switcher, member management |
| E2 | KLOKKA: Logging hours | single entry, quick chips, week grid, notes, change history, month lock |
| E3 | KLOKKA: Seeing hours | employee month view, employer per-employee view, workspace totals, calendar heat-map |
| E4 | KLOKKA: Insights | employer dashboard, employee dashboard, projections, unlogged-day nudges |
| E5 | KLOKKA: Pay | show-pay toggle, hourly rates, money next to hours, CSV export |
| E6 | KLOKKA: Notifications | push infrastructure, in-app center, coalescing, invite email, weekly digest, preferences |
| E7 | KLOKKA: Flags and corrections | employee flags an entry, employer resolves, both notified |
| E8 | KLOKKA: Brand and design system | tokens package, logo and app icons, shareable monthly card, dark mode |
| E9 | KLOKKA: Landing site | marketing site sv/en, SEO, Docker, staging deploy |
| E10 | KLOKKA: Operator console | workspaces, users, invites, email/push volume, health |
| E11 | KLOKKA: Quality and release | test pyramid, on-device flows, staging smoke, v1 release and open-source hygiene |

## Stories (grouped by epic, in build order)

### E0 Foundations
1. Monorepo skeleton: `apps/api`, `apps/web`, `apps/landing`, `apps/mobile`, `packages/core`, `packages/api-client`, `packages/tokens`; root tooling (TypeScript, ESLint, Prettier), `AGENTS.md`, `README.md`.
2. API skeleton on Quarkus + JDK 25: health, config validation, Postgres + Flyway baseline, ArchUnit and Testcontainers wiring.
3. OpenAPI contract v0 and the generation pipeline: server interfaces + the one TypeScript client consumed by web and mobile.
4. Logto tenant objects for Klokka on staging: API resource, web app, native app, M2M app, organization template with EMPLOYER/EMPLOYEE roles, `platform-admin` global role, email connector on our SMTP.
5. Auth wiring end to end: JWT validation in the API (issuer, audience, org roles), Logto in the web app, native PKCE in mobile; a `GET /me` round-trip proves it on all three.
6. Docker images and `release.sh`: build, push to Nexus, deploy to Coolify staging for api, web, landing; env-var inventory; healthchecks.
7. Local dev stack: docker-compose (Postgres, Mailpit), Quarkus dev mode, web dev on LAN with `allowedDevOrigins`, mobile Metro on its own port, documented in README.

### E1 Identity and workspaces
8. Employer sign-up and "create your workspace" (name, timezone, currency, week start, colour/emoji). Parity: API + web + mobile.
9. Invite an employee (name, email, optional hourly rate): Logto user/organization invitation, branded invite email, member shows as Invited. Parity: API + web + mobile.
10. Accept an invitation: from the email link to a signed-in employee in the right workspace, on web and on the phone. Parity: web + mobile (+ API callback).
11. Workspace switcher and "my workspaces" for users in several workspaces. Parity: web + mobile.
12. Member management: edit name/rate, deactivate, reactivate, remove; the employee sees their status. Parity: API + web + mobile.

### E2 Logging hours
13. Add or edit one day's hours for one employee, with quick chips (0.5/1/2/4/8/full day), a note, and rounding by workspace rule. Parity: API + web + mobile.
14. Week grid: every employee x every day of the week, keyboard-fast on web, swipe-fast on mobile, "same as yesterday" and "fill the week". Parity: API + web + mobile.
15. Change history on every entry (who, what, when) visible to both roles. Parity: API + web + mobile.
16. Month lock and unlock by the employer; locked months refuse edits everywhere. Parity: API + web + mobile.

### E3 Seeing hours
17. Employee month view: calendar with hours per day, month total, average per working day, vs last month. Parity: API + web + mobile.
18. Employer per-employee month view and workspace totals, with month navigation. Parity: API + web + mobile.
19. Calendar heat-map component shared in shape between web and mobile. Parity: web + mobile.

### E4 Insights
20. Employer insights: total hours, per-employee comparison, week-by-week trend, weekday distribution, busiest day, projected month end. Parity: API + web + mobile.
21. Employee insights: hours this month, average per working day, best week, streak. Parity: API + web + mobile.
22. "Nothing logged" nudges for the employer (days with no entries for active employees). Parity: API + web + mobile.

### E5 Pay
23. Workspace toggle "show pay to employees" and per-employee hourly rate. Parity: API + web + mobile.
24. Money next to hours everywhere when pay is on (entries, month views, insights, labour cost). Parity: web + mobile.
25. CSV export of a month, per employee or whole workspace. Parity: API + web + mobile (share sheet).

### E6 Notifications
26. Push infrastructure: device token registration, Expo push sender with receipts, FCM credentials on Android. Parity: API + mobile.
27. In-app notification center with read state. Parity: API + web + mobile.
28. Hours events coalesced per sitting ("Maria added 5 days, 22.5 h"), invite accepted, month closed. Parity: API + web + mobile.
29. Email: invitation template, opt-in weekly digest job, quota-aware sending. Parity: API (+ settings on web and mobile).
30. Notification preferences per user (push on/off, digest on/off). Parity: API + web + mobile.

### E7 Flags and corrections
31. Employee flags an entry with a message; employer resolves (fix or dismiss); both sides notified. Parity: API + web + mobile.

### E8 Brand and design system
32. `packages/tokens`: the chosen theme as CSS variables (web) and a TS object (mobile), light and dark.
33. Logo finals (light and dark, transparent SVG/PNG), app icons, splash, favicon, social card.
34. Shareable monthly card image from the employee's month. Parity: web + mobile.
35. Dark mode everywhere following the device, with a manual override. Parity: web + mobile.

### E9 Landing site
36. Landing site (sv default, en), sections from the approved mockup, SEO, JSON-LD, Docker, staging deploy.

### E10 Operator console
37. Operator console route group: workspaces, members and invite status, notification and email volume, health; gated on `platform-admin`. Parity: API + web (mobile: not applicable, deliberately).

### E11 Quality and release
38. Test pyramid: API (unit + Testcontainers IT), web (Vitest + Playwright incl. LAN verification), mobile (Jest + RNTL, Maestro on-device flows).
39. Staging smoke checklist and the first end-to-end run with two real accounts on a phone and a browser.
40. v1 release: version tags, CHANGELOG, open-source hygiene (CONTRIBUTING, issue templates, security policy).

## Jira keys (created 2026-09-27)

| Plan item | Jira key | Summary |
|---|---|---|
| E0 | CHQ-93 | KLOKKA: Foundations |
| E1 | CHQ-94 | KLOKKA: Identity and workspaces |
| E2 | CHQ-95 | KLOKKA: Logging hours |
| E3 | CHQ-96 | KLOKKA: Seeing hours |
| E4 | CHQ-97 | KLOKKA: Insights |
| E5 | CHQ-98 | KLOKKA: Pay |
| E6 | CHQ-99 | KLOKKA: Notifications |
| E7 | CHQ-100 | KLOKKA: Flags and corrections |
| E8 | CHQ-101 | KLOKKA: Brand and design system |
| E9 | CHQ-102 | KLOKKA: Landing site |
| E10 | CHQ-103 | KLOKKA: Operator console |
| E11 | CHQ-104 | KLOKKA: Quality and release |
| 1 | CHQ-105 | KLOKKA: Monorepo skeleton (apps, packages, root tooling) |
| 2 | CHQ-106 | KLOKKA: API skeleton on Quarkus + JDK 25 |
| 3 | CHQ-107 | KLOKKA: OpenAPI contract v0 and the generation pipeline |
| 4 | CHQ-108 | KLOKKA: Logto tenant objects for Klokka on staging |
| 5 | CHQ-109 | KLOKKA: Auth wiring end to end (API, web, mobile) |
| 6 | CHQ-110 | KLOKKA: Docker images and release.sh |
| 7 | CHQ-111 | KLOKKA: Local dev stack |
| 8 | CHQ-112 | KLOKKA: Employer sign-up and create your workspace |
| 9 | CHQ-113 | KLOKKA: Invite an employee |
| 10 | CHQ-114 | KLOKKA: Accept an invitation |
| 11 | CHQ-115 | KLOKKA: Workspace switcher and my workspaces |
| 12 | CHQ-116 | KLOKKA: Member management |
| 13 | CHQ-117 | KLOKKA: Add or edit one day's hours with quick chips, a note and rounding |
| 14 | CHQ-118 | KLOKKA: Week grid for every employee and every day of the week |
| 15 | CHQ-119 | KLOKKA: Change history on every entry |
| 16 | CHQ-120 | KLOKKA: Month lock and unlock by the employer |
| 17 | CHQ-121 | KLOKKA: Employee month view |
| 18 | CHQ-122 | KLOKKA: Employer per-employee month view and workspace totals |
| 19 | CHQ-123 | KLOKKA: Calendar heat-map component shared between web and mobile |
| 20 | CHQ-124 | KLOKKA: Employer insights |
| 21 | CHQ-125 | KLOKKA: Employee insights |
| 22 | CHQ-126 | KLOKKA: Nothing logged nudges for the employer |
| 23 | CHQ-127 | KLOKKA: Show-pay-to-employees toggle and per-employee hourly rate |
| 24 | CHQ-128 | KLOKKA: Money next to hours everywhere when pay is on |
| 25 | CHQ-129 | KLOKKA: CSV export of a month |
| 26 | CHQ-130 | KLOKKA: Push infrastructure |
| 27 | CHQ-131 | KLOKKA: In-app notification center with read state |
| 28 | CHQ-132 | KLOKKA: Coalesced hours events, invite accepted and month closed notifications |
| 29 | CHQ-133 | KLOKKA: Email: invitation template, opt-in weekly digest, quota-aware sending |
| 30 | CHQ-134 | KLOKKA: Notification preferences per user |
| 31 | CHQ-135 | KLOKKA: Employee flags an entry, employer resolves, both notified |
| 32 | CHQ-136 | KLOKKA: packages/tokens: theme as CSS variables and a TS object, light and dark |
| 33 | CHQ-137 | KLOKKA: Logo finals, app icons, splash, favicon and social card |
| 34 | CHQ-138 | KLOKKA: Shareable monthly card image |
| 35 | CHQ-139 | KLOKKA: Dark mode everywhere with a manual override |
| 36 | CHQ-140 | KLOKKA: Landing site (sv default, en) |
| 37 | CHQ-141 | KLOKKA: Operator console |
| 38 | CHQ-142 | KLOKKA: Test pyramid across API, web and mobile |
| 39 | CHQ-143 | KLOKKA: Staging smoke checklist and first end-to-end run |
| 40 | CHQ-144 | KLOKKA: v1 release and open-source hygiene |
