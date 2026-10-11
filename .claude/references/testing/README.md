---
title: testing
type: index
domain: testing
---

## What's in this domain
Vitest test runner config, global setup, mocking patterns, and inventory of 120 test files (2,237 cases) co-located next to source. Coverage over authored code is 99.13% statements / 99.80% lines (2026-10-10), enforced by thresholds (97 / 98) in `vitest.config.mts`.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `setup.md` | `vitest.config.mts`, `src/test-setup.ts`, env vars, jsdom, v8 coverage, the `coverage.include` contract and enforced thresholds | Adding Vitest config or adjusting global setup |
| `mocks.md` | Mandatory mock patterns (`vi.hoisted`, MPHelper mock class, singleton reset, `AuthorizationService` gate, auth/headers, fake timers) | Writing any new test that mocks an import |
| `cookbook.md` | Copy-paste recipes pulled from real tests (service, server action, component, OAuth) | Writing a new test in an existing category |
| `inventory.md` | All 120 test files grouped by area | Locating where a surface is tested |

## Code surfaces
| Path | Role |
|------|------|
| `vitest.config.mts` | Runner config (jsdom, globals, v8 coverage + thresholds, `@` alias) |
| `src/test-setup.ts` | Env stubs + `ResizeObserver` stub + `@testing-library/jest-dom/vitest` |
| `src/test-utils/mock-oidc.ts` | Test-only mock MP OIDC provider for `src/auth.*.test.ts` |
| `src/**/*.test.ts` | Unit tests (services, lib, auth, proxy) |
| `src/**/*.test.tsx` | React component/hook tests |

## Related domains
- `../services/README.md` — singleton pattern that drives the singleton-reset mock pattern
- `../auth/README.md` — `auth.api.getSession()` and `userGuid` references used in action tests
- `../mp-provider/README.md` — `MPHelper` class that services wrap; mocked via `class { method = mockFn }`
