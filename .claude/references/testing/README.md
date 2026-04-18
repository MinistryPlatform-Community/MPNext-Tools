---
title: testing
type: index
domain: testing
---

## What's in this domain
Vitest test runner config, global setup, mocking patterns, and inventory of 37 test files (507 cases) co-located next to source.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `setup.md` | `vitest.config.ts`, `src/test-setup.ts`, env vars, jsdom, v8 coverage | Adding Vitest config or adjusting global setup |
| `mocks.md` | Mandatory mock patterns (`vi.hoisted`, MPHelper mock class, singleton reset, auth/headers, fake timers) | Writing any new test that mocks an import |
| `cookbook.md` | Copy-paste recipes pulled from real tests (service, server action, component, OAuth) | Writing a new test in an existing category |
| `inventory.md` | All 37 test files grouped by area with one-liner coverage | Locating where a surface is tested |

## Code surfaces
| Path | Role |
|------|------|
| `vitest.config.ts` | Runner config (jsdom, globals, v8, `@` alias) |
| `src/test-setup.ts` | Env stubs + `@testing-library/jest-dom` |
| `src/**/*.test.ts` | Unit tests (services, lib, auth, proxy) |
| `src/**/*.test.tsx` | React component/hook tests |

## Related domains
- `../services/README.md` — singleton pattern that drives the singleton-reset mock pattern
- `../auth/README.md` — `auth.api.getSession()` and `userGuid` references used in action tests
- `../mp-provider/README.md` — `MPHelper` class that services wrap; mocked via `class { method = mockFn }`
