---
title: Verification Rules
type: meta
---

## Rule: verify every factual claim

Applies to every doc under `.claude/references/**/*.md`.

| Claim type | Verification method |
|---|---|
| File path | `Glob` or `Read` — file exists at that path |
| Symbol (function, type, export) | `Grep` — symbol appears at the file referenced, exported/imported correctly |
| Line number ref | `Read` with offset — content matches |
| Count (e.g., "22 components", "507 tests") | Generate current count via `Glob`/`Grep` — fix inline if drift; drop TODO if structural |
| Version (package version) | `Read` `package.json` — match |
| Framework API claim (Next.js 16, React 19, Zod v4, Better Auth 1.5, Vitest 4) | **context7 `query-docs`** — do not trust training |
| Behavior claim | `Read` referenced source — confirm the claim holds |
| Cross-ref to another doc | Target doc exists at that path |

## context7 usage
- Use when verifying any API or behavior claim for an external library/framework
- Query format: library ID + specific topic
- If rate-limited, batch queries; sequentialize the shard if necessary

## Failure protocol
- If a claim cannot be verified either direction, mark it explicitly in the doc as `<!-- UNVERIFIED: ... -->` AND drop a TODO asking for human clarification
- If a claim is wrong, fix inline (if in your scope) or drop a TODO (if outside scope)
- Never silently leave a wrong claim
