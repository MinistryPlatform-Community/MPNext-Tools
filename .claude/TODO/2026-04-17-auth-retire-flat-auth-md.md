---
title: Retire flat `.claude/references/auth.md` after shard migration
severity: medium
tags: [doc, drift]
area: auth
files: [.claude/references/auth.md]
discovered: 2026-04-17
discovered_by: auth
status: open
---

## Problem
The legacy flat `.claude/references/auth.md` (11,143 bytes) has been migrated into the new `auth/` subfolder per the phase-2 shard plan (`oauth-flow.md`, `sessions.md`, `route-protection.md`, `user-identity.md`, `README.md`). The flat file still exists on disk and will drift from the new docs as the auth system evolves.

Leaving both copies risks agents (or humans) reading the stale flat doc and copying out-of-date patterns, especially around the `user.id` vs `userGuid` gotcha.

## Evidence
- `.claude/references/auth.md` still present at 11,143 bytes (per facts snapshot `.claude/references/_meta/facts/2026-04-17.md`)
- New content at `.claude/references/auth/README.md`, `oauth-flow.md`, `sessions.md`, `route-protection.md`, `user-identity.md`
- `CLAUDE.md` line referencing `.claude/references/auth.md` needs to be re-pointed at `.claude/references/auth/README.md`

## Proposed fix
1. Update `CLAUDE.md` "Auth Reference" link from `.claude/references/auth.md` to `.claude/references/auth/README.md`.
2. Delete `.claude/references/auth.md` (content is migrated and preserved across the 5 new shard files).
3. Update any remaining cross-references in other flat docs (if any) to point into the new subfolder.

## Impact if not fixed
Documentation drift: future edits will diverge between the flat file and the subfolder docs. Agents consulting the stale flat file will miss new content (e.g., future ADRs, gotchas added under `auth/`).
