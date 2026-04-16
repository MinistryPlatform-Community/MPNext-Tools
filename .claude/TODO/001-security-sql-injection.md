# SQL Injection via String Interpolation in Filter Strings

**Severity:** HIGH  
**Category:** Security  

## Problem

Multiple files construct MP API filter strings using template literal string interpolation with inadequately sanitized input. While the MP API may provide some protection, this is a defense-in-depth violation.

### Affected Files

| File | Line(s) | Pattern |
|------|---------|---------|
| `src/services/userService.ts` | 63 | `filter: \`User_GUID = '${id}'\`` |
| `src/services/groupService.ts` | 151, 162 | `filter: \`Display_Name LIKE '${escaped}%'\`` (only escapes `'`) |
| `src/services/groupService.ts` | 175 | `filter: \`Group_ID = ${groupId}\`` |
| `src/services/toolService.ts` | 208 | `filter: \`${primaryKey} IN (${batch.join(',')})\`` |
| `src/services/addressLabelService.ts` | 80 | `filter: \`Contact_ID IN (${idList})\`` |
| `src/components/address-labels/actions.ts` | 41 | `filter: \`User_GUID = '${userGuid}'\`` |
| `src/components/group-wizard/actions.ts` | 30 | `filter: \`User_GUID = '${userGuid}'\`` |
| `src/components/tool/selection-debug-actions.ts` | 26 | `filter: \`User_GUID = '${userGuid}'\`` |
| `src/components/user-tools-debug/actions.ts` | 24 | `filter: \`User_GUID = '${userGuid}'\`` |

### Risk Analysis

- **GUID filters:** Lower risk since userGuid comes from session, but no format validation is performed. A malformed GUID could inject filter logic.
- **Search term filters:** `groupService.ts` only escapes single quotes (`replace(/'/g, "''")`). Other injection vectors (wildcards, Unicode) not handled.
- **Numeric filters:** `toolService.ts` and `addressLabelService.ts` join numeric arrays into IN clauses. Safe if callers always pass numbers, but no runtime validation.
- **primaryKey parameter:** `toolService.ts:208` interpolates the column name itself, which could allow filter injection if the caller passes untrusted data.

## Recommended Fix

1. **Validate GUIDs** before use: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
2. **Validate numeric IDs** are positive integers: `Number.isInteger(id) && id > 0`
3. **Validate column names** against a whitelist pattern: `/^[A-Za-z_][A-Za-z0-9_]*$/`
4. **Consider adding a parameterized query helper** to MPHelper if the MP REST API supports it
5. **Improve search term escaping** beyond just single quotes
