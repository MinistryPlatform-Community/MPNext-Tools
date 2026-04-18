---
title: Remove or redirect stale flat testing.md after domain migration
severity: low
tags: [doc, drift]
area: testing
files: [.claude/references/testing.md]
discovered: 2026-04-17
discovered_by: testing
status: open
---

## Problem
`.claude/references/testing.md` (10,022 bytes) is the pre-migration flat doc. Its inventory header says "442 tests, 34 files" — current reality per facts snapshot is **507 tests across 37 files**. Content has been migrated to `.claude/references/testing/` (README, setup, mocks, cookbook, inventory).

## Evidence
- `.claude/references/testing.md:203` — header `## Test File Inventory (442 tests, 34 files)`
- `.claude/references/_meta/facts/2026-04-17.md:37-38` — authoritative counts 37 files / 507 tests
- New subfolder at `.claude/references/testing/` fully supersedes the flat doc

## Proposed fix
After Phase 2 shards complete, either:
1. Delete `.claude/references/testing.md` (migration sweep); or
2. Replace content with a one-line redirect: `See .claude/references/testing/README.md.`

## Impact if not fixed
LLM readers loading the flat doc get stale counts and a duplicated inventory. Low urgency — the new subfolder has authoritative content.
