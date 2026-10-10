---
title: Schema/stored-proc generators write to pre-reorg doc paths
severity: low
tags: [drift]
area: mp-provider
files: [src/lib/providers/ministry-platform/scripts/generate-types.ts, src/lib/providers/ministry-platform/scripts/generate-storedprocs.ts]
discovered: 2026-10-10
discovered_by: doc-review
status: open
---

## Problem
`generate-types.ts` writes `.claude/references/ministryplatform.schema.md` and
`generate-storedprocs.ts` writes `.claude/references/ministryplatform.storedprocs.md`, but
the committed catalogs live at `.claude/references/mp-schema/tables.md` and
`mp-schema/stored-procs.md` (with frontmatter). Regenerating never refreshes the committed
copies, so they stay at their 2026-04-16 snapshot.

## Evidence
- `generate-types.ts:665`, `generate-storedprocs.ts:34`

## Proposed fix
Point both outputs at the `mp-schema/` files and emit their frontmatter. Separately,
`generate-types.ts` rewrites `models/index.ts` from only the tables in the current run, so
`-o models --search X` drops every other table from the barrel — make the barrel scan the
output directory instead.

## Impact if not fixed
Claude Code reads stale schema/proc catalogs after a customer regenerates against their own MP.
