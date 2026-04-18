---
title: Dedupe two independent BATCH_SIZE = 100 constants
severity: low
tags: [refactor, drift]
area: dto-constants
files: [src/services/addressLabelService.ts, src/services/toolService.ts]
discovered: 2026-04-17
discovered_by: dto-constants
status: open
---

## Problem
Two independent `BATCH_SIZE = 100` literals exist for the same concept (MP record fetch batch). They are module-local in one file and a class static in another. If MP API practical batch limit changes, both locations must be updated — silent drift risk.

## Evidence
- `src/services/addressLabelService.ts:21` — `const BATCH_SIZE = 100;` (module-level)
- `src/services/toolService.ts:283` — `private static readonly BATCH_SIZE = 100;` (class static on `ToolService`)
- Both used in the same loop pattern: `for (let i = 0; i < recordIds.length; i += BATCH_SIZE)`

## Proposed fix
Extract to a shared module:

```typescript
// src/lib/constants.ts (new file)
/** Max contact/record IDs to bundle in a single MP $filter `IN (...)` clause. */
export const MP_FETCH_BATCH_SIZE = 100;
```

Replace both references with `import { MP_FETCH_BATCH_SIZE } from '@/lib/constants';`.

## Impact if not fixed
Low. Developers who tune one will forget the other; no functional break today.
