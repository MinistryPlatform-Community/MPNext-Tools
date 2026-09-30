---
title: "Ops — Set MP_SECURITY_ROLES=* in every environment before/with the Step 2 deploy"
severity: high
tags: [security, doc]
area: auth
files: [.env.example, src/services/authorizationService.ts]
discovered: 2026-09-30
discovered_by: playbook-audit
status: open
---

## Problem
Step 2 makes `MP_SECURITY_ROLES` fail closed: unset / blank / `","` → nobody; `*` → any MP security role; a
comma list → only those roles. Any environment without a value locks every user out after the deploy.
Owner decision (2026-09-30): use `*` for now, keep the control.

## Proposed fix
1. Set `MP_SECURITY_ROLES=*` in Vercel Production, Preview and Development, and in local `.env.local` files.
2. Later: replace `*` with the specific role names that should use the app.
3. Ask MP admins to restrict who can create/rename Security Roles — roles are matched by **name**, so anyone who can
   create a role with a listed name gains access.
4. Downstream clones: same change, same env step.

## Impact if not fixed
Environment-wide lockout (safe failure, but an outage).
