# ToolService JSDoc Inaccuracy

**Severity:** LOW  
**Category:** Documentation  

## Problem

`src/services/toolService.ts:134` — The JSDoc for `getUserTools()` references a `domainId` parameter that no longer exists:

```typescript
/**
 * @param domainId - The Ministry Platform Domain ID  // <-- This param doesn't exist
 * @param userId - The Ministry Platform User ID
 */
public async getUserTools(userId: number): Promise<string[]> {
```

The `domainId` parameter was removed (Domain ID is auto-injected by the MP API), but the JSDoc wasn't updated.

## Recommended Fix

Remove the `@param domainId` line from the JSDoc comment.
