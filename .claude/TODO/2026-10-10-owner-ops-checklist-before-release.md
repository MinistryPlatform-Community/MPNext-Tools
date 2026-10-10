---
title: "Owner checklist — environment, MP and GitHub settings to do before (and right after) the next /release"
severity: high
tags: [security, doc]
area: auth
files: [.env.example, src/lib/env.ts, src/services/authorizationService.ts, SECURITY.md, .claude/references/security/README.md, .claude/references/DECISIONS.md]
discovered: 2026-10-10
discovered_by: todo-review (units 0–1 after PRs #40 and #41)
status: open
---

## Problem
`dev` now carries security Steps 1–5, the template-editor removal (#40) and
the single-MP-client change (#41). Several things these need are settings,
not code: Vercel env vars, the MP API Client record, and GitHub repo toggles.
Only the owner can change those. If they aren't done, the next `/release` to
`main` either locks everyone out or breaks sign-in. This file is the
consolidated checklist. Where an item already has its own TODO, that file has
the detail and stays open until its own steps are done.

**Environments to cover for every env-var item:** Vercel Production, Vercel
Preview (staging), Vercel Development, each developer's `.env.local`, and any
customer-deployed clone.

## Before the next `/release`

- [ ] **1. Set `MP_SECURITY_ROLES=*` in every environment.**
  It fails closed now: unset, blank or `","` means nobody can use any tool, so
  every user is redirected to `/no-access`. Use `*` (any MP security role) for
  now; a comma list of role names later.
  Detail: [`2026-09-30-ops-set-mp-security-roles-env.md`](2026-09-30-ops-set-mp-security-roles-env.md).

- [ ] **2. Check the redirect URIs on the MP client.**
  Sign-in now runs as `MINISTRY_PLATFORM_CLIENT_ID` (ADR-027). In each
  environment, that client's MP API Client record must list:
  - redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/ministryplatform`
  - post-logout redirect URI: `<BETTER_AUTH_URL>` (exact, no trailing slash)

  Any environment that used a separate sign-in client (`MP_OIDC_CLIENT_ID`)
  will fail to sign in until these are added. Nothing broader belongs on the
  record: this one secret is both data access and sign-in.

- [ ] **3. Delete stale `MP_OIDC_CLIENT_ID` / `MP_OIDC_CLIENT_SECRET` values.**
  Remove them from Vercel (all three environments) and every `.env.local`.
  The app ignores them since #41, but the secret is still live. If a separate
  MP API Client was registered for sign-in, retire it in MP too.

- [ ] **4. Rotate `BETTER_AUTH_SECRET`** (≥ 32 chars: `openssl rand -base64 32`)
  in every environment, at the same deploy that ships Step 3. Everyone is
  signed out once either way. Then review `dp_Audit_Log` for writes made
  through this app between 2026-07-09 and the date `e94e549` reached each
  environment, looking for `User_ID`s that don't match the signed-in person.
  Detail: [`2026-09-30-ops-rotate-better-auth-secret.md`](2026-09-30-ops-rotate-better-auth-secret.md).

## Right after the release deploys

- [ ] **5. Real-MP sign-in smoke test** in Production and staging: sign in;
  `/api/auth/get-session` has a `userGuid`; the function logs show no
  `auth.oidc.discovery_failed` or `auth.userinfo.id_token_unverified`; sign-out
  ends the MP session without a "log out?" prompt; a tool page opens instead of
  `/no-access`. This is still outstanding from Step 4 and now also covers
  items 1–3.

## Anytime (not release-blocking)

- [ ] **6. Ask MP admins to restrict who can create or rename Security Roles.**
  `MP_SECURITY_ROLES` matches roles by **name**, so anyone who can create a
  role with a listed name gets access. (With `*`, any role at all gets access.)

- [ ] **7. GitHub → Settings → Code security:** enable private vulnerability
  reporting, secret scanning, push protection, Dependabot alerts and Dependabot
  security updates. `SECURITY.md` already points reporters at private
  reporting.
  Detail: [`2026-09-30-held-github-repo-security-settings.md`](2026-09-30-held-github-repo-security-settings.md).

- [ ] **8. Tell downstream clones** to do items 1–4 themselves. Each has its
  own secret, roles and MP client. `SECURITY.md` § Downstream clones already
  covers the secret rotation.

## Evidence
- `src/services/authorizationService.ts` `resolveRolePolicy()`: unset, blank
  or `","` resolves to `unconfigured` (nobody).
- `src/lib/env.ts` `getMpClient()`: sign-in, id_token audience and sign-out
  `client_id` all use `MINISTRY_PLATFORM_CLIENT_ID` (#41, ADR-027).
- `.claude/references/security/README.md` § open items: redirect-URI check,
  stale `MP_OIDC_*`, smoke test, repo settings.

## Proposed fix
Work through the checkboxes. Tick each one in this file (or note the date per
environment beside it). Close the linked TODOs as their items finish, and close
this file once items 1–5 are done in every environment.

## Impact if not fixed
- Item 1 skipped: environment-wide lockout on release.
- Items 2–3 skipped: sign-in fails where a separate client was in use; a live
  but unused secret keeps sitting in env stores.
- Item 4 skipped: a forged-identity session cookie from the exposure window stays valid.
- Items 6–7 skipped: role-name spoofing, and leaked secrets that nothing blocks at push.
