---
title: audit-deps slash command lists stale "Key Dependencies" (next-auth, drizzle, AWS) not used in this project
severity: medium
tags: [drift, doc]
area: commands
files: [.claude/commands/audit-deps.md]
discovered: 2026-04-17
discovered_by: commands-drift-check
status: open
---

## Problem
`.claude/commands/audit-deps.md` ends with a "Key Dependencies to Always Check" section that lists packages which are not part of this project. Running `/audit-deps` as written steers reviewers toward packages that do not exist in `package.json`, missing the real attack surface.

Listed but not present in this repo:
- `next-auth` — project uses `better-auth` (see `package.json` line with `"better-auth": "^1.5.5"` and CLAUDE.md "Auth: Better Auth")
- `drizzle-orm` / `drizzle-kit` — no ORM is used; MP is accessed via REST through `MPHelper`
- `jsonwebtoken` / `bcryptjs` — not listed in `package.json`
- "Any AWS SDK packages" — no `@aws-sdk/*` in dependencies

## Evidence
- `.claude/commands/audit-deps.md:48-54` — current "Key Dependencies to Always Check" list
- `package.json:20-88` — actual dependency graph (next 16, react 19, better-auth, docxtemplater, grapesjs, openai, zod v4; vitest 4, eslint 9, typescript 6)

## Proposed fix
Rewrite the "Key Dependencies to Always Check" section to match what this codebase actually ships. Suggested replacement:

```markdown
## Key Dependencies to Always Check
- next / eslint-config-next (framework security)
- react / react-dom (core framework)
- better-auth (auth/session)
- zod (validation — v4 API differs from v3)
- @grapesjs/react / grapesjs / grapesjs-mjml / mjml (template editor)
- docx / docxtemplater / docxtemplater-image-module-free / pizzip (Word merge)
- openai (LLM client, if used by tools)
- @react-pdf/renderer (PDF output)
- vitest / @vitest/coverage-v8 / @vitejs/plugin-react (test runner)
- typescript (toolchain)
```

While editing, also consider adding a note that `npm audit` on Next.js 16 / React 19 / Vitest 4 may flag peer-dep churn — call that out instead of having the reviewer chase phantom CVEs in packages that aren't installed.

## Impact if not fixed
Medium. Reviewers running `/audit-deps` spend time evaluating packages that don't exist and may miss real CVEs in the packages that actually ship (Next.js 16, better-auth, grapesjs, openai, docx). Also lowers trust in the command library — the first drift a user notices tends to color their view of the rest.
