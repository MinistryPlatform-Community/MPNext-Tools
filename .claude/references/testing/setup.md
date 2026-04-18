---
title: Test Runner Setup
domain: testing
type: reference
applies_to: [vitest.config.ts, src/test-setup.ts, package.json]
symbols: [defineConfig]
related: [mocks.md, cookbook.md]
last_verified: 2026-04-17
---

## Purpose
Vitest runner config, global setup, and commands. Everything the harness needs before a single test runs.

## Files
- `vitest.config.ts` — runner config (environment, globals, coverage, alias)
- `src/test-setup.ts` — env stubs + `@testing-library/jest-dom` import
- `package.json` — `test`, `test:run`, `test:coverage` scripts

## Versions (from `.claude/references/_meta/facts/2026-04-17.md`)
| Package | Version |
|---|---|
| vitest | ^4.1.0 |
| @vitest/coverage-v8 | ^4.1.0 |
| @testing-library/react | ^16.3.2 |
| @testing-library/jest-dom | ^6.9.1 |
| jsdom | ^28.1.0 |
| @vitejs/plugin-react | ^6.0.1 |

## Commands
| Script | Behavior |
|---|---|
| `npm test` | Watch mode (`vitest`) |
| `npm run test:run` | Single run (`vitest run`) |
| `npm run test:coverage` | Single run with v8 coverage (`vitest run --coverage`) |

## `vitest.config.ts` (full source)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'src/test-setup.ts',
        '**/*.d.ts',
        'src/lib/providers/ministry-platform/models/', // Auto-generated files
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Key settings
- **`environment: 'jsdom'`** — DOM available without a browser (see `../DECISIONS.md` for rationale vs happy-dom)
- **`globals: true`** — `describe/it/expect/vi` available without imports (tests still import explicitly by convention)
- **`plugins: [react()]`** — `@vitejs/plugin-react` required for `.tsx` files and JSX transform
- **`include`** — matches `src/**/*.{test,spec}.{ts,tsx}` (both extensions supported)
- **Alias `@` -> `./src`** — mirrors `tsconfig.json` path alias
- **Coverage provider: `v8`** — not istanbul; faster, native to Node
- **Coverage excludes** — auto-generated MP models under `src/lib/providers/ministry-platform/models/` are excluded so generated field counts don't dominate coverage

## `src/test-setup.ts` (full source)

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for tests
vi.stubEnv('MINISTRY_PLATFORM_BASE_URL', 'https://test-mp.example.com');
vi.stubEnv('MINISTRY_PLATFORM_CLIENT_ID', 'test-client-id');
vi.stubEnv('MINISTRY_PLATFORM_CLIENT_SECRET', 'test-client-secret');
vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_ID', 'test-dev-client-id');
vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_SECRET', 'test-dev-client-secret');
vi.stubEnv('NEXTAUTH_SECRET', 'test-secret-key-for-testing');
vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000');
vi.stubEnv('NODE_ENV', 'test');
```

## Env var handling
- `vi.stubEnv()` seeds required env vars at test bootstrap so modules that read `process.env` at import time (e.g. `src/lib/auth.ts`, `src/lib/providers/ministry-platform/config.ts`) don't throw.
- Tests may call `vi.stubEnv('NODE_ENV', 'development')` per-test and `vi.unstubAllEnvs()` in `afterEach` (see `src/components/dev-panel/dev-panel.test.tsx`).

## Coverage
- Provider: **v8** (`@vitest/coverage-v8`)
- Reporters: `text` (console), `json` (machine-readable), `html` (`coverage/index.html`)
- Run: `npm run test:coverage` or `npx vitest run --coverage --coverage.reportOnFailure`

## Counts (facts snapshot 2026-04-17)
- **Test files:** 37
- **Test cases:** 507 (from `vitest run`)

## Conventions
- Co-locate: `foo.ts` -> `foo.test.ts`; `foo.tsx` -> `foo.test.tsx`
- Per-file: `import { describe, it, expect, vi, beforeEach } from 'vitest'` even though `globals: true` (consistency)
- React tests use `@testing-library/react` + `jest-dom` matchers (auto-extended via setup file)

## Related docs
- `mocks.md` — required mock patterns
- `cookbook.md` — real-file recipes
- `../GOTCHAS.md` — hoisting, singleton leakage, MPHelper mock class
