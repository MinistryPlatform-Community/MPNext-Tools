---
title: "Step 9 — CI supply-chain hardening, setup wizard env writer, docs and CLAUDE.md rules"
severity: low
tags: [security, doc]
area: commands
files: [.github/workflows/test.yml, .github/dependabot.yml, scripts/setup.ts, CLAUDE.md, .env.example, .claude/references/security/README.md]
discovered: 2026-09-30
discovered_by: playbook-audit (port-security-review-2026-09-28.md P15/P16, port-downstream-hardening.md P13)
status: open
---

## Problem
- Actions pinned by tag not SHA; no `persist-credentials: false`; no `dependabot.yml`.
- `scripts/setup.ts:273-288` writes env via string `replace` (`$&` expansion), unquoted values, no mode 0600, runs
  `npm install`/`npm update`, doesn't check a hand-entered secret's length.
- CLAUDE.md lacks: "sanitize every `$filter` value, number-typed included" and "better-auth body options / idToken —
  re-check on upgrade". Security README lacks F12. `mp.write.non_user` undocumented.

## Proposed fix
SHA-pin actions, `persist-credentials: false`, add Dependabot config; replacer-function env writes, quoted values,
0600; add the two CLAUDE.md rules; F12 + F3b rows in the security README.

## Impact if not fixed
Tag-hijack risk in CI; setup can corrupt a secret containing `$&`.
