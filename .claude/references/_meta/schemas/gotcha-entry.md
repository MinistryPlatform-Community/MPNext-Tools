---
title: GOTCHA Entry Template
type: meta
---

Copy this block into `GOTCHAS.md` under the matching `## <Area>` heading (and add a TOC line); one section per trap. IDs are never reused — a dead entry becomes `### GOTCHA-NNN: _Retired_` with a one-line reason.

```markdown
### GOTCHA-NNN: <symptom-focused title>

**Symptom:** what goes wrong
**Root cause:** underlying reason
**Fix:** concrete action
**Enforced where:** `<file:line or "not enforced">`
**Related:** `<ref doc path>`
```
