---
title: Rename session-context.tsx — it is a hook module, not a Context
severity: low
tags: [refactor, doc]
area: contexts
files: [src/contexts/session-context.tsx, src/contexts/session-context.test.tsx, src/contexts/index.ts]
discovered: 2026-04-17
discovered_by: contexts
status: open
---

## Problem
`src/contexts/session-context.tsx` does not define a `React.Context` — it exports only a hook (`useAppSession`) and a type alias (`SessionData`). The `session-context` filename implies a Context/Provider pair (matching `user-context.tsx`), which misleads readers grepping for the provider. No `SessionProvider` exists; no `createContext` call is made.

## Evidence
- `src/contexts/session-context.tsx:1-10` — no `createContext`, no provider component; only `useAppSession` + `SessionData` type
- `src/contexts/user-context.tsx:15` — sibling file genuinely uses `createContext<UserContextValue | undefined>`
- `src/contexts/index.ts:2-3` — barrel exports only `useAppSession` and `SessionData` (no `SessionProvider`)

## Proposed fix
Option A (minimal): rename `session-context.tsx` → `use-app-session.ts` (rename test file to match), update barrel `index.ts` imports.
Option B: leave the filename but add a file-top comment explaining it is a hook module kept in `contexts/` for co-location.

Option A is preferred; it removes a footgun for future contributors searching for a `SessionProvider`.

## Impact if not fixed
Low. New contributors may waste time searching for a non-existent provider or mistakenly try to wrap the app in `<SessionProvider>`. Docs in `.claude/references/contexts/session.md` call out the naming explicitly as a workaround.
