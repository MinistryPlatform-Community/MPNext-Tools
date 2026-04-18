---
title: Missing render/interaction test for UserMenu client component
severity: low
tags: [missing-test]
area: components
files:
  - src/components/user-menu/user-menu.tsx
discovered: 2026-04-17
discovered_by: components-user-menu
status: open
---

## Problem
Only `handleSignOut` (the server action) is tested. The `UserMenu` client component — including the `handleItemClick` wiring that calls `onClose?.()` before `handleSignOut()` and the name-display fallback (`Nickname || First_Name`) — has no test coverage. Regressions in the dropdown behavior or the close-hook ordering would not be caught.

## Evidence
- `src/components/user-menu/actions.test.ts` — covers only `handleSignOut`
- No `user-menu.test.tsx` exists (verified via `Glob` on `src/components/user-menu/**`)
- `user-menu.tsx:30-37` — untested `handleItemClick` branch logic
- `user-menu.tsx:49-50` — untested `Nickname || First_Name` fallback

## Proposed fix
Add `src/components/user-menu/user-menu.test.tsx` covering:

1. Renders `Nickname` when present, falls back to `First_Name` when `Nickname` is empty.
2. Renders `Email_Address` when present (and that the component does not crash when `Email_Address` is `null`).
3. Clicking the "Sign out" item invokes `onClose` (if provided) **before** `handleSignOut`.
4. Clicking the "Sign out" item still works when `onClose` is omitted.

Use `@testing-library/react` + `userEvent`. Mock `./actions` so `handleSignOut` is a `vi.fn()`.

## Impact if not fixed
Low. Feature is currently unused in `src/` — no caller today — so regressions would surface the first time a header adopts it, not retroactively. Worth adding when the component is wired into a layout.
