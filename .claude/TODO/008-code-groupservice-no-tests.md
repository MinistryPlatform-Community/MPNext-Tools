# GroupService Has No Test File

**Severity:** MEDIUM  
**Category:** Testing  

## Problem

`src/services/groupService.ts` (252 lines, 6 public methods) is the only service without a corresponding test file. All other services have tests:

- `toolService.test.ts` (17 tests)
- `userService.test.ts` (5 tests)
- `addressLabelService.test.ts` (6 tests)
- `groupService.test.ts` — MISSING

## Methods That Need Tests

1. `fetchAllLookups()` — 13 parallel queries, Promise.all failure handling
2. `searchContacts(term)` — SQL escaping, minimum length validation
3. `searchGroups(term)` — Same concerns as searchContacts
4. `getGroup(groupId)` — 48 field mapping, date parsing, null handling
5. `createGroup(data, userId)` — Date conversion, API response shape
6. `updateGroup(groupId, data, userId)` — Partial data handling

## Priority Test Cases

- Singleton initialization
- Error propagation from service methods
- SQL injection via search terms
- Date format conversion (YYYY-MM-DD to ISO datetime)
- Empty/null result handling
- Type safety of return values
