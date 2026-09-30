---
name: klokka-ops
description: Use for any Klokka operations task on staging or production - health checkup, deploy or release, rollback, logs, Postgres access, Logto console or Management API, user accounts and the platform-admin role, email delivery, backups, or finding a credential. Points to docs/OPERATIONS.md and enforces the staging-first, explicit-go-ahead-for-production rule.
---

Klokka's runbook is `docs/OPERATIONS.md`. Read the section you need before acting; do not rediscover the setup.

- Section 1 maps every part (Coolify uuids, domains, Logto, Postgres, images, APKs, mailboxes) for staging and production.
- Section 2 says which gitignored file in `.agents/local-credentials/` holds each credential. Read values from there;
  never print secrets into chat, tickets, commits or logs.
- Section 4 is the read-only daily checkup. Run it as written.
- Section 5 is deploy and rollback. Production is `./release.sh`, then pinning `v<version>` in production Coolify,
  API first. Never cut a tag or deploy production without the owner asking for it.
- Sections 3, 6, 7, 8: access (Coolify, Logto, Postgres), accounts and `platform-admin`, logs, email.
- Section 9 lists failures already seen and their fixes; section 10 the open production items.
- The marketing site's SEO (indexing per environment, link cards, the page registry, IndexNow, Search Console, content
  review dates) is `docs/SEO.md`; release-day SEO steps are in `docs/RELEASING.md`, "After the landing is deployed".

Rules:
1. Test, probe and experiment on staging (`coolify-testenv`, `ssh testenv`). Production reads use `coolify-prod`
   (read-only MCP) or read-only shell commands.
2. Any production change (Coolify, Logto, Postgres, Migadu, Nexus deletions) needs the owner's explicit go-ahead for
   that specific change; approval for one change does not cover the next.
3. After changing the setup, update `docs/OPERATIONS.md` (and `.agents/local-credentials/README.md` for a new
   credential file) in the same piece of work.
