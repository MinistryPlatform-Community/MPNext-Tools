---
title: Mocking Patterns
domain: testing
type: reference
applies_to: [src/**/*.test.ts, src/**/*.test.tsx]
symbols: [vi.hoisted, vi.mock, MPHelper, AuthorizationService]
related: [setup.md, cookbook.md, inventory.md]
last_verified: 2026-10-10
---

## Purpose
Mandatory mock patterns for this codebase. Deviations produce `ReferenceError`, leaked singleton state, or broken service instantiation.

## Pattern: `vi.hoisted()` for mock variables

`vi.mock()` calls are **hoisted** to the top of the file by the Vitest transformer. Any variable referenced inside the factory must be declared with `vi.hoisted()` — otherwise the factory runs before the `const` binding is initialized and you get a `ReferenceError`.

```typescript
// Correct — from src/services/toolService.test.ts:4-16
const { mockExecuteProcedureWithBody, mockGetTableRecords } = vi.hoisted(() => ({
  mockExecuteProcedureWithBody: vi.fn(),
  mockGetTableRecords: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => {
  return {
    MPHelper: class {
      executeProcedureWithBody = mockExecuteProcedureWithBody;
      getTableRecords = mockGetTableRecords;
    },
  };
});
```

```typescript
// WRONG — ReferenceError: Cannot access 'mockGetSession' before initialization
const mockGetSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));
```

Alternative form (single export):
```typescript
// From src/components/address-labels/actions.test.ts:3
const mockGetSession = vi.hoisted(() => vi.fn());
```

## Pattern: MPHelper mock as a class (not `vi.fn().mockImplementation()`)

Services call `new MPHelper()` in their constructor (see `src/services/*.ts`). The import is `import { MPHelper } from '@/lib/providers/ministry-platform'`. Mocking this as `vi.fn().mockImplementation(...)` breaks because `new` on a plain mock fn does not wire up the prototype chain the way tests expect.

```typescript
// Correct — mock class with method fields
vi.mock('@/lib/providers/ministry-platform', () => {
  return {
    MPHelper: class {
      executeProcedureWithBody = mockExecuteProcedureWithBody;
      getTableRecords = mockGetTableRecords;
    },
  };
});
```

Every method that the service under test calls must be declared as a class field assigned to a hoisted `vi.fn()`. Missing methods throw `TypeError: this.mp.methodName is not a function` at runtime.

## Pattern: Singleton reset between tests

All services in `src/services/` use a private static `instance` field (`toolService.ts:85`, `userService.ts:13`, etc.). Without resetting, cached instances hold stale mocked methods across tests (including stale `mockClear`ed state).

```typescript
// From src/services/toolService.test.ts:46-50
beforeEach(() => {
  vi.clearAllMocks();
  (ToolService as any).instance = undefined;
});
```

Required for every service's own test: `AddressLabelService`, `AuthorizationService`, `DomainTimezoneService`, `FamilyService`, `FieldManagementService`, `GooglePlacesService`, `GroupService`, `ToolService`, `UserService` (all 9 `src/services/*.test.ts` files do it).

## Pattern: Mocking the `AuthorizationService` gate

Every MP-touching service method and feature server action calls `AuthorizationService.getInstance().requireSecurityRole(...)` (CLAUDE.md rule 12), which returns the acting MP `User_ID`. Tests of anything *above* the gate mock it so they exercise their own logic; the gate has its own tests in `src/services/authorizationService.test.ts`. Note `getInstance` is **synchronous** here (as is `DomainTimezoneService`'s; the other seven services' are async).

```typescript
// From src/services/toolService.test.ts:28-42
const { mockRequireSecurityRole, mockHasSecurityRole } = vi.hoisted(() => ({
  mockRequireSecurityRole: vi.fn(async () => 42),
  mockHasSecurityRole: vi.fn(async () => true),
}));

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    getInstance: () => ({
      requireSecurityRole: mockRequireSecurityRole,
      hasSecurityRole: mockHasSecurityRole,
    }),
  },
  UnauthorizedError: class UnauthorizedError extends Error {},
}));
```

- The stub's return value (`42`) is the only source of `$userId` write attribution (rule 13), so service tests assert `$userId: 42` to prove the service takes it from the gate.
- To test a refusal: `mockRequireSecurityRole.mockRejectedValueOnce(new UnauthorizedError(...))`.
- `src/components/address-labels/actions.test.ts:33-49` shows a variant whose `hasSecurityRole` delegates to the same mock.

## Pattern: Mocking service singletons in server-action tests

Server actions call `ServiceClass.getInstance()` (async). Mock the static method to return an object shaped like the service API used by the action.

```typescript
// From src/components/dev-panel/panels/user-tools-actions.test.ts:20-26
vi.mock('@/services/toolService', () => ({
  ToolService: {
    getInstance: vi.fn().mockResolvedValue({
      getUserTools: mockGetUserTools,
    }),
  },
}));
```

When mocking multiple services, each `getInstance` returns only the methods the action actually calls — over-mocking is unnecessary.

## Pattern: Mocking auth + `next/headers` for server actions

Code that reads the session directly — the `AuthorizationService` gate itself, `requireDevSession`, `AuthWrapper`, and the `shared-actions/` carve-outs — does `await auth.api.getSession({ headers: await headers() })`. Feature actions mostly reach it only through the gate, so their tests mock the gate (above) and often also these two.

```typescript
// From src/components/dev-panel/panels/user-tools-actions.test.ts:8-18
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
```

Session shapes used in tests:
```typescript
// Authenticated
{ user: { id: 'internal-id', userGuid: '550e8400-e29b-41d4-a716-446655440000' } }

// Missing userGuid (e.g. getCurrentUserProfile → throws 'Unauthorized')
{ user: { id: 'internal-id' } }

// Unauthenticated (tests "Unauthorized")
null
```

`session.user.id` is Better Auth's internal ID — the MP `User_GUID` lives on `session.user.userGuid` (see `../auth/README.md`).

## Pattern: Better Auth client hooks (React)

For context/component tests that use `authClient.useSession()`:

```typescript
// From src/contexts/user-context.test.tsx:5-14
const { mockUseSession, mockGetCurrentUserProfile } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
  mockGetCurrentUserProfile: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: mockUseSession,
  },
}));

// Per test
mockUseSession.mockReturnValue({
  data: { user: { id: 'internal-id', userGuid: 'guid-123' } },
  isPending: false,
});
```

## Pattern: Next.js navigation

```typescript
const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));
```

## Pattern: Fake timers for token expiry

Used in `src/lib/providers/ministry-platform/client.test.ts` to test OAuth token refresh without waiting real time.

```typescript
// From src/lib/providers/ministry-platform/client.test.ts:33-46
beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // ... import modules ...
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// In test:
vi.advanceTimersByTime(6 * 60 * 1000); // advance 6 minutes
```

## Pattern: React hook testing with wrapper

```typescript
// From src/contexts/user-context.test.tsx:22-26
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <UserProvider>{children}</UserProvider>;
  };
}

const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

## Pattern: Per-test env stubbing

```typescript
// From src/components/dev-panel/dev-panel.test.tsx:44-54
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  setHostname("localhost");
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
```

## Gotchas
- Hoisting `ReferenceError` if a `const mockX = vi.fn()` is referenced inside a `vi.mock()` factory — must use `vi.hoisted()`.
- `vi.fn().mockImplementation()` for `MPHelper` silently fails when service code reads method fields — use mock class.
- Forgetting `(ServiceClass as any).instance = undefined` causes previous test's mocks to leak through the singleton's cached `this.mp` reference.
- `Headers` constructor in `next/headers` mock: `vi.fn().mockResolvedValue(new Headers())` — do not pass a POJO; Better Auth calls `.get()` on it.

## Related docs
- `setup.md` — runner config
- `cookbook.md` — end-to-end recipes that combine these patterns
- `../auth/README.md` — session shape, `userGuid`
- `../services/README.md` — singleton pattern details
