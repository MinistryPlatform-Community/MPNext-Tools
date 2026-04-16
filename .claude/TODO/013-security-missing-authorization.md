# Missing Authorization Checks in Server Actions

**Severity:** MEDIUM  
**Category:** Security  

## Problem

Several server actions authenticate users (verify session exists) but don't check authorization (verify user can access the requested data). Any authenticated user can access any data.

### Affected Actions

| Action | File | Issue |
|--------|------|-------|
| `fetchAddressLabels` | address-labels/actions.ts | No check that user can access the selection or contact |
| `fetchGroupRecord` | group-wizard/actions.ts | No check that user can view/edit the group |
| `updateGroup` | group-wizard/actions.ts | No check that user can modify this specific group |
| `resolveSelection` | tool/selection-debug-actions.ts | No check that user owns the selection |
| `resolveContactRecords` | tool/contact-records-actions.ts | Accepts arbitrary table/column names without validation |

## Context

Ministry Platform may enforce row-level security at the API level (via DomainID, user context, etc.), which would mitigate this. However, the application layer should not rely solely on the API for authorization.

## Recommended Fix

1. For selection-based actions: verify the selection belongs to the current user
2. For record-based actions: verify the user has page-level access via `getUserTools()`
3. For `resolveContactRecords`: validate table/column names against a whitelist from `PageData`
