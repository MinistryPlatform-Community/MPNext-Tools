---
title: Standard Reference Doc Template
type: meta
---

Copy this schema when writing any reference doc under a domain subfolder (e.g., `auth/sessions.md`, `services/tool-service.md`).

```markdown
---
title: <concise title>
domain: auth | mp-provider | services | components | contexts | routing | data-flow | testing | dto-constants | utils
type: reference
applies_to: [src/path/to/file.ts]
symbols: [exportName1, exportName2]
related: [other-domain/other-file.md]
last_verified: YYYY-MM-DD
---

## Purpose
One or two sentences.

## Files
- `src/path/to/file.ts` — one-line role
- `src/path/to/file.test.ts` — test file

## Key concepts
- Bullet
- Bullet

## API / Interface
Exported symbols with signatures (pulled from real source).

## How it works
Mechanism in bullets. No narrative prose.

## Usage
Copy-paste example from real source:

```typescript
// real example here
```

## Gotchas
- Link to `../GOTCHAS.md#gotcha-nnn` entries
- Or inline one-liner with file:line ref

## Related docs
- `domain/file.md` — why linked
```
