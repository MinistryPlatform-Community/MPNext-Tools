---
title: "Step 6 — Security headers, next.config hardening, server-only guards, prerender + build in CI"
severity: medium
tags: [security, drift]
area: routing
files: [next.config.ts, src/proxy.ts, src/lib/security-headers.ts, .github/workflows/test.yml, src/services/domainTimezoneService.ts]
discovered: 2026-09-30
discovered_by: playbook-audit (port-downstream-hardening.md F9, port-security-review-2026-09-28.md P11/P14)
status: open
---

## Problem
- `next.config.ts:17-51` lacks COOP/CORP `same-origin`, `poweredByHeader:false`, `images.unoptimized`,
  `logging.serverFunctions:false` — the last matters most: `next dev` prints server-action arguments (household
  lists) while pointed at production MP.
- `proxy.ts:22` `startsWith('/api/auth')` has no trailing slash; matcher (`:95`) unanchored; `originOf` doesn't
  validate scheme/host; CSP `base-uri 'self'` (upstream `'none'`).
- No `server-only` anywhere (e.g. `domainTimezoneService`, services); no `scripts/check-prerender.mjs`; CI never
  runs `npm run build`.

## Proposed fix
Port per the playbooks. Verify `server-only` by planting a client import that must break `next build`.
**CSP enforcement walk and the GrapesJS Google Fonts decision are held** — see
`2026-09-30-held-csp-customer-deployments.md`.

## Impact if not fixed
Server-action payloads in dev logs; weaker cross-origin isolation; server code can silently enter the client bundle.
