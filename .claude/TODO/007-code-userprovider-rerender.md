# UserProvider Missing useMemo/useCallback Optimization

**Severity:** MEDIUM  
**Category:** Performance  

## Problem

In `src/contexts/user-context.tsx`, the UserProvider's context value object is created fresh on every render, causing all `useUser()` consumers to re-render unnecessarily:

```typescript
// Current: new object reference every render
return (
  <UserContext.Provider value={{ userProfile, isLoading, error, refreshUserProfile }}>
    {children}
  </UserContext.Provider>
);
```

Additionally, `refreshUserProfile` is not wrapped in `useCallback`, so its reference changes on every render.

## Recommended Fix

```typescript
const refreshUserProfile = useCallback(async () => {
  await loadUserProfile();
}, [loadUserProfile]);

const value = useMemo(
  () => ({ userProfile, isLoading, error, refreshUserProfile }),
  [userProfile, isLoading, error, refreshUserProfile]
);

return (
  <UserContext.Provider value={value}>
    {children}
  </UserContext.Provider>
);
```
