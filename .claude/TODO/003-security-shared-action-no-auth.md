# Shared Action getCurrentUserProfile Missing Auth Check

**Severity:** HIGH  
**Category:** Security  

## Problem

`src/components/shared-actions/user.ts` is the only server action that does NOT validate the user's session before executing. Every other server action in the codebase calls `auth.api.getSession()`.

```typescript
// Current: no auth check
export async function getCurrentUserProfile(id: string) {
  const userService = await UserService.getInstance();
  return await userService.getUserProfile(id);
}
```

This means any caller can fetch any user's profile by passing an arbitrary GUID, including unauthenticated requests if the action is somehow exposed.

## Recommended Fix

```typescript
export async function getCurrentUserProfile(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');
  
  const userService = await UserService.getInstance();
  return await userService.getUserProfile(id);
}
```

Note: Also consider authorization — should a user only be able to fetch their own profile?
