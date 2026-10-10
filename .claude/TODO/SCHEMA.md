---
title: TODO Schema
type: meta
---

## Filename
`.claude/TODO/YYYY-MM-DD-<kebab-case-slug>.md`

- Date = discovery date
- Slug = 3-6 words describing the issue, e.g., `userguid-check-missing-in-query`

## File template

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

## Lifecycle
This folder holds **open work only**. `status` is always `open`.

- **Done or won't do → delete the file** in the same PR that finishes the work
  or records the decision. Never leave a file marked `resolved`, `closed`,
  `won't fix` or `superseded`. The commit message is the record: say what was
  done or why it was dropped. Find past items with
  `git log --diff-filter=D -- .claude/TODO/`.
- **Before deleting**, salvage what outlives the item:
  - leftover follow-up work → a new TODO file;
  - a lasting lesson or trap → `.claude/references/GOTCHAS.md`;
  - a decision → `.claude/references/DECISIONS.md` (ADR).
- **Remove every inbound link** to the deleted file (`INDEX.md`, references,
  code comments, other TODOs). A link to a missing TODO is drift.
- **Update `INDEX.md`** (counts, tables, tags, areas) in the same change.
  `INDEX.md` has no "resolved" section.

## Severity
- **critical**: security hole, data loss risk, auth bypass
- **high**: broken behavior, test failure, convention violation that causes bugs
- **medium**: doc drift, missing test, refactor opportunity with real cost
- **low**: nits, stylistic improvements, minor doc fixes

## Tags (required, ≥1)
- `security`, `bug`, `drift`, `missing-test`, `refactor`, `doc`, `perf`

## Escalation
Any TODO with `severity: critical` MUST also be flagged to the main-thread orchestrator via `CRITICAL_FLAG` in the agent's return message.
