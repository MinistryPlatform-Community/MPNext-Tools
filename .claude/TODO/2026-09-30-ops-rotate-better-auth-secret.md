---
title: "Ops — Rotate BETTER_AUTH_SECRET (exposure window 2026-07-09 → 2026-09-13) and tell downstream clones to do the same"
severity: high
tags: [security, doc]
area: auth
files: [.env.example, .claude/references/security/README.md]
discovered: 2026-09-30
discovered_by: playbook-audit (port-downstream-hardening.md F-UPDATE-USER, port-security-review-2026-09-28.md P3)
status: open
---

## Problem
`e599075` (2026-07-09) made `userGuid` client-writable through `/api/auth/update-user`; the fix `e94e549`
(2026-09-13) added `disabledPaths`. Any session cookie minted or re-signed during that window may carry an
attacker-chosen `userGuid`, and with `refreshCache` on (fixed in Step 3) such a cookie can keep refreshing itself.
Only rotating the signing secret invalidates them. Owner decision (2026-09-30): **rotate**.

## Proposed fix
1. Generate a new secret: `openssl rand -base64 32` (≥ 32 chars).
2. Set `BETTER_AUTH_SECRET` in every Vercel environment (Production, Preview/staging, Development) and every
   `.env.local`; redeploy. All users are signed out once — schedule it with the Step 3 deploy.
3. Review `dp_Audit_Log` for writes attributed via this app between 2026-07-09 and the date `e94e549` reached each
   environment, looking for `User_ID`s that don't match the signed-in person.
4. **Downstream clones:** any repo forked/copied from MPNext-Tools (or MPNext) before 2026-09-13 inherited the same
   hole and gets no Dependabot alert. Add a line to the security README / advisory recommending that every downstream
   clone port `disabledPaths` **and** rotate its own `BETTER_AUTH_SECRET`, then review its own audit log for the
   window it was exposed.

## Impact if not fixed
A forged-identity cookie from the exposure window stays valid.
