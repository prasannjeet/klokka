# Security policy

## Reporting a vulnerability
Please do not open a public issue for a security problem. Email the maintainer through the address on
the GitHub profile of `prasannjeet`, with steps to reproduce. You will get an acknowledgement within a
few days and a fix or a mitigation plan as soon as it is understood.

## Scope
The API (`apps/api`), the web app (`apps/web`), the Android app (`apps/mobile`), the landing site and the
CI pipeline in this repository. The hosted staging instance is a test environment and holds no real
personal data.

## What is already in place
- Authentication by Logto (OIDC); passwords never touch Klokka's database.
- Authorization on every API route from the workspace membership table, never from token claims.
- Workspace isolation enforced in the application and by composite foreign keys in the database.
- Webhook signatures verified with a constant-time comparison; invitation tokens are 128-bit and
  single-use; CSV exports neutralise spreadsheet formula injection.
- Secrets live only in environment variables and ignored local files; the repository history has been
  scanned for them.
