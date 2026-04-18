---
title: CLAUDE.md and README.md report stale test counts (241 tests / 21 files)
severity: low
tags: [doc, drift]
area: doc
files: [CLAUDE.md, README.md]
discovered: 2026-04-17
discovered_by: testing
status: open
---

## Problem
`CLAUDE.md` and `README.md` both reference "241 tests across 21 files" (per facts snapshot note). Current reality per `vitest run`: **507 tests across 37 files**.

## Evidence
- `.claude/references/_meta/facts/2026-04-17.md:164` — "Known pre-existing drift ... 241 tests across 21 files — current reality is 507 tests across 37 files."

## Proposed fix
Update both docs to say "507 tests across 37 files" (or remove the count entirely — it bit-rots every PR). If kept, add a comment pointing to `.claude/references/_meta/facts/` as the source of truth.

## Impact if not fixed
Contributors believe the test suite is ~half its real size. Reduces confidence when running tests against the numbers. The drift will keep growing.
