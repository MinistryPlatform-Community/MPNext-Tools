# Service Singleton Double Initialization Bug

**Severity:** MEDIUM  
**Category:** Code Quality  

## Problem

All four service classes call `initialize()` twice on first instantiation — once in the constructor (synchronous, not awaited) and once in `getInstance()` (awaited). This creates redundant work and a subtle race condition.

### Affected Files

- `src/services/toolService.ts` (lines 32, 44)
- `src/services/userService.ts` (lines 19, 31)
- `src/services/addressLabelService.ts` (lines 49, 55)
- `src/services/groupService.ts` (lines 31, 37)

### Pattern

```typescript
private constructor() {
  this.initialize(); // Called here (NOT awaited — async in sync context)
}

public static async getInstance() {
  if (!instance) {
    instance = new MyService();
    await instance.initialize(); // Called AGAIN here (awaited)
  }
}
```

## Impact

- `initialize()` just creates `new MPHelper()` which is synchronous, so the double call is harmless today
- But if initialize ever becomes truly async, the constructor call would create a dangling promise
- The pattern is confusing and violates the principle of least surprise

## Recommended Fix

Remove `this.initialize()` from all constructors. Keep only the `await` in `getInstance()`.
