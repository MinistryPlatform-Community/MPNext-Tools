# Fix Log: 002 - PKCE Disabled in OAuth Configuration

**Status:** ACCEPTED RISK (no code change)

## Analysis

PKCE is disabled because Ministry Platform's OAuth server historically does not support it.
This cannot be verified or fixed in code — it depends on the external MP server's capabilities.

The auth reference (.claude/references/auth.md) already documents this as a known limitation
(item #7 in Known Limitations, added in commit f929385).

## Action Items (Manual)
- Periodically check if MP OAuth adds PKCE support
- If supported: set `pkce: true` in src/lib/auth.ts and update test at src/auth.test.ts:143
