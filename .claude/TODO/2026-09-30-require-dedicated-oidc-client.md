---
title: "Make MP_OIDC_CLIENT_ID / MP_OIDC_CLIENT_SECRET required (remove the service-account fallback)"
severity: medium
tags: [security, doc]
area: auth
files: [src/lib/env.ts, src/lib/auth.ts, src/lib/env.test.ts, src/auth.secret-guard.test.ts, src/components/user-menu/actions.test.ts, .env.example, scripts/setup.ts, .claude/references/auth/oauth-flow.md]
discovered: 2026-09-30
discovered_by: step4-oidc-lazy-discovery (owner decision: the OIDC client must be for this app only)
status: open
---

## Problem
Security Step 4 made user sign-in run as a dedicated MP OIDC client (`MP_OIDC_CLIENT_ID` /
`MP_OIDC_CLIENT_SECRET`), but so existing deploys keep signing in, `getOidcClient()` still falls back
to the client-credentials service account (`MINISTRY_PLATFORM_CLIENT_ID` / `_SECRET`) when the pair is
unset, logging `auth.oidc.shared_client`. While the fallback exists, one leaked secret is both the app's
full MP data access and its user sign-in, and the id_token audience check accepts tokens minted for the
service account's client.

## Evidence
- `src/lib/env.ts` `getOidcClient()` — `shared: "fallback"` branch.
- `src/lib/auth.ts` `warnIfSharedOidcClient()` — the `auth.oidc.shared_client` warning.
- `next start` / Vercel runtime logs show `{"event":"auth.oidc.shared_client","source":"fallback"}` on
  every environment that has not been split.

## Proposed fix
Once every environment (local, Preview, Production, and any customer-deployed clone) has a dedicated MP
client — redirect URI `<BETTER_AUTH_URL>/api/auth/callback/ministryplatform`, post-logout redirect URI
`<BETTER_AUTH_URL>` — and `MP_OIDC_CLIENT_ID` / `MP_OIDC_CLIENT_SECRET` set:
1. `getOidcClient()`: throw when the pair is unset (keep the "both or neither" and
   `same_as_service_account` checks — make the latter a refusal too).
2. Delete `warnIfSharedOidcClient` and its tests; flip the fallback tests in `src/lib/env.test.ts`,
   `src/auth.secret-guard.test.ts` and `src/components/user-menu/actions.test.ts` to expect refusal.
3. `scripts/setup.ts`: mark both `required: true`; `.env.example` and the auth references: drop
   "recommended / fallback" wording.

## Impact if not fixed
Environments that never set the pair keep sharing one client between the service account and user
sign-in indefinitely; the warning is easy to ignore.
