---
title: "Held — CSP enforcement notes for customer-deployed clones (report endpoint, GrapesJS fonts, browser walk)"
severity: medium
tags: [security, doc]
area: routing
files: [src/lib/security-headers.ts, src/proxy.ts, src/components/template-editor/grapes-config.ts]
discovered: 2026-09-30
discovered_by: playbook-audit (port-downstream-hardening.md F9)
status: open
---

## Problem
Owner decision (2026-09-30): **skip for now; document for customer clones.** The nonce CSP (`security-headers.ts`,
`proxy.ts:33-59`) is enforced by default via `CSP_ENFORCE`, but:
- The GrapesJS canvas loads `fonts.googleapis.com` (`grapes-config.ts:64`), which `style-src`/`font-src` block.
- No CSP report endpoint is configured.
- The enforced-CSP browser walk (sign-in, sign-out, images, every Radix surface, template editor) hasn't been done
  against a production build.

## Notes for customer-deployed clones
- **Report endpoint:** set `report-to`/`report-uri` to a collector the customer owns (Sentry, report-uri.com, or a
  small route that logs shape only). Run `CSP_ENFORCE=false` (report-only) for at least one release cycle first.
- **Fonts:** either allow `https://fonts.googleapis.com` in `style-src` and `https://fonts.gstatic.com` in
  `font-src`, or self-host the fonts and drop the Google URL from `grapes-config.ts` (preferred — no third-party
  request, no CSP widening).
- **Customer additions:** any analytics, chat widget or embedded MP widget a customer adds needs its own origin
  added — do it per deployment, never with `'unsafe-inline'` or a wildcard.
- **Walk:** after any CSP change, `npm run build && npm start`, open DevTools console, walk every tool; zero CSP
  violations is the bar.

## Impact if not fixed
Template editor fonts silently fall back; violations go unseen without a report endpoint.
