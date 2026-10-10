---
title: GooglePlacesService reads MP config with no gate or in-file carve-out
severity: low
tags: [security, doc]
area: services
files: [src/services/googlePlacesService.ts]
discovered: 2026-10-10
discovered_by: doc-review
status: open
---

## Problem
CLAUDE.md rule 12 requires every service method that touches MP data to call
`requireSecurityRole`, or to justify a carve-out in the file. `GooglePlacesService` reads
`dp_Configuration_Settings` (`COMMON`/`GoogleMapsAPIKey`) with no gate and no justification
comment. Its only callers (`src/app/(web)/tools/addeditfamily/actions.ts`) gate
`Addresses`/`read` first, so it is not exploitable today, but a future caller would inherit
an ungated MP read.

## Evidence
- `src/services/googlePlacesService.ts` — no `requireSecurityRole` call
- `.claude/references/services/README.md` § Authorization — lists it among the ungated services

## Proposed fix
Either gate the config read (`{ table: 'dp_Configuration_Settings', operation: 'read' }`)
or add an in-file justification comment as a documented carve-out and list it in
CLAUDE.md rule 12.

## Impact if not fixed
Low: one domain-wide config value; risk is a new ungated caller copying the pattern.
