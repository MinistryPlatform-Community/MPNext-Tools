# Testing Reference Guide

This document provides detailed context about the testing setup, patterns, and conventions for LLM assistants working on the MPNext Tools project.

## Overview

MPNext Tools uses **Vitest** with **jsdom** environment, **@testing-library/react** for component/hook tests, and **v8** for coverage reporting.

### Configuration

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Test runner config (jsdom, globals, coverage, path aliases) |
| `src/test-setup.ts` | Global setup: mocked env vars + `@testing-library/jest-dom` |

### Commands

```bash
npm test              # Watch mode
npm run test:run      # Single run (CI)
npm run test:coverage # Single run + v8 coverage report
```

## Test File Conventions

- Co-locate test files next to their source: `foo.ts` -> `foo.test.ts`
- Service tests: `src/services/userService.test.ts`
- Action tests: `src/components/user-menu/actions.test.ts`
- Context tests: `src/contexts/user-context.test.tsx` (`.tsx` for JSX)
- Provider tests: `src/lib/providers/ministry-platform/provider.test.ts`

## Key Pattern: `vi.hoisted()` for Mock Variables

**Critical**: `vi.mock()` factories are hoisted to the top of the file. Any mock variables referenced inside a factory **must** be declared with `vi.hoisted()`, not plain `const`.

```typescript
// Correct — vi.hoisted() ensures variables exist when vi.mock() runs
const { mockGetSession, mockGetTableRecords } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetTableRecords: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

// Wrong — ReferenceError: Cannot access 'mockGetSession' before initialization
const mockGetSession = vi.fn();
vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));
```

## Mock Patterns

### Mocking MPHelper (class constructor)

Services call `new MPHelper()`. Use a mock class, not `vi.fn().mockImplementation()`:

```typescript
const { mockGetTableRecords } = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => {
  return {
    MPHelper: class {
      getTableRecords = mockGetTableRecords;
    },
  };
});
```

### Mocking Service Singletons

Server actions call `ServiceClass.getInstance()`. Mock the static method:

```typescript
const { mockGetUserProfile } = vi.hoisted(() => ({
  mockGetUserProfile: vi.fn(),
}));

vi.mock('@/services/userService', () => ({
  UserService: {
    getInstance: vi.fn().mockResolvedValue({
      getUserProfile: mockGetUserProfile,
    }),
  },
}));
```

### Mocking Auth + Headers (server actions)

Most server actions require `auth.api.getSession()` and `headers()`:

```typescript
const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

// In tests:
const mockAuthSession = {
  user: { id: 'internal-id', userGuid: 'user-guid-123' },
};

it('should require authentication', async () => {
  mockGetSession.mockResolvedValueOnce(null);
  await expect(someAction()).rejects.toThrow('Authentication required');
});

it('should work when authenticated', async () => {
  mockGetSession.mockResolvedValueOnce(mockAuthSession);
  // ...
});
```

### Mocking Next.js Navigation

```typescript
const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));
```

### Mocking Better Auth Client (React hooks)

For context/component tests that use `authClient.useSession()`:

```typescript
const { mockUseSession } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: { useSession: mockUseSession },
}));

// In tests:
mockUseSession.mockReturnValue({
  data: { user: { id: 'internal-id', userGuid: 'guid-123' } },
  isPending: false,
});
```

## Singleton Reset Pattern

Service classes use static singleton instances. Reset between tests to avoid state leakage:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (UserService as any).instance = undefined;
});
```

## React Hook/Context Tests

Use `@testing-library/react` `renderHook` with a wrapper:

```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <UserProvider>{children}</UserProvider>;
  };
}

it('should load profile', async () => {
  const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.userProfile).toEqual(mockProfile);
});
```

## Coverage

Coverage uses the **v8** provider. Auto-generated model files are excluded.

```bash
# Run with coverage (also reports on failure)
npx vitest run --coverage --coverage.reportOnFailure
```

## Test File Inventory (241 tests, 21 files)

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `lib/providers/ministry-platform/helper.test.ts` | 54 | MPHelper CRUD, Zod validation, procedures, files |
| `lib/providers/ministry-platform/utils/http-client.test.ts` | 26 | HTTP methods, URL building, error handling |
| `lib/providers/ministry-platform/services/table.service.test.ts` | 21 | TableService CRUD with query params, error codes |
| `components/address-labels/actions.test.ts` | 14 | Address label server actions, fetch, skip logic |
| `lib/providers/ministry-platform/client.test.ts` | 12 | OAuth token lifecycle, refresh, concurrent calls |
| `services/toolService.test.ts` | 11 | Page data, user tools, stored procedure calls |
| `proxy.test.ts` | 11 | Route protection, public paths, session, errors |
| `lib/barcode-helpers.test.ts` | 11 | Barcode generation utilities |
| `auth.test.ts` | 11 | Name splitting, session structure, OAuth config |
| `lib/imb-encoder.test.ts` | 10 | USPS Intelligent Mail barcode encoding |
| `lib/providers/ministry-platform/provider.test.ts` | 9 | Singleton pattern, service delegation |
| `lib/postnet-encoder.test.ts` | 9 | POSTNET barcode encoding |
| `lib/label-stock.test.ts` | 9 | Label stock definitions and calculations |
| `services/addressLabelService.test.ts` | 6 | Address fetching, batching, single contact |
| `contexts/user-context.test.tsx` | 6 | UserProvider lifecycle, profile loading, errors |
| `services/userService.test.ts` | 5 | Profile with roles/groups, parallel queries |
| `components/tool/selection-debug-actions.test.ts` | 5 | Selection resolution server actions |
| `components/user-tools-debug/actions.test.ts` | 4 | Authorization checks, session validation |
| `components/user-menu/actions.test.ts` | 3 | Sign-out action, OIDC logout redirect |
| `contexts/session-context.test.tsx` | 2 | useAppSession hook wrapper |
| `components/shared-actions/user.test.ts` | 2 | getCurrentUserProfile delegation |

## Known Issues

None at this time.
