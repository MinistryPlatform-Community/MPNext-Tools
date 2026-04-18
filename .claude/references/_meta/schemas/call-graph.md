---
title: Call Graph Entry Template
type: meta
---

One section per flow inside `data-flow/call-graphs.md`.

```markdown
## Flow: <flow name>

**Entry point:** `src/path/file.ts:symbol`

**Stack trace:**
1. `src/path/a.ts:12` → calls `src/path/b.ts:foo`
2. `src/path/b.ts:foo` → calls `src/path/c.ts:bar`
3. ...

**Side effects:**
- Cookie set: `<name>`
- DB write: `<table>`
- API call: `<endpoint>`
- Log: `<logger>`

**Error paths:**
- On `<condition>`: thrown as `<error>`, caught at `src/path/X.ts:Y`

**Return shape:** `<type or structure>`
```
