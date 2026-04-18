---
title: HttpClient error messages inconsistently include response body
severity: low
tags: [refactor, bug]
area: mp-provider
files:
  - src/lib/providers/ministry-platform/utils/http-client.ts
discovered: 2026-04-17
discovered_by: mp-provider-core
status: open
---

## Problem
`HttpClient` methods handle non-2xx responses inconsistently:

| Method | Reads response body | Logs body | Includes body in thrown message |
|--------|---------------------|-----------|--------------------------------|
| `get` | yes | yes | yes |
| `post` | yes | yes | yes |
| `postFormData` | no | no | no |
| `put` | yes | yes | **no** (reads and logs, but message omits it) |
| `putFormData` | no | no | no |
| `delete` | no | no | no |

`put` reads the body for logging but discards it before throwing — the caller sees only `PUT /foo failed: 400 Bad Request`. `postFormData`, `putFormData`, and `delete` don't even read the body.

This makes 4xx errors harder to debug because the caller's message is less informative than what's in the log. A server action wrapping an `HttpClient` error can't surface useful detail to the user unless the developer tails the MP logs.

## Evidence
- `src/lib/providers/ministry-platform/utils/http-client.ts:24-35` — GET includes body in message
- `src/lib/providers/ministry-platform/utils/http-client.ts:51-62` — POST includes body
- `src/lib/providers/ministry-platform/utils/http-client.ts:78-82` — `postFormData` ignores body
- `src/lib/providers/ministry-platform/utils/http-client.ts:105-114` — PUT reads+logs but omits from message
- `src/lib/providers/ministry-platform/utils/http-client.ts:131-134` — `putFormData` ignores body
- `src/lib/providers/ministry-platform/utils/http-client.ts:149-153` — DELETE ignores body
- `src/lib/providers/ministry-platform/utils/http-client.test.ts:319-331` — test pins that PUT message does NOT include body

## Proposed fix
Factor out a single `handleFailedResponse(method, endpoint, response)` helper that always reads body (with `.catch(() => '')`), logs with a consistent key, and throws `${METHOD} ${endpoint} failed: ${status} ${statusText}${body ? ` - ${body}` : ''}`. Use from every method. Update the PUT message-shape test + add coverage for DELETE/FormData including body in messages.

## Impact if not fixed
Callers of `put`, `postFormData`, `putFormData`, `delete` get a less-useful error message than callers of `get`/`post`. Debugging asymmetry.
