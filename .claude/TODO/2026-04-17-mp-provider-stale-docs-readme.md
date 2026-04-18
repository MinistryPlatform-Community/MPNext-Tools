---
title: Provider docs/README.md lists nonexistent auth-provider.ts file
severity: low
tags: [drift, doc]
area: mp-provider
files:
  - src/lib/providers/ministry-platform/docs/README.md
  - src/lib/providers/ministry-platform/auth/
discovered: 2026-04-17
discovered_by: mp-provider-core
status: open
---

## Problem
`src/lib/providers/ministry-platform/docs/README.md` documents a directory tree that includes `auth/auth-provider.ts` ("NextAuth provider") and `auth/types.ts`. Neither matches reality on the current branch.

Actual `auth/` contents:
- `client-credentials.ts`
- `client-credentials.test.ts`
- `index.ts`
- `types.ts` (this one exists)

The `auth-provider.ts` reference is a holdover from the NextAuth era; the project has since migrated to Better Auth (per `CLAUDE.md` and `src/lib/auth.ts`). The README also claims "NextAuth integration" as a feature bullet which is no longer accurate.

## Evidence
- `src/lib/providers/ministry-platform/docs/README.md:29-33` — claims `auth-provider.ts` with NextAuth
- `src/lib/providers/ministry-platform/docs/README.md:88` — "✅ NextAuth integration" bullet
- `ls src/lib/providers/ministry-platform/auth/` — no `auth-provider.ts` present
- `CLAUDE.md` — "Auth: Better Auth with Ministry Platform OAuth via genericOAuth plugin"

## Proposed fix
Update `src/lib/providers/ministry-platform/docs/README.md`:
1. Remove `auth-provider.ts` line from the directory tree
2. Change "NextAuth integration" feature bullet to "Client credentials OAuth2 for server-side MP access" (Better Auth handles user login separately in `src/lib/auth.ts`)
3. Also add a note that `MINISTRY_PLATFORM_DEV_CLIENT_ID` / `MINISTRY_PLATFORM_DEV_CLIENT_SECRET` are optional env vars for `api_dev_*` stored procs

## Impact if not fixed
New contributors reading the provider README are pointed at a file that doesn't exist and mental-model the wrong auth system. Low severity — CLAUDE.md is authoritative and contradicts the README.
