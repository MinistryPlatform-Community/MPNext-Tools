---
title: Household dedup silently skipped when Household_ID is null
severity: low
tags: [bug, refactor]
area: components
files:
  - src/components/address-labels/actions.ts
discovered: 2026-04-17
discovered_by: components-address-labels
status: open
---

## Problem
In `filterAndTransform` (`src/components/address-labels/actions.ts:76-79`), household dedup is gated on `if (config.addressMode === 'household' && row.Household_ID)`. When `Household_ID` is `null`/`0`, the record skips dedup entirely. If multiple contacts without a household share the same `Household_Name` (rare but possible for legacy data), duplicate labels are produced in household mode.

Separately, the chosen `name` at line 52 already falls back from `Household_Name` to `Display_Name`, so a contact with no household still prints — but with their personal name, which may be surprising in "household mode".

## Evidence
- `src/components/address-labels/actions.ts:51-53` — `const name = config.addressMode === 'household' ? (row.Household_Name ?? row.Display_Name) : row.Display_Name;`
- `src/components/address-labels/actions.ts:76-79` — `if (config.addressMode === 'household' && row.Household_ID) { if (seenHouseholds.has(row.Household_ID)) continue; seenHouseholds.add(row.Household_ID); }`
- No test covers the `Household_ID = null` case in `actions.test.ts`.

## Proposed fix
Two options (discuss before choosing):
1. Skip contacts without `Household_ID` in household mode (push a new `no_household` skip reason), OR
2. Dedup by `Address_Line_1 + Postal_Code` as a secondary key when `Household_ID` is absent.

Add a test case verifying the chosen behavior.

## Impact if not fixed
Edge-case duplicate labels and potentially surprising names when household mode is selected against data with missing `Household_ID`. Low severity because production data almost always has a household attached.
