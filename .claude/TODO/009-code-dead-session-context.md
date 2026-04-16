# Dead SessionContext Code

**Severity:** LOW  
**Category:** Code Quality  

## Problem

In `src/contexts/session-context.tsx`, a `SessionContext` is created via `createContext()` but never used as a Provider. The `useAppSession()` hook directly calls `authClient.useSession()` instead of consuming the context.

```typescript
const SessionContext = createContext<SessionData | null>(null); // Dead code
```

## Recommended Fix

Either:
1. Remove the unused `SessionContext` creation (keep only the `useAppSession` hook and `SessionData` type export)
2. Or implement a `SessionProvider` component if there's a use case for it
