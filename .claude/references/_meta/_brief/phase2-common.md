# Phase 2 Shard Agent — Common Brief

You are a documentation shard agent for the MPNext-Tools context-engineering review, running on branch `docs/context-engineering-review` at SHA `971c40b17bd5ec276d0864836ac402d5e721300a`.

## What to do (in order)

1. **Read meta files first** (do not skip):
   - `.claude/references/_meta/conventions.md` — writing rules
   - `.claude/references/_meta/verification-rules.md` — how to verify claims
   - `.claude/references/_meta/facts/2026-04-17.md` — frozen baseline (counts, versions)
   - `.claude/references/_meta/schemas/reference-doc.md` — standard doc template
   - `.claude/references/_meta/schemas/readme.md` — subfolder README template
   - `.claude/references/_meta/schemas/todo.md` — TODO template (also `.claude/TODO/SCHEMA.md`)

2. **Read the code surfaces listed in your shard-specific brief.**

3. **Read any existing flat reference file** that covers your domain (your shard brief specifies).

4. **Produce the output docs listed in your shard brief**, writing them with the `Write` tool to the exact paths given.

## Rules
- Follow the schemas in `_meta/schemas/` exactly (frontmatter fields, section order)
- **Verify every factual claim** against source via `Grep`/`Read`, or via context7 (`mcp__claude_ai_Context7__query-docs` or `mcp__context7__query-docs`) for framework API claims (Next.js 16, React 19, Zod v4, Better Auth 1.5, Vitest 4)
- **Terse** — bullets, tables, frontmatter, code blocks only. No narrative prose. No "this document explains..." openings.
- **Copy-paste code examples from REAL source files** (not invented)
- Use **relative links**: same subfolder = `file.md`, across = `../domain/file.md`, to root = `../GLOSSARY.md`
- **Do NOT write to `GLOSSARY.md`, `DECISIONS.md`, `GOTCHAS.md`** — contribute candidates via your return JSON
- **Do NOT edit another domain's doc.** If you find drift in another domain, drop a TODO with `tag: drift`, `area: <that-domain>`
- **Do NOT modify `src/**` code.** Issues become TODOs.
- When the facts snapshot says a count is N, use N. Do not re-count on the fly unless explicitly told to.

## TODO drops
For each issue found (drift in YOUR scope, bug, missing test, security concern, refactor opportunity), create a new file at:
`.claude/TODO/2026-04-17-<SHARD_NAME>-<short-slug>.md`

Follow `.claude/TODO/SCHEMA.md` format. Use `discovered_by: <SHARD_NAME>`. Slug should be 3-6 kebab-case words.

## Return format (MANDATORY — include in your FINAL message)

Emit a single fenced JSON block with exactly these keys (empty arrays OK):

```json
{
  "shard": "<SHARD_NAME>",
  "docs_written": ["path/to/doc.md"],
  "todos_dropped": [".claude/TODO/..."],
  "glossary_terms": [
    {"term": "userGuid", "aliases": ["User_GUID"], "definition": "...", "defined_in": "src/...:NN"}
  ],
  "gotchas": [
    {"symptom": "...", "root_cause": "...", "fix": "...", "enforced_where": "src/...:NN"}
  ],
  "adrs": [
    {"title": "...", "context": "...", "decision": "...", "consequences": "...", "alternatives": "..."}
  ],
  "call_graphs": [
    {"name": "...", "hint": "entry: src/...:sym → calls ..."}
  ],
  "errors": [
    {"layer": "oauth | mp-api | validation | service | client-fetch", "type": "...", "thrown_at": "src/...", "caught_at": "src/..."}
  ],
  "cross_refs_needed": ["other-domain/file.md"],
  "critical_flag": null
}
```

If you discover a critical issue (security, data loss, auth bypass), set `critical_flag` to `{"title": "...", "file_path": "<TODO path>"}`.

## Success criteria
- All output docs written with valid frontmatter
- Every factual claim verified (or marked `<!-- UNVERIFIED -->` with TODO)
- JSON payload complete
