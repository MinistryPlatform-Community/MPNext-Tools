---
title: Dev-panel non-deploy server actions lack a NODE_ENV guard
severity: low
tags: [security, refactor]
area: components
files:
  - src/components/dev-panel/panels/selection-actions.ts
  - src/components/dev-panel/panels/contact-records-actions.ts
  - src/components/dev-panel/panels/user-tools-actions.ts
discovered: 2026-04-17
discovered_by: components-dev-panel
status: open
---

## Problem
The dev-panel UI is gated three ways (`mounted`, `NODE_ENV === 'development'`, hostname in `localhost`/`127.0.0.1`). Its server actions, however, are only gated on a valid session — `deploy-tool-actions.ts` adds a `NODE_ENV === 'production'` throw, but `selection-actions.ts`, `contact-records-actions.ts`, and `user-tools-actions.ts` do not.

Server actions are routable endpoints regardless of where they're imported. This means any authenticated user can call `resolveSelection`, `resolveContactRecords`, and `getUserTools` in production by replaying the form-post or RPC payload. In practice the underlying services are shared with production features (so the data itself isn't a new leak), but it does weaken the "dev-only" mental model and makes it easier for future UI to accidentally bypass the intended localhost posture.

## Evidence
- `src/components/dev-panel/panels/selection-actions.ts:15-18` — only session check
- `src/components/dev-panel/panels/contact-records-actions.ts:14-16` — only session check
- `src/components/dev-panel/panels/user-tools-actions.ts:9-17` — only session check
- Contrast with `src/components/dev-panel/panels/deploy-tool-actions.ts:13-21` — production throw before session check

## Proposed fix
Option A: Extract `deploy-tool-actions.ts:requireDevSession` into a shared helper and reuse from all four dev-panel action files.
Option B: Accept the current posture as intentional (these actions back shared services) and document it explicitly in `.claude/references/components/dev-panel.md` under Gotchas.

Recommend Option A because dev-panel actions sometimes return data shaped for the dev UI (e.g., `SelectionResult` with `{ recordIds, count }`) that is not gated by any feature-level authorization rule — narrowing the call surface to dev builds is cheap.

## Impact if not fixed
Low. No new data exposure today (the services are used by production features too), but the contract is weaker than the UI implies and invites regressions if someone adds stricter data to a dev-panel action without thinking.
