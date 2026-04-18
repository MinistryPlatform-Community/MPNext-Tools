---
title: Data flow
type: index
domain: data-flow
---

## What's in this domain
Call graphs for key end-to-end flows plus an error catalog grouped by origin layer.

## File map
| File | Purpose | When to read |
|------|---------|--------------|
| `call-graphs.md` | 7 key flows with entry points, stack traces, side effects, error paths | Tracing a user action end-to-end |
| `error-catalog.md` | Error types by origin layer (auth, proxy, service, MP provider, HTTP, Zod) | Debugging errors or designing error handling |

## Related domains
- `../auth/README.md` — auth flows touch many call graphs
- `../mp-provider/README.md` — MP stack behind many flows
- `../services/README.md` — service layer is the middle tier
- `../routing/README.md` — tool page convention referenced by flow 2
- `../components/README.md` — feature components that originate each flow
