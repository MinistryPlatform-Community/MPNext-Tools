---
title: services
type: index
domain: services
---

## What's in this domain
Application service layer — singletons in `src/services/` that wrap `MPHelper` (or, for Google Places, an external provider) and expose domain operations to server actions and server components. 9 services; every file starts with `import "server-only"`.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `query-patterns.md` | MP REST query rules: `_TABLE_` FK traversal, ambiguous-column prefixing, quote escaping, `$userId` audit, batching | Before writing/modifying any MP query in a service |
| `tool-service.md` | `ToolService` — page metadata, user tools, selection resolution, contact-ID resolver, dev-tool deploy | Editing `src/services/toolService.ts` or its callers |
| `user-service.md` | `UserService` — display-only profile fetch (names + email) | Editing user profile/session code |
| `address-label-service.md` | `AddressLabelService` — Contacts→Households→Addresses multi-level FK join | Editing address-label feature |
| `group-service.md` | `GroupService` — lookups, contact/group search, group read/create/update with column allowlist | Editing group-wizard feature |
| `field-management-service.md` | `FieldManagementService` — page field editor backing store, `api_MPNextTools_*` SPs | Editing field-management feature |
| `family-service.md` | `FamilyService` — Add/Edit Family: household load/save, lookups, envelope numbers | Editing the addeditfamily tool |

`AuthorizationService` is documented in `../security/README.md`; `DomainTimezoneService` in `../ministryplatform.datetimehandling.md`. `GooglePlacesService` has no dedicated doc (see inventory below).

## Code surfaces
| Path | Role |
|------|------|
| `src/services/toolService.ts` | `ToolService` singleton |
| `src/services/userService.ts` | `UserService` singleton |
| `src/services/addressLabelService.ts` | `AddressLabelService` singleton |
| `src/services/groupService.ts` | `GroupService` singleton + `GROUP_WRITABLE_FIELDS` |
| `src/services/fieldManagementService.ts` | `FieldManagementService` singleton |
| `src/services/familyService.ts` | `FamilyService` singleton + `PartialSaveError` |
| `src/services/authorizationService.ts` | `AuthorizationService` singleton + `UnauthorizedError`, `resolveRolePolicy` |
| `src/services/domainTimezoneService.ts` | `DomainTimezoneService` singleton + `resolveIanaTimezone`, `domainTimezoneService` instance |
| `src/services/googlePlacesService.ts` | `GooglePlacesService` singleton |
| `src/services/*.test.ts` | Vitest suites (one per service) |
| `src/lib/providers/ministry-platform/helper.ts` | `MPHelper` — the MP dependency services construct |
| `src/lib/validation.ts` | `validateGuid`, `validatePositiveInt`, `validateColumnName`, `validateFkPath`, `escapeFilterString` — used by services |
| `src/lib/constants.ts` | `MP_FETCH_BATCH_SIZE` (100) — IN-clause batch size |

## Services inventory (9)
| Service | One-liner | Key methods |
|---------|-----------|-------------|
| `ToolService` | MP page metadata, user tools, selection record IDs, page-record → Contact_ID resolution; dev-tool deploy | `getPageData`, `getSelectionRecordIds`, `getUserTools`, `resolveContactIds`, `listPages`, `listRoles`, `deployTool` |
| `UserService` | Signed-in user's display profile (names + email) by `User_GUID` | `getUserProfile` |
| `AddressLabelService` | Mailing addresses for contacts via multi-level FK traversal | `getAddressesForContacts`, `getAddressForContact` |
| `GroupService` | Group-wizard lookups, contact/group search, group read/create/update | `fetchAllLookups`, `searchContacts`, `searchGroups`, `getGroup`, `createGroup`, `updateGroup` |
| `FieldManagementService` | Lists MP pages, reads `dp_Page_Fields` + table metadata, persists field-order edits | `getPages`, `getPageFields`, `getTableMetadata`, `updatePageFieldOrder` |
| `FamilyService` | Add/Edit Family: contact search, household load/save, lookups, envelope numbers | `searchContacts`, `resolveContactIdFromPage`, `getHousehold`, `getLookups`, `getDefaults`, `getNextEnvelopeNumber`, `saveHousehold` |
| `AuthorizationService` | Role gate for all MP-data access (`MP_SECURITY_ROLES`, fails closed); returns acting MP `User_ID` | `requireSecurityRole`, `hasSecurityRole` |
| `DomainTimezoneService` | MP domain time zone (cached) and wall-clock ↔ instant conversion at the MP boundary | `getMpTimezone`, `toMpSqlDatetime`, `parseMpDatetime`, `clearCache` |
| `GooglePlacesService` | Address autocomplete; API key from MP `dp_Configuration_Settings` (`COMMON`/`GoogleMapsAPIKey`), else `GOOGLE_PLACES_API_KEY`, cached per process | `isEnabled`, `autocomplete`, `getPlaceDetails` |

## Singleton shapes
- `static async getInstance(): Promise<T>` — `ToolService`, `UserService`, `AddressLabelService`, `GroupService`, `FieldManagementService`, `FamilyService`, `GooglePlacesService` (callers `await`).
- `static getInstance(): T` (synchronous) — `AuthorizationService`, `DomainTimezoneService`.

## Authorization
- Every MP-touching method calls `AuthorizationService.getInstance().requireSecurityRole({ table, operation })` first — reads included (CLAUDE.md rule 12). Writes take `$userId` from its return value (rule 13).
- Methods with **no** gate: `UserService.getUserProfile` (rule-12 carve-out via `shared-actions/user.ts`), `FamilyService.getDefaults` (static data, no MP call), `DomainTimezoneService.*` (domain config only).
- `GooglePlacesService` gates every public method (`isEnabled`, `autocomplete`, `getPlaceDetails`) on `dp_Configuration_Settings`/`read` — on each call, not only on a cache miss, because the resolved API key and provider are cached per process. The gate runs outside `resolveApiKey`'s try/catch, so a refusal throws `UnauthorizedError` instead of falling back to the env var.

## Data flow
```
Server Action ("use server")
  -> requireAccess(table, op)            // AuthorizationService.requireSecurityRole (action layer)
  -> await Service.getInstance()         // lazy singleton
    -> service method (typed)
      -> AuthorizationService.requireSecurityRole(...)   // service layer; returns User_ID
      -> MPHelper.getTableRecords / executeProcedureWithBody / createTableRecords / updateTableRecords
        -> Ministry Platform REST API
```

## Related domains
- `../mp-provider/README.md` — `MPHelper` and underlying HTTP/provider layer
- `../mp-schema/README.md` — table/stored-proc reference used by these services
- `../data-flow/README.md` — end-to-end server action → service → MP flow
- `../security/README.md` — `AuthorizationService`, write attribution
- `../auth/README.md` — `session.user.userGuid` (resolved to `User_ID` by the gate)
- `../components/README.md` — server actions that call services
- `../testing/README.md` — mock patterns (`vi.hoisted`, MPHelper class mock, singleton reset)
