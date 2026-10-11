---
title: Test Recipes
domain: testing
type: reference
applies_to: [src/**/*.test.ts, src/**/*.test.tsx]
symbols: [ToolService, fetchAddressLabels, DevPanel, MinistryPlatformClient]
related: [mocks.md, setup.md]
last_verified: 2026-10-10
---

## Purpose
Copy-paste starting points for the four test flavors in this codebase. Each recipe is lifted from a real passing test.

## Recipe 1 — Service test (wraps MPHelper)

**Source:** `src/services/toolService.test.ts` (abridged — docstring and other cases elided)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolService } from '@/services/toolService';

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

describe('ToolService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ToolService as any).instance = undefined;
  });

  describe('getPageData', () => {
    it('should call executeProcedureWithBody with correct params', async () => {
      const mockPageData = {
        Page_ID: 292,
        Display_Name: 'Contacts',
        Table_Name: 'Contacts',
        Primary_Key: 'Contact_ID',
      };
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[mockPageData]]);

      const service = await ToolService.getInstance();
      const result = await service.getPageData(292);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith('api_Tools_GetPageData', {
        '@PageID': 292,
      });
      expect(result).toEqual(mockPageData);
    });
  });
});
```

Checklist:
- `vi.hoisted()` mock fns
- Mock `MPHelper` as class with method fields
- Mock the `AuthorizationService` gate (services gate every MP call); its return value is the `$userId` the service must use — see `mocks.md`
- Reset singleton in `beforeEach`
- Mock return shape matches real MP API (SP calls return `[[row, ...]]` — array of result sets)

## Recipe 2 — Server action test (gate + services + external libs)

**Source:** `src/components/address-labels/actions.test.ts` (abridged — PDF/DOCX/zip/barcode lib mocks and most cases elided)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetSelectionRecordIds = vi.hoisted(() => vi.fn());
const mockGetAddressesForContacts = vi.hoisted(() => vi.fn());
const mockGetAddressForContact = vi.hoisted(() => vi.fn());
const mockRequireSecurityRole = vi.hoisted(() => vi.fn());

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

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    getInstance: () => ({
      requireSecurityRole: mockRequireSecurityRole,
      hasSecurityRole: async () => {
        try {
          await mockRequireSecurityRole();
          return true;
        } catch {
          return false;
        }
      },
    }),
  },
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

vi.mock('@/services/toolService', () => ({
  ToolService: {
    getInstance: vi.fn().mockResolvedValue({
      getSelectionRecordIds: mockGetSelectionRecordIds,
    }),
  },
}));

vi.mock('@/services/addressLabelService', () => ({
  AddressLabelService: {
    getInstance: vi.fn().mockResolvedValue({
      getAddressesForContacts: mockGetAddressesForContacts,
      getAddressForContact: mockGetAddressForContact,
    }),
  },
}));

// ... @react-pdf/renderer, docxtemplater, pizzip, zip-guard, barcode mocks ...

import { fetchAddressLabels } from './actions';
import type { LabelConfig } from '@/lib/dto';
import type { ToolParams } from '@/lib/tool-params';

describe('fetchAddressLabels', () => {
  const defaultConfig: LabelConfig = { /* stockId '5160', household, postnet, ... */ };

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', userGuid: '550e8400-e29b-41d4-a716-446655440000' } });
    mockRequireSecurityRole.mockReset();
    mockRequireSecurityRole.mockImplementation(async () => {
      const session = await mockGetSession();
      if (!session?.user?.id) throw new Error('Unauthorized');
      return 42;
    });
    mockGetSelectionRecordIds.mockReset();
    mockGetAddressesForContacts.mockReset();
    mockGetAddressForContact.mockReset();
  });

  it('should throw if not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const params: ToolParams = { recordID: 1 };
    await expect(fetchAddressLabels(params, defaultConfig)).rejects.toThrow('Unauthorized');
  });
});
```

Checklist:
- Mock the `AuthorizationService` gate — feature actions call `requireSecurityRole`, not `auth.api.getSession` directly. Here the gate mock is driven by `mockGetSession` so session-shape tests keep their meaning; override with `mockRequireSecurityRole.mockRejectedValueOnce(...)` to test a refusal
- `@/lib/auth` + `next/headers` mocked together
- Every service the action touches gets its own `getInstance` mock (async services → `mockResolvedValue`)
- External libs (`@react-pdf/renderer`, `docxtemplater`, `pizzip`, etc.) stubbed with class/POJO depending on how the action instantiates them
- Session fixture uses realistic GUID so validation passes

## Recipe 3 — React component test (localhost/env gating)

**Source:** `src/components/dev-panel/dev-panel.test.tsx` (abridged)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import type { ToolParams } from "@/lib/tool-params";

// Mock all sub-panels — DevPanel tests should not depend on server actions.
vi.mock("./panels/params-panel", () => ({
  ParamsPanel: () => <div data-testid="params-panel" />,
}));
vi.mock("./panels/selection-panel", () => ({
  SelectionPanel: () => <div data-testid="selection-panel" />,
}));
// ... other sub-panel mocks ...

import { DevPanel } from "./dev-panel";

const params: ToolParams = { pageID: 292 };

function setHostname(h: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, hostname: h },
    writable: true,
    configurable: true,
  });
}

describe("DevPanel", () => {
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

  it("returns null when hostname is not localhost", async () => {
    setHostname("example.com");
    const { container } = render(<DevPanel params={params} />);
    await act(async () => {});
    expect(container.firstChild).toBeNull();
  });

  it("renders the bar when both gates pass", async () => {
    render(<DevPanel params={params} />);
    await act(async () => {});
    expect(screen.getByTestId("dev-panel")).toBeInTheDocument();
  });
});
```

Checklist:
- Stub sub-components so you test only the component under test
- `cleanup()` + `vi.restoreAllMocks()` in `afterEach` to isolate DOM and spies
- `await act(async () => {})` after `render` to flush effects
- `vi.stubEnv`/`vi.unstubAllEnvs` around `NODE_ENV` checks
- `localStorage.clear()` if the component reads it

## Recipe 4 — OAuth flow test (fake timers)

**Source:** `src/lib/providers/ministry-platform/client.test.ts` (abridged — console-silencing `beforeEach` and other cases elided)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MinistryPlatformClient } from '@/lib/providers/ministry-platform/client';

vi.mock('@/lib/providers/ministry-platform/auth/client-credentials', () => ({
  getClientCredentialsToken: vi.fn(),
}));

describe('MinistryPlatformClient', () => {
  let mockGetClientCredentialsToken: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    const { getClientCredentialsToken } = await import(
      '@/lib/providers/ministry-platform/auth/client-credentials'
    );
    mockGetClientCredentialsToken = getClientCredentialsToken as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should refresh token when expired', async () => {
    mockGetClientCredentialsToken
      .mockResolvedValueOnce({ access_token: 'first-token', expires_in: 3600, token_type: 'Bearer' })
      .mockResolvedValueOnce({ access_token: 'refreshed-token', expires_in: 3600, token_type: 'Bearer' });

    const client = new MinistryPlatformClient();

    await client.ensureValidToken();
    expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(1);

    // Advance time past 5-minute safety window
    vi.advanceTimersByTime(6 * 60 * 1000);

    await client.ensureValidToken();
    expect(mockGetClientCredentialsToken).toHaveBeenCalledTimes(2);
  });
});
```

Checklist:
- `vi.useFakeTimers()` in `beforeEach`, `vi.useRealTimers()` in `afterEach`
- Dynamic `await import(...)` inside `beforeEach` to get the mocked export reference cleanly typed
- Queue multiple resolves with `.mockResolvedValueOnce(...)` chain
- `vi.advanceTimersByTime(ms)` not `setTimeout`

## Related docs
- `mocks.md` — each pattern in isolation
- `setup.md` — env and runner config
- `inventory.md` — find the closest existing test to copy from
