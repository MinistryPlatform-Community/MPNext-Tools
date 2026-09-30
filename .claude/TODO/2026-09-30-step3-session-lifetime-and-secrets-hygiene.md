---
title: "Step 3 — Session lifetime, token-in-cookie removal, boot guards, secrets hygiene, client-IP header"
severity: high
tags: [security, missing-test, doc]
area: auth
files: [src/lib/auth.ts, src/lib/env.ts, .gitignore, .claude/settings.local.json, src/lib/providers/ministry-platform/client.ts, src/lib/providers/ministry-platform/auth/client-credentials.ts]
discovered: 2026-09-30
discovered_by: playbook-audit (port-security-review-2026-09-28.md P2/P3/P6)
status: open
---

## Problem
- **Session (P3):** `auth.ts:362-372` — `strategy:"jwt"`, `refreshCache` defaults on (cookie lives up to 7 days),
  no fixed `expiresIn`/`disableSessionRefresh`, `storeAccountCookie:true`. The user's MP refresh token with the full
  `dataplatform/scopes/all` scope sits in a cookie; `offline_access` is requested (`:185`). `customSession`
  (`:403-410`) passes token/IP/user-agent through.
- **Boot guards (P2):** raw `process.env` (`auth.ts:11,345-346`, `client.ts:41`, `client-credentials.ts:4`) — no
  secret-length/default-secret check, no URL validation, no `src/lib/env.ts`.
- **Secrets hygiene:** `.gitignore:415` ignores only `.env.local`, not `.env*`. `.claude/settings.local.json` is
  tracked and grants `Bash(sed:*)`, `rm -rf .claude/*`. No pre-commit secrets check, no `SECURITY.md`.
- **Client-IP header (P6):** no `AUTH_IP_ADDRESS_HEADERS` / `advanced.ipAddress.ipAddressHeaders`, so rate limiting
  keys on whatever header better-auth picks.

## Proposed fix
Follow `port-security-review-2026-09-28.md` Phases 2, 3 and the IP part of 6.
1. `refreshCache:false`, `jwe`, 12 h fixed lifetime, no sliding refresh, `storeAccountCookie:false`; strip user
   OAuth tokens from the session; drop `offline_access`. Verify by decoding `session_data` and confirming no
   `account_data` cookie. Port the session-lifetime/config/user-OAuth-token tests.
2. `src/lib/env.ts` with validated `MINISTRY_PLATFORM_BASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`
   (length ≥ 32, not a known default); start-up refusal tests. Keep the `NEXTAUTH_*` fallbacks CLAUDE.md documents.
3. `.gitignore` → `.env*` with `!.env.example`; `git rm --cached .claude/settings.local.json`; add a lightweight
   pre-commit secrets check if the repo has a hook mechanism (don't add a heavy dependency without noting it); `SECURITY.md`.
4. **Client-IP header recommendation (owner decision 6):** on Vercel, trust `x-vercel-forwarded-for` first, then
   `x-real-ip` — Vercel sets/overwrites both at its edge, so they can't be spoofed by the client. Never trust a raw
   leftmost `x-forwarded-for` value. Make it configurable via `AUTH_IP_ADDRESS_HEADERS` (comma list, default
   `x-vercel-forwarded-for,x-real-ip`) and document in `.env.example` that customer clones behind another proxy /
   CDN (Cloudflare → `cf-connecting-ip`, Azure Front Door → `x-azure-clientip`, nginx → the header it sets) must
   set it to the header **their** edge overwrites. Verify the Vercel claim against current Vercel docs before committing.
5. Record the `BETTER_AUTH_SECRET` rotation in the PR body (the session-config change logs everyone out anyway,
   so rotate at the same deploy) — see `2026-09-30-ops-rotate-better-auth-secret.md`.

## Impact if not fixed
A stolen cookie grants up to 7 days of access and carries a full-scope MP refresh token; mis-set env vars fail
silently at runtime instead of at boot.
