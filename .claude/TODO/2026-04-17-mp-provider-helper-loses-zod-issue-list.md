---
title: MPHelper Zod validation rewrap drops structured issue list
severity: low
tags: [refactor, bug]
area: mp-provider
files:
  - src/lib/providers/ministry-platform/helper.ts
  - src/lib/providers/ministry-platform/helper.test.ts
discovered: 2026-04-17
discovered_by: mp-provider-core
status: open
---

## Problem
`MPHelper.createTableRecords` and `MPHelper.updateTableRecords` wrap Zod validation errors into a plain `Error` with just the string message:

```typescript
// src/lib/providers/ministry-platform/helper.ts:185-199
try {
    return schema.parse(record) as T;
} catch (validationError) {
    throw new Error(
        `Validation failed for record ${index}: ${
            validationError instanceof Error
                ? validationError.message
                : String(validationError)
        }`
    );
}
```

The `z.ZodError.issues` array is serialized into `.message` but the structured path/code/expected/received shape is lost. Callers wanting field-level UI feedback (e.g. the field-management server actions) cannot `e instanceof ZodError` because the error has already been reshaped.

CLAUDE.md advertises this feature as "Validation errors provide detailed feedback with record index and field-level issues" — but at the API boundary, consumers only get the index and a flat message string.

## Evidence
- `src/lib/providers/ministry-platform/helper.ts:185-199` — create-path rewrap
- `src/lib/providers/ministry-platform/helper.ts:269-281` — update-path rewrap
- `src/lib/providers/ministry-platform/helper.test.ts:238-252` — test pins `.rejects.toThrow('Validation failed for record 1')` (string match only)
- `CLAUDE.md` — claims "field-level issues"

## Proposed fix
Preserve structure by subclassing or attaching the Zod error:

```typescript
class MPValidationError extends Error {
    constructor(public recordIndex: number, public zodError: z.ZodError) {
        super(`Validation failed for record ${recordIndex}: ${zodError.message}`);
        this.name = 'MPValidationError';
    }
}
```

Consumers can then do `if (e instanceof MPValidationError) { e.zodError.issues... }`. Update tests to assert the instance type and the structured issues list.

## Impact if not fixed
Field-management and form UIs can't surface per-field errors without reparsing the message string. Small but real DX impact.
