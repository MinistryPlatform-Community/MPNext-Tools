---
title: Documentation Conventions
type: meta
---

## Audience
Agent-only. Human readers use `README.md` at the project root.

## Writing rules
- **Terse.** Bullets, tables, frontmatter, code blocks. No narrative prose. No "this document explains..." openings.
- **Verify every factual claim.** Grep/Read the source or use context7 for framework API claims. Never trust training data for Next.js 16 / React 19 / Zod v4 / Better Auth 1.5 / Vitest 4.
- **Copy-paste examples from real source.** Do NOT invent code. Pull from actual `src/**` files.
- **Link, don't repeat.** If another doc covers it, link.
- **One responsibility per file.** If a doc is doing two things, split it.

## Frontmatter
Every doc under `.claude/references/**/*.md` (except stubs in `_meta/schemas/` and `GLOSSARY.md`/`DECISIONS.md`/`GOTCHAS.md`/`INDEX.md` which have minimal or no frontmatter) starts with YAML frontmatter per `_meta/schemas/reference-doc.md` or `_meta/schemas/readme.md`.

## Link format
Relative paths within `.claude/references/`:
- Within same subfolder: `file.md`
- Across subfolders: `../other-domain/file.md`
- To root-level: `../GLOSSARY.md`, `../INDEX.md`

## Source references
`src/path/to/file.ts:LINE` when pointing to a specific location. `src/path/to/file.ts` when referring to the whole file.

## When to drop a TODO vs fix inline
- **Doc drift in your own scope:** fix inline.
- **Drift in another domain's doc:** drop a TODO (tag: `drift`, `area: <that-domain>`). Do NOT edit another domain's doc.
- **Bug in `src/**` code:** drop a TODO. Never modify `src/**` from a doc agent.
- **Missing test:** drop a TODO with tag `missing-test`.

## TODO filename
`.claude/TODO/YYYY-MM-DD-<slug>.md` — slug is kebab-case, 3-6 words.
