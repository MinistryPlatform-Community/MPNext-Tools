---
title: "Step 2 — Authorization and input validation: fail-closed roles, group-wizard mass assignment, page-metadata injection, F11"
severity: high
tags: [security, missing-test]
area: services
files: [src/services/authorizationService.ts, src/services/groupService.ts, src/components/group-wizard/actions.ts, src/services/familyService.ts, src/app/(web)/tools/addeditfamily/actions.ts, src/components/shared-actions/domain.ts, src/app/(web)/tools/layout.tsx, src/app/(web)/tools/require-tool-access.ts, src/lib/validation.ts, src/services/domainTimezoneService.ts, src/services/toolService.ts, .env.example, scripts/setup.ts]
discovered: 2026-09-30
discovered_by: playbook-audit (port-downstream-hardening.md, port-mp-write-attribution.md, port-security-review-2026-09-28.md P7/P10, port-mp-datetime-handling.md)
status: resolved
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

## Resolution (2026-09-30)

Branch `fix/step2-authz-input-validation`, one commit per item.

1. **Fail-closed roles** — `resolveRolePolicy()` in `authorizationService.ts`: unset / blank / `","` →
   `unconfigured` (nobody; denial reason `roles_not_configured`, no `dp_User_Roles` read); `*` (whole value only)
   → any MP role; a list → those roles, case-insensitive. `*` inside a list is a literal name. `.env.example`
   ships `MP_SECURITY_ROLES=*` with the control explained; `scripts/setup.ts` treats it as required, default `*`;
   CLAUDE.md and `references/security/README.md` updated. **Ops TODO stays open** until the owner sets `*` in
   every Vercel environment.
2. **Group-wizard mass assignment** — actions parse with `groupWizardSchema` server-side after the gate (errors
   name fields only); `GroupService` picks an explicit `GROUP_WRITABLE_FIELDS` allowlist (own properties only);
   `updateGroup` runs `validatePositiveInt(groupId)` and writes `Group_ID` **last**. Date fields absent from a
   partial update are no longer sent as `null`.
   **Derived allowlist (40 fields)** — probed from the five editing step components (`step-identity`,
   `step-organization`, `step-meeting`, `step-attributes`, `step-settings`, one `FormField name=` each); it equals
   the union of `STEP_FIELDS` and the schema's keys (pinned by a test):
   `Group_Name, Group_Type_ID, Description, Start_Date, End_Date, Reason_Ended, Congregation_ID, Ministry_ID,
   Primary_Contact, Parent_Group, Priority_ID, Meeting_Day_ID, Meeting_Time, Meeting_Frequency_ID,
   Meeting_Duration_ID, Meets_Online, Default_Meeting_Room, Offsite_Meeting_Address, Target_Size, Life_Stage_ID,
   Group_Focus_ID, Required_Book, SMS_Number, Group_Is_Full, Available_Online, Available_On_App,
   Enable_Discussion, Send_Attendance_Notification, Send_Service_Notification, Create_Next_Meeting,
   Secure_Check-in, Suppress_Nametag, Suppress_Care_Note, On_Classroom_Manager, Promote_to_Group,
   Age_in_Months_to_Promote, Promote_Weekly, Promote_Participants_Only, Promotion_Date, Descended_From`.
3. **`resolveContactIdFromPage` injection** — new `validateFkPath` (identifier segments ending `_TABLE`, any case,
   + final identifier column; ≤4 segments, ≤256 chars). The service validates `tableName`, `primaryKey`,
   `recordId`, `contactIdField` before the gate and any MP call. The action now takes `{ pageId, recordId }` and
   resolves page metadata server-side via `ToolService.getPageData`. Side fix: dotted `_Table.` paths as returned by
   `api_Tools_GetPageData` were previously rejected by the case-sensitive `_TABLE` check.
4. **F11** — `getMpTimezone` requires `session.user.id`; written carve-out justification in the file.
5. **Pages self-gate** — `tools/require-tool-access.ts` (`requireSecurityRole`; `UnauthorizedError` →
   `redirect("/no-access")`, other errors rethrow) awaited first in all six `tools/*/page.tsx`; layout comment
   corrected. A structural test fails if a tool page lacks the gate or calls it after `parseToolParams`.
6. **Filter / error hygiene** — `escapeFilterString` escapes `[` first, refuses non-strings and control chars,
   caps at `MAX_SEARCH_TERM_LENGTH` (100), maps quote look-alikes to `_`. `listRoles` now uses it. Validators do
   runtime type checks, `validatePositiveInt` uses the safe-integer bound, and messages carry no value.
   `domainTimezoneService` messages ported from upstream + both injection tests; guard-clause suite uses
   `mockReset`.

**Tests:** all adversarial — blank/`","`/unset/whitespace refuse, `*`, list, `*`-in-list; smuggled `Group_ID`,
unknown columns, `$userId`, prototype keys, `groupId` 0/-1/1.5/NaN/string, gate-throws-no-write for create and
update, schema failure naming fields; nine hostile FK paths + hostile table names; missing-session for
`getMpTimezone`; page gate-before-parse for all six pages; escaping/length/control-char/no-echo validators.
Suite: 118 files, 1,787 tests; coverage 98.82% statements / 99.68% lines.

**Mutation checks (break → red → revert → green):** role policy blank → `any` (8 red); allowlist pick → spread
(2 red); `Group_ID` moved first (1 red); `validatePositiveInt(groupId)` removed (5 red); action passes raw payload
(1 red); old `_TABLE` passthrough in `resolveContactIdFromPage` (all hostile-path tests red); `getMpTimezone`
session check removed (3 red); group-wizard page gate removed (2 red); `toMpSqlDatetime` echoing the value (1 red).

**Deferred / observations:**
- `(web)/layout.tsx`'s `AuthWrapper` session redirect has the same segment limitation as the tools layout; tool
  pages are now covered by `requireToolAccess` (which also requires a session). Non-tool pages hold no MP data.
- `ToolService.resolveContactIds` (dev panel) still takes table/column names from its caller; they are
  identifier-validated and the path is dev-only. Candidate for the same page-ID treatment in a later step.
- `resolveIanaTimezone`'s "Unknown time zone" message still includes the MP-provided zone name (not caller
  input; matches upstream).

