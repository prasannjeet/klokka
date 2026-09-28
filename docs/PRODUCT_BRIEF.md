# Klokka: product brief (v0, pre-approval)

Status: DRAFT written 2026-09-27 from the owner's spoken brief. Nothing here is implemented. The
owner reviews the preliminary report (mockups + this brief + the research) and approves or
changes it; only then does implementation start.

## One line

Klokka is a free, open-source app where an employer logs the hours each employee worked and both
sides can see, month by month, exactly how much time was put in (and, if the employer wants, what
it is worth).

Name: "Klokka" is Norwegian for "the clock". Repo: `prasannjeet/klokka` (personal GitHub, public,
MIT). Jira: project `CHQ`, every ticket summary prefixed `KLOKKA: `.

Business model (owner, 2026-09-27): commercial open source with a hosted service, the cal.com / Odoo
shape. The code is MIT and anyone can self-host it; we run a hosted instance that is free to use today
and may charge for hosted plans later. Public copy says "free to use" and "open source" and offers a
direct sign-up; it never mentions pricing, tiers or seats.

## Who uses it

| Role | Who | What they do |
|---|---|---|
| Employer | The person who runs a small business (cafe, cleaning firm, salon, shop, agency) with a handful of hourly workers | Creates a workspace, invites employees, logs hours per employee per day, reads the insights, decides whether pay is shown, closes a month, exports |
| Employee | A worker at that business | Sees their own hours (day / week / month), monthly totals, optional earnings, gets a notification whenever the employer adds or changes their hours, can flag an entry they think is wrong |
| Operator | Us, running the hosted instance | Sees workspaces, users, invite status, notification/email volume, health. Nothing about anyone's hours beyond aggregates |

A workspace is one business. A user can belong to several workspaces (an employee with two employers,
an employer who also works for someone). Roles are per workspace.

Wording (CHQ-145): users read "business" (sv "företag") wherever the code says workspace: "Create a business",
"Choose a business", "Your businesses" / "Skapa ett företag", "Välj företag". Code identifiers, routes (`/w/`),
API fields and the contract keep `workspace`.

## The core loop (v1)

1. **Sign up as employer** (email + password through Logto; social logins later). Create a workspace:
   name, country/timezone, currency, week start day.
2. **Add an employee**: name + email (+ optional hourly rate). The employee gets an invitation email
   ("<Employer> invited you to Klokka"); they set a password and land in the app as an employee of that
   workspace. Until they accept they show as "Invited".
3. **Log hours**: pick an employee, pick a day, enter hours (2.5, 3, 4...). Fast paths: quick chips
   (0.5 / 1 / 2 / 4 / 8), "same as yesterday", and a **week grid** where the employer fills every
   employee's week like a spreadsheet. One entry per employee per day (editing replaces it; every change
   is kept in a history). Optional note per entry.
4. **Employee is told**: push notification + in-app notification when hours are added, changed or
   removed for them. Changes made in one sitting are coalesced ("Maria added 5 days, 22.5 h") so a
   week of entries is one notification, not five.
5. **Month view**: employee sees a calendar of their hours, the month total, the average per working
   day and how it compares to last month. Employer sees the same per employee plus workspace totals.
6. **Insights** (employer): total hours this month, per-employee comparison, week-by-week trend, weekday
   distribution, busiest day, projected month end, days with nothing logged, and labour cost if pay is on.
   Employee insights: hours this month, average per working day, best week, earnings if enabled.
7. **Pay is optional**: a workspace toggle "show pay to employees". When on, each employee has an hourly
   rate and every hours figure gets a money figure next to it. When off, Klokka is hours only and the
   employer does money elsewhere. An employee without a rate sees hours only, even with pay on, until the
   employer sets one (CHQ-145).
8. **Close the month**: employer locks a month (no more edits without unlocking) and exports CSV.

## Small features that make it feel finished (owner said: add them, no approval needed)

- Employee can **flag** an entry ("I worked 4 h, not 2") with a message; employer resolves it (fix or
  dismiss); both sides are notified.
- **Notification center** in both clients, with read state; per-user preferences (push on/off, email
  digest on/off).
- **Multiple workspaces** with a switcher.
- **Dark mode and light mode** everywhere, following the device by default.
- **Employee avatar** (photo or emoji) and a workspace colour/emoji so several workspaces look different.
- **Rounding rule** setting (none / nearest 0.25 h / nearest 0.5 h) and a default day length for the
  "full day" chip.
- **Shareable monthly card**: a pretty image of "your September: 142 h" the employee can save or share.
- **Weekly email digest** (opt-in, off by default) so email volume stays tiny.
- **CSV export** of any month, per employee or whole workspace.
- **Audit history** on every entry (who changed what, when), visible to both roles.
- **Languages**: English and Swedish from day one (owner's market); the string catalogue is shared by
  web and mobile so the two never drift.

## Explicitly NOT in v1

Employee self-logging or a clock-in timer, GPS, shift scheduling, invoicing, payroll exports to
Fortnox/Visma, web push, SMS, iOS store build (no Apple account yet; the code stays iOS-ready), SSO
for enterprises.

## Parity rule

Every feature ships on **both** the mobile app (Android now, iOS-ready) and the web app, backed by the
same API, in the same ticket. A ticket that only delivers one client is not done. The Jira ticket for
every feature states this explicitly.

## Notifications: channels and economics

| Event | Employee | Employer | Channel |
|---|---|---|---|
| Invited to workspace | yes | | Email (the only first-touch channel; they have no app yet) |
| Invite accepted | | yes | Push + in-app |
| Hours added / changed / removed (coalesced per sitting) | yes | | Push + in-app |
| Entry flagged | | yes | Push + in-app |
| Flag resolved | yes | | Push + in-app |
| Month closed | yes | | Push + in-app |
| Weekly digest (opt-in) | yes | yes | Email |

The staging SMTP account may send only ~100 emails a month, so email is reserved for invitations and
opt-in digests; everything else is push + in-app. Push is Expo's push service (Android via FCM).

## Data model (first cut, for the researchers to challenge)

```
workspace        id, name, slug, logto_org_id, currency, timezone, week_start, show_pay,
                 rounding, default_day_hours, colour, emoji, created_at
membership       id, workspace_id, logto_user_id, role (EMPLOYER | EMPLOYEE), display_name,
                 email, hourly_rate (nullable), status (INVITED | ACTIVE | DEACTIVATED),
                 invited_at, joined_at
hour_entry       id, workspace_id, membership_id, work_date, hours numeric(5,2), note,
                 created_by, created_at, updated_at            unique (membership_id, work_date)
hour_entry_change entry_id, hours_before, hours_after, note_before, note_after, changed_by, changed_at
entry_flag       id, entry_id, raised_by, message, status (OPEN | FIXED | DISMISSED), resolved_by, resolved_at
month_lock       workspace_id, year_month, locked_by, locked_at
notification     id, logto_user_id, workspace_id, kind, payload jsonb, read_at, created_at
push_token       logto_user_id, expo_push_token, platform, updated_at
```

Identity (who you are) lives in Logto. Authorization (what you may do in a workspace) is a Logto
organization role mirrored by `membership.role`. Klokka's own DB never stores passwords.

## Locked technical direction (details in `docs/research/*`)

- **Backend**: Java 25, Quarkus (Maven) if the research proves it clean on JDK 25; Spring Boot 4 is the
  fallback. PostgreSQL. OpenAPI-first: one `openapi.yaml` generates the server interfaces and the ONE
  TypeScript client both frontends consume.
- **Auth**: Logto (staging instance already runs on our Coolify). Workspaces = Logto organizations,
  roles = organization roles, invitations = Logto invitations, admin operations through the Management
  API. Mobile signs in with native PKCE, web with the Logto Next.js SDK.
- **Mobile**: Expo (prebuild + development builds, never Expo Go), Expo Router, TypeScript. Android
  built locally on this host and tested on a physical phone over LAN, exactly like Kulram.
- **Web**: Next.js (App Router), Tailwind v4, one design-token package shared with mobile. The landing
  page is its own small Next.js site (like `kulram-web`). The operator console is a route group of the
  web app, not a generic admin template.
- **Monorepo**: `apps/api`, `apps/web`, `apps/landing`, `apps/mobile`, `packages/core` (domain rules,
  i18n catalogue), `packages/api-client` (generated), `packages/tokens` (design tokens).
- **Hosting**: Docker images pushed to our Nexus registry, deployed to Coolify staging as
  `dockerimage` apps (`klokka-api`, `klokka-web`, `klokka-landing` + a Postgres). No CI for now: a
  local `release.sh` builds, pushes and triggers the deploy. Production later, by `v*` tag, per
  `~/.agents/production-deploys.md`.
- **Domains** (placeholders until a real one is bought): `example.com` landing, `app.example.com` web
  app, `api.example.com` API.

## Design direction (the owner's words)

Modern, Gen Z, a bit funky, smooth and "popping", never corporate, never silly. Extraordinary on both
clients and on the operator console too. Bold colour, generous motion, both light and dark. Inspiration
for the landing page: the Kulram site (`https://kulram.coolify.ooguy.com/`), for its theme and the
animations the owner loved, not a copy.
