---
title: CommunicationService test fixture uses snake_case fields that don't match `CommunicationInfo` TS type
severity: low
tags: [drift, missing-test]
area: mp-provider
files: [src/lib/providers/ministry-platform/services/communication.service.test.ts]
discovered: 2026-04-17
discovered_by: mp-provider-services
status: open
---

## Problem
The `communicationInfo` fixture in `communication.service.test.ts:36-44` uses snake_case MP-database column names (`Author_User_ID`, `Start_Date`, `From_Contact`, `Reply_to_Contact`, `To_Contact_List`) and is cast with `as any`. The actual `CommunicationInfo` TypeScript interface in `src/lib/providers/ministry-platform/types/provider.types.ts:36-48` uses camelCase (`AuthorUserId`, `StartDate`, `FromContactId`, `ReplyToContactId`, `Contacts`) and does not include `To_Contact_List` at all.

The test passes only because of the `as any` escape hatch. If a caller writes a real call with the typed interface, it will not match what the test claims to exercise. There is no coverage that the actual camelCase → wire-format contract is correct.

Similarly, `domain.service.test.ts:38` uses `{ DomainName: 'Test', DomainId: 1 }` whereas `DomainInfo` has `DisplayName` and no `DomainId`.

## Evidence
- `src/lib/providers/ministry-platform/services/communication.service.test.ts:36-44` — fixture
- `src/lib/providers/ministry-platform/types/provider.types.ts:36-48` — actual type
- `src/lib/providers/ministry-platform/services/domain.service.test.ts:38` — same issue for DomainInfo

## Proposed fix
Replace the `as any` fixtures with strongly-typed objects:

```typescript
const communicationInfo: CommunicationInfo = {
  AuthorUserId: 1,
  Subject: 'Test',
  Body: '<p>Body</p>',
  StartDate: '2024-01-01',
  FromContactId: 123,
  ReplyToContactId: 123,
  Contacts: [456],
  CommunicationType: 'Email',
  IsBulkEmail: false,
  SendToContactParents: false,
};
```

Then assert that the body posted to MP contains the correct field names (whatever MP expects on the wire — verify against MP Platform API docs before changing).

## Impact if not fixed
- Tests give false confidence about field-name contract with MP API.
- If MP expects one casing and the TS types declare the other, the bug is hidden by `as any`.
- Consumers copying from tests will write broken code.
