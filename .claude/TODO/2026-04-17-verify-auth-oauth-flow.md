---
title: auth — oauth-flow.md references a missing PKCE TODO file
area: auth
created: 2026-04-17
source_agent: phase4-slice1-verifier
---

## Issue
`.claude/references/auth/oauth-flow.md` references `.claude/TODO/002-security-pkce-disabled.md` twice (near line 25 and line 176). That TODO file does **not** exist under `.claude/TODO/` as of SHA `971c40b17bd5ec276d0864836ac402d5e721300a`.

Found via:
- `Grep -i pkce .claude/` → matches only in `GLOSSARY.md`, `_phase3-candidates/glossary.json`, `auth/oauth-flow.md`, and `auth.md` (flat legacy doc).
- `ls .claude/TODO/ | grep -i pkce` → no matches.

## Current state
- PKCE is genuinely disabled at `src/lib/auth.ts:44` (`pkce: false`). MP requires this (per `authorizationUrlParams: { realm: "realm" }` workaround).
- The reference doc claim "Tracked in `.claude/TODO/002-security-pkce-disabled.md`" is stale; the file never existed in this branch.

## Inline mitigation applied
Replaced both dead TODO-path references with `<!-- UNVERIFIED: ... -->` comments pointing at this TODO.

## Action needed
One of:
1. **Create the TODO** `.claude/TODO/002-security-pkce-disabled.md` (or renamed to today's convention: `2026-04-17-auth-pkce-disabled.md`) capturing the security concern, risk model, and whether MP OIDC now supports PKCE (it may — re-test).
2. **Or decide PKCE is permanently off by design** and remove the stale references + unverified comments from `oauth-flow.md` entirely.

Either way, the reference doc should not have dangling TODO paths.

## Files touched
- `.claude/references/auth/oauth-flow.md` (two `<!-- UNVERIFIED -->` comments added inline)
