---
title: FieldManagementService.getTableMetadata matches on Table_Name, API returns Name
severity: medium
tags: [bug]
area: services
files: [src/services/fieldManagementService.ts]
discovered: 2026-10-10
discovered_by: doc-review
status: open
---

## Problem
`getTableMetadata` picks the exact table from `getTables(tableName)` with
`t.Table_Name === tableName`, falling back to `tables[0]`. The type generator notes the MP
API returns `Name`, not `Table_Name`. If so the exact match never hits, and a search that
returns several tables (e.g. `Contacts` also matching `Contacts_Log`-style names) silently
uses whichever comes first.

## Evidence
- `src/services/fieldManagementService.ts:85` — `tables.find((t) => t.Table_Name === tableName) ?? tables[0]`
- `src/lib/providers/ministry-platform/scripts/generate-types.ts:142-145` — "API returns 'Name' but types define 'Table_Name' - support both"

## Proposed fix
Confirm against a live `/tables?$search=` response, then match on
`(t as { Name?: string }).Name ?? t.Table_Name` (or fix the `TableMetadata` type) and add
a test with two search results where the exact match is not first.

## Impact if not fixed
Field Management may merge the wrong table's columns into a page layout when the table
name is a prefix of another table's name.
