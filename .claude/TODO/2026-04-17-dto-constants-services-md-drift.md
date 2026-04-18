---
title: services.md DTO table drifts from actual DTO shapes
severity: medium
tags: [drift, doc]
area: services
files: [.claude/references/services.md, src/lib/dto/address-label.dto.ts]
discovered: 2026-04-17
discovered_by: dto-constants
status: open
---

## Problem
`.claude/references/services.md` describes `SkipRecord` and `FetchAddressLabelsResult` field shapes that do NOT match the source in `src/lib/dto/address-label.dto.ts`. This is doc drift in a neighboring domain's doc — dto-constants shard is documenting the source-of-truth but cannot edit services.md.

## Evidence
`.claude/references/services.md:513-519`:
- Claims `SkipRecord` has fields `Contact_ID, Display_Name, reason`
- Claims `FetchAddressLabelsResult` has fields `labels, skipped, totalFetched`

Actual source `src/lib/dto/address-label.dto.ts`:
```typescript
// Line 17-21
export interface SkipRecord {
  name: string;       // NOT Display_Name
  contactId: number;  // NOT Contact_ID
  reason: SkipReason;
}

// Line 44-47
export interface FetchAddressLabelsResult {
  printable: LabelData[];  // NOT labels
  skipped: SkipRecord[];
  // NO totalFetched field
}
```

## Proposed fix
When services-shard migrates `services.md` → `services/` subfolder, update the DTO table to match actual source or remove it entirely (dto-constants/dtos.md is now the source of truth for DTO catalog — cross-ref from services instead of duplicating).

## Impact if not fixed
Medium. Agents consulting services.md will author code against the wrong field names (`Display_Name` / `labels`), leading to runtime `undefined` access when indexing skip records or iterating the result.
