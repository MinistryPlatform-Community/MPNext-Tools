---
title: TODO File Template
type: meta
---

Used for files under `.claude/TODO/YYYY-MM-DD-<slug>.md`. See `.claude/TODO/SCHEMA.md` for authoritative rules.

```markdown
---
title: <actionable title>
severity: critical | high | medium | low
tags: [security | bug | drift | missing-test | refactor | doc | perf]
area: auth | mp-provider | services | components | contexts | routing | data-flow | testing | dto-constants | utils | commands
files: [src/path/to/file.ts]
discovered: YYYY-MM-DD
discovered_by: <shard-name>
status: open
---

## Problem
1-2 paragraphs: what and why it matters.

## Evidence
- `src/path/file.ts:123` — observed
- Commands/output showing the issue

## Proposed fix
Concrete, actionable. Specific file:line edits or command to run.

## Impact if not fixed
Who is affected, how badly, when.
```
