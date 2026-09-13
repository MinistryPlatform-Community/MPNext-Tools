---
title: `vitest.config.ts` was loaded as CommonJS, warned as unsupported by Vite's future default loader
severity: low
tags: [drift, testing]
area: testing
files: [vitest.config.mts]
discovered: 2026-09-13
discovered_by: coverage-review-orchestrator
status: resolved
---

## Problem
Every Vitest invocation prints:

```
(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`,
which is planned to become the default in a future major version of Vite:
  - ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1).
    Use a `.mjs` extension or set `"type": "module"` in the closest package.json
```

`vitest.config.ts` uses ESM syntax (`import`/`export default`) but `package.json`
has no `"type": "module"`, so Vite loads it through the CommonJS path. That path
still works today, but Vite plans to make `configLoader: 'native'` the default,
at which point the config stops loading and the whole suite fails to start.

This is noise on every local run and every CI run today, and a hard break on a
future Vite major.

## Evidence
- `vitest.config.ts:1` — `import { defineConfig } from 'vitest/config';`
- `package.json` — no `"type"` field.
- Warning reproduces on any `npx vitest run`.
- Vite 8 / Vitest 6 are the likely forcing versions; neither is adopted here yet.

## Proposed fix
Lowest-risk option is to rename `vitest.config.ts` -> `vitest.config.mts`. Vitest
resolves the `.mts` extension automatically, so no script changes are needed, and
it does not touch how Next.js or the rest of the toolchain treat the package.

Do NOT add `"type": "module"` to `package.json` as the fix — this project also
contains CommonJS tooling and Next.js build config, and flipping the package type
has a much wider blast radius than renaming one file.

Verify with `npx vitest run` (warning gone, suite still runs) and
`npm run test:coverage` (Codecov path `coverage/coverage-final.json` still
produced).

## Impact if not fixed
Cosmetic today. On the Vite major that flips `configLoader` to `'native'`, the
config fails to load and the entire test suite — and therefore the CI `test`
gate that protects `dev` and `main` — stops running. Cheap to fix now, and the
dependency-audit process should not have to rediscover it under time pressure.

---

## Resolution (2026-09-13)
Applied the proposed fix: renamed `vitest.config.ts` -> `vitest.config.mts`.
Vitest resolves the `.mts` extension automatically, so no script or CI changes
were needed, and `package.json` was left alone (adding `"type": "module"` would
have had a far wider blast radius, as noted above).

The rename surfaced a second, hidden instance of the same problem. With the
file loaded as real ESM, Vite immediately flagged:

```
- `__dirname` (vitest.config.mts:66:25). Use `import.meta.dirname` instead
```

`__dirname` is a CommonJS global and does not exist in ESM; it had been working
only because the file was being loaded as CJS. The `@` path alias is now
resolved with `import.meta.dirname`. Had the rename been done without running
the suite, the alias would have thrown at config load and every test would have
failed to start.

Verified: `npm run test:run` produces 17 lines of output with zero warnings,
116 files / 1,535 tests passing, and `npx tsc --noEmit` is clean.
