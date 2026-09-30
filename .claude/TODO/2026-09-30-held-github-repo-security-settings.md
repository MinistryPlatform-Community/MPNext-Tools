---
title: "Held — Enable GitHub repo security settings (private vuln reporting, secret scanning, push protection, Dependabot security updates)"
severity: low
tags: [security, doc]
area: commands
files: [SECURITY.md]
discovered: 2026-09-30
discovered_by: playbook-audit (port-security-review-2026-09-28.md P15)
status: open
---

## Problem
Owner decision (2026-09-30): **hold.** These are repo-admin toggles only the owner can set.

## Proposed fix
GitHub → Settings → Code security: enable private vulnerability reporting, secret scanning, push protection,
Dependabot alerts and security updates. Point `SECURITY.md` at private vulnerability reporting.

## Impact if not fixed
Leaked secrets aren't blocked at push; reporters have no private channel.
