# Dependency Audit Records

One file per dependency audit, named `YYYY-MM-DD.md`. Each records what was
upgraded, what was **deliberately held back and why**, and what the vulnerability
sweep found.

Run an audit with **`/update-deps`** (see `.claude/commands/update-deps.md`).

## Why these records exist

The held-back list is the valuable half. Without it, every future audit
re-investigates the same blockers from scratch, and — worse — someone eventually
force-upgrades past a real incompatibility because the reason was never written
down. Each hold records the **exact upstream condition that would clear it**, so a
later audit can re-check in one command instead of re-deriving the analysis.

## Index

| Date | Summary |
|---|---|
| [2026-09-13](2026-09-13.md) | Cleared 14 advisories (1 critical). Vitest 5 / jsdom 30 / jest-dom 7 / chalk 6. Dropped 5 unused deps. Held TS 7, ESLint 10, GrapesJS 0.23. |

## Conventions

- **Every hold needs a clearing condition.** "Blocked by X" is not enough — write
  the check that proves it is still blocked (a peer range, an upstream issue, a
  missing release).
- **Record the verification baseline**, not just the result. "805 tests passed"
  only means something next to the number that passed before.
- **Distinguish a fixed advisory from a dismissed one.** A false positive gets an
  entry explaining *why* it is false, so the next audit does not re-triage it.
- Keep entries append-only. Do not rewrite history in an old record; if an
  earlier conclusion turns out to be wrong, say so in the *newer* record.
