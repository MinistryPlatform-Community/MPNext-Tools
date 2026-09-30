---
title: "Step 2 — Authorization and input validation: fail-closed roles, group-wizard mass assignment, page-metadata injection, F11"
severity: high
tags: [security, missing-test]
area: services
files: [src/services/authorizationService.ts, src/services/groupService.ts, src/components/group-wizard/actions.ts, src/services/familyService.ts, src/components/shared-actions/domain.ts, src/app/(web)/tools/layout.tsx, src/lib/validation.ts, src/services/domainTimezoneService.ts, .env.example]
discovered: 2026-09-30
discovered_by: playbook-audit (port-downstream-hardening.md, port-mp-write-attribution.md, port-security-review-2026-09-28.md P7/P10, port-mp-datetime-handling.md)
status: open
---

## Problem
1. **`MP_SECURITY_ROLES` fails open** — blank means "any role" (`authorizationService.ts:141-145`); `.env.example:80`
   ships it blank. Upstream (2026-09-28): blank / `","` → nobody; `*` → any role.
2. **Group-wizard mass assignment (fork-only)** — `groupService.ts:31-36` spreads the unparsed client
   `GroupWizardFormData` into the Groups POST/PUT; `updateGroup` builds `{Group_ID: groupId, ...data}` so a
   payload `Group_ID` overrides the target record; `groupId` is never `validatePositiveInt`'d; actions
   (`group-wizard/actions.ts:77-101`) never parse on the server. Any Groups column is writable
   (e.g. `_Last_Attendance_Posted`).
3. **`FamilyService.resolveContactIdFromPage` query injection** (`familyService.ts:140-165`) — caller controls
   `tableName`; any `contactIdField` containing `_TABLE` goes into `$select` unvalidated. A role holder can read a
   numeric value from any table/column via `addeditfamily/actions.ts:74`.
4. **F11** — `shared-actions/domain.ts:13` (`getMpTimezone`) has no session check and no in-file justification,
   though CLAUDE.md rule 12 lists it as a carve-out. Callable unauthenticated.
5. **Pages don't gate themselves** — `tools/layout.tsx:7-9` comment claims the layout redirect stops the page from
   running (upstream corrected this 2026-09-29). Data can't leak today (services gate) but structure is wrong.
6. **Filter / error hygiene** — `escapeFilterString` (`validation.ts:38`) doesn't escape `[`, refuse non-strings
   or control chars; search has no length cap. `validateGuid`/`validatePositiveInt`/`validateColumnName` and
   `domainTimezoneService.ts:294,310` put caller input in error messages (CLAUDE.md rule 14).

## Proposed fix
1. Fail-closed roles; `*` = any role. Tests for blank, `","`, `*`, list. `.env.example` → `MP_SECURITY_ROLES=*`
   with a comment explaining the control. CLAUDE.md + security README updated.
   **Deploy note:** owner sets `MP_SECURITY_ROLES=*` in every Vercel environment (see ops TODO).
2. Derive the allowlist by probing the wizard (`group-wizard/schema.ts`, step components, `STEP_FIELDS`,
   `prepareForApi`): the writable set = fields the wizard UI actually edits. Parse with `groupWizardSchema`
   server-side in the action; `pick` allowlist in the service; `Group_ID` last; `validatePositiveInt(groupId)`.
   Adversarial tests (smuggled `Group_ID`, unknown column, `$userId` key, `groupId <= 0`) that fail when the
   strip is reverted; "gate throws → no write" tests for create/update.
3. Strict regex per `_TABLE` path segment + column; restrict `tableName` (prefer resolving page metadata
   server-side from `pageID`). Hostile-input test.
4. Session check in `getMpTimezone` + written justification in the file; missing-session test.
5. `requireSecurityRole()` in each `tools/*/page.tsx` (`UnauthorizedError` → `redirect("/no-access")` or the
   repo's equivalent); fix the layout comment.
6. Port upstream `escapeFilterString` hardening + length cap; validators report field names only; port upstream's
   domainTimezoneService messages + its two injection tests (update the test pinning old wording, use `mockReset`).

## Impact if not fixed
Any MP user with any security role can use the app's service account to write arbitrary Groups columns, read
arbitrary numeric columns, and edit domain-wide page-field config.
