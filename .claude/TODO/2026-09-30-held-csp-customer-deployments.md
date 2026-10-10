---
title: "Held — CSP enforcement notes for customer-deployed clones (report endpoint, browser walk)"
severity: medium
tags: [security, doc]
area: routing
files: [src/lib/security-headers.ts, src/proxy.ts]
discovered: 2026-09-30
discovered_by: playbook-audit (port-downstream-hardening.md F9)
status: open
---

## Problem
Owner decision (2026-09-30): **skip for now; document for customer clones.** The nonce CSP (`security-headers.ts`,
`proxy.ts:33-59`) is enforced by default via `CSP_ENFORCE`, but:
- No CSP report endpoint is configured.
- The enforced-CSP browser walk (sign-in, sign-out, images, every Radix surface) hasn't been done
  against a production build.

## Notes for customer-deployed clones
- **Report endpoint:** set `report-to`/`report-uri` to a collector the customer owns (Sentry, report-uri.com, or a
  small route that logs shape only). Run `CSP_ENFORCE=false` (report-only) for at least one release cycle first.
- **Customer additions:** any analytics, chat widget or embedded MP widget a customer adds needs its own origin
  added — do it per deployment, never with `'unsafe-inline'` or a wildcard.
- **Walk:** after any CSP change, `npm run build && npm start`, open DevTools console, walk every tool; zero CSP
  violations is the bar.

## Impact if not fixed
Violations go unseen without a report endpoint.

## Update (2026-10-10)
The GrapesJS font item is gone: the template editor was removed, and it was the only third-party
origin the CSP blocked. What remains is the report endpoint and the enforced-CSP browser walk.
