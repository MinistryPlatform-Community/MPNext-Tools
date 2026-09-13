---
title: Test Runner Setup
domain: testing
type: reference
applies_to: [vitest.config.mts, src/test-setup.ts, package.json]
symbols: [defineConfig]
related: [mocks.md, cookbook.md]
last_verified: 2026-09-13
---

## Purpose
Vitest runner config, global setup, and commands. Everything the harness needs before a single test runs.

## Files
- `vitest.config.mts` — runner config (environment, globals, coverage, alias).
  The `.mts` extension is deliberate: as `.ts` the file was loaded as CommonJS
  and Vite warned it would break when `configLoader: 'native'` becomes the
  default. `.mts` is resolved automatically, so no script changes were needed.
  Being real ESM, it must use `import.meta.dirname`, not `__dirname`.
- `src/test-setup.ts` — env stubs + `@testing-library/jest-dom` import
- `package.json` — `test`, `test:run`, `test:coverage` scripts

## Versions (from `.claude/references/_meta/facts/2026-09-13.md`)
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

## `vitest.config.mts` (full source)

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
      // `include` is load-bearing. Without it the v8 provider only reports
      // files that some test imported, so an untested file is invisible
      // rather than counted as 0%. That masked ~1,600 uncovered statements
      // and inflated the reported number from 48% to 83%.
      //
      // Note: this is the Vitest 5 spelling. The old `coverage.all: true`
      // flag was REMOVED in Vitest 5 — setting it is a type error and does
      // nothing. `include` is now the only way to widen the denominator.
      include: ['src/**/*.{ts,tsx}'],
      /**
       * Statements and lines only, by deliberate choice.
       *
       * Branch and function coverage are noisier — a single added guard
       * clause or a defensive `?? []` can drop branch coverage below a bar
       * that nothing is actually wrong with, and a threshold people learn to
       * override is worse than no threshold. Statements and lines move
       * predictably with real test work.
       *
       * Set below the achieved figures (98.84% statements / 99.70% lines) so
       * ordinary work has room, but above the 95% target so the suite cannot
       * quietly slide back under it. Raise these when coverage rises; never
       * lower them to make a red build green.
       */
      thresholds: {
        statements: 97,
        lines: 98,
      },
      // NOTE: directory exclusions must end in `**`. A bare trailing slash
      // (e.g. 'src/components/ui/') matches nothing, so the files stay in the
      // denominator — which is how the shadcn primitives were silently being
      // counted before.
      exclude: [
        'node_modules/**',
        '.next/**',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.{test,spec}.{ts,tsx}',
        'src/lib/providers/ministry-platform/models/**', // Auto-generated files
        'src/lib/providers/ministry-platform/scripts/**', // Build-time CLI scripts
        'src/components/ui/**', // Vendored shadcn/ui primitives
        '**/loading.tsx', // Declarative skeleton markup
        'src/app/layout.tsx', // Root font/metadata shell
        'src/app/(web)/layout.tsx', // Font/metadata shell
        '**/index.ts', // Barrel re-exports
        '**/types.ts', // Type-only modules
      ],
    },
  },
  resolve: {
    alias: {
      // `import.meta.dirname`, not `__dirname`: this file is ESM (.mts), and
      // Vite's native config loader has no CommonJS globals.
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
```

## Key settings
- **`coverage.include`** — REQUIRED. Without it the v8 provider only reports files a test imported, so untested files vanish from the report instead of counting as 0%. Note `coverage.all` was removed in Vitest 5 and directory exclusions must end in `**`.
- **`coverage.thresholds`** — statements 97 / lines 98, enforced by the `test:coverage` CI job. Branches and functions are deliberately unenforced.
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
