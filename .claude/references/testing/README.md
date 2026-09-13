---
title: testing
type: index
domain: testing
---

## What's in this domain
Vitest test runner config, global setup, mocking patterns, and inventory of 116 test files (1,535 cases) co-located next to source. Coverage over authored code is 98.84% statements / 99.70% lines, enforced by thresholds in `vitest.config.mts`.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `setup.md` | `vitest.config.mts`, `src/test-setup.ts`, env vars, jsdom, v8 coverage, the `coverage.include` contract and enforced thresholds | Adding Vitest config or adjusting global setup |
| `mocks.md` | Mandatory mock patterns (`vi.hoisted`, MPHelper mock class, singleton reset, auth/headers, fake timers) | Writing any new test that mocks an import |
| `cookbook.md` | Copy-paste recipes pulled from real tests (service, server action, component, OAuth) | Writing a new test in an existing category |
| `inventory.md` | All 116 test files grouped by area with one-liner coverage | Locating where a surface is tested |

## Code surfaces
| Path | Role |
|------|------|
| `vitest.config.mts` | Runner config (jsdom, globals, v8 coverage + thresholds, `@` alias) |
| `src/test-setup.ts` | Env stubs + `@testing-library/jest-dom` |
| `src/**/*.test.ts` | Unit tests (services, lib, auth, proxy) |
| `src/**/*.test.tsx` | React component/hook tests |

## Related domains
- `../services/README.md` — singleton pattern that drives the singleton-reset mock pattern
- `../auth/README.md` — `auth.api.getSession()` and `userGuid` references used in action tests
- `../mp-provider/README.md` — `MPHelper` class that services wrap; mocked via `class { method = mockFn }`
