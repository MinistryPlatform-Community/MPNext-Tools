---
title: UserProvider fetches a profile nothing reads
severity: low
tags: [refactor, perf]
area: contexts
files: [src/contexts/user-context.tsx, src/contexts/use-app-session.ts, src/app/providers.tsx]
discovered: 2026-10-10
discovered_by: doc-review
status: open
---

## Problem
Since the header `UserMenu` was removed (#54), nothing outside `src/contexts/` calls
`useUser()` or `useAppSession()`. `UserProvider` is still mounted by `Providers` and calls
`getCurrentUserProfile()` (one MP request) on every signed-in page load for no consumer.

## Evidence
- `grep -rn "useUser\|useAppSession" src` — matches only in `src/contexts/` and their tests
- `src/app/providers.tsx` — mounts `UserProvider`

## Proposed fix
Decide whether the template should keep the hooks as a documented extension point. If yes,
make `UserProvider` fetch lazily on first `useUser()` call; if no, remove `UserProvider`,
`useAppSession`, their tests, and update `contexts/` references, ADR-015 and CLAUDE.md.

## Impact if not fixed
One wasted MP API call per page load per user; docs describe a profile surface no UI uses.
