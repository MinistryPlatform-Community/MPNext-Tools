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

## Test File Inventory (442 tests, 34 files)

### Ministry Platform provider (12 files)

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `lib/providers/ministry-platform/helper.test.ts` | 65 | MPHelper CRUD, Zod validation, procedures, files, copy/recurrence/generateSequence |
| `lib/providers/ministry-platform/provider.test.ts` | 25 | Singleton, service delegation, generateSequence with optional fields |
| `lib/providers/ministry-platform/client.test.ts` | 12 | OAuth token lifecycle, refresh, concurrent calls |
| `lib/providers/ministry-platform/utils/http-client.test.ts` | 27 | HTTP methods, URL building, FormData, error handling |
| `lib/providers/ministry-platform/utils/logger.test.ts` | 3 | Debug vs production, error always logs |
| `lib/providers/ministry-platform/auth/client-credentials.test.ts` | 5 | OAuth2 client_credentials token flow |
| `lib/providers/ministry-platform/services/table.service.test.ts` | 22 | CRUD + copyRecord + copyRecordWithSubpages |
| `lib/providers/ministry-platform/services/communication.service.test.ts` | 11 | Communications and messages with/without attachments |
| `lib/providers/ministry-platform/services/domain.service.test.ts` | 6 | Domain info, global filters |
| `lib/providers/ministry-platform/services/metadata.service.test.ts` | 6 | Metadata refresh, tables search |
| `lib/providers/ministry-platform/services/procedure.service.test.ts` | 10 | Procedure listing + query/body execution with URL encoding |
| `lib/providers/ministry-platform/services/file.service.test.ts` | 25 | File CRUD, FormData building, unauthenticated blob retrieval |

### Services (6 files)

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `services/toolService.test.ts` | 17 | Page data, user tools, selection records, contact resolution |
| `services/groupService.test.ts` | 14 | Group CRUD and membership (covered) |
| `services/fieldManagementService.test.ts` | 17 | Pages, fields, table metadata, batched order updates |
| `services/addressLabelService.test.ts` | 6 | Address fetching, batching, single contact |
| `services/userService.test.ts` | 9 | Profile with roles/groups, getUserIdByGuid, GUID validation |

### Components (8 files)

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `components/address-labels/actions.test.ts` | 21 | PDF, DOCX, and template merge actions + error branches |
| `components/field-management/actions.test.ts` | 15 | fetchPages / fetchPageFieldData column merge / savePageFieldOrder |
| `components/address-labels/word-document.test.ts` | 8 | buildWordDocument page layout and barcode branches |
| `components/dev-panel/panels/selection-actions.test.ts` | 5 | Selection resolution server actions |
| `components/dev-panel/panels/user-tools-actions.test.ts` | 4 | Authorization checks, session validation |
| `components/user-menu/actions.test.ts` | 3 | Sign-out action, OIDC logout redirect |
| `components/shared-actions/user.test.ts` | 2 | getCurrentUserProfile delegation |

### Core lib (8 files)

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `lib/validation.test.ts` | 17 | GUID / positive int / column name / filter escaping |
| `lib/barcode-helpers.test.ts` | 11 | Barcode generation utilities |
| `lib/imb-encoder.test.ts` | 10 | USPS Intelligent Mail barcode encoding |
| `lib/postnet-encoder.test.ts` | 9 | POSTNET barcode encoding |
| `lib/label-stock.test.ts` | 9 | Label stock definitions and calculations |
| `lib/barcode-image.test.ts` | 6 | BMP rendering for IMb/POSTNET with JSON fallback |
| `auth.test.ts` | 11 | Name splitting, session structure, OAuth config |
| `proxy.test.ts` | 11 | Route protection, public paths, session, errors |

### Contexts (2 files)

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `contexts/user-context.test.tsx` | 6 | UserProvider lifecycle, profile loading, errors |
| `contexts/session-context.test.tsx` | 2 | useAppSession hook wrapper |

## Coverage (as of last run)

| Metric | Value |
|--------|-------|
| Statements | 97.66% (1089/1115) |
| Branches | 91.03% (447/491) |
| Functions | 97.23% (211/217) |
| Lines | 98.27% (1023/1041) |

## Known Issues

- `src/lib/providers/ministry-platform/scripts/` (build-sql-install.ts, generate-types.ts) are intentionally untested — they are CLI-driven build scripts exercised by `npm run mp:build:install` and `npm run mp:generate:models`.
- Generated model files under `src/lib/providers/ministry-platform/models/` are excluded from coverage via `vitest.config.ts`.
