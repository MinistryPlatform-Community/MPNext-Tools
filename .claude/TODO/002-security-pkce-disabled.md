# PKCE Disabled in OAuth Configuration

**Severity:** MEDIUM  
**Category:** Security  

## Problem

PKCE (Proof Key for Code Exchange) is explicitly disabled in `src/lib/auth.ts:44`:

```typescript
pkce: false,
```

PKCE prevents authorization code interception attacks. Disabling it means an attacker who intercepts the authorization code (via referer headers, browser history, or network sniffing on non-HTTPS) can exchange it for tokens.

## Context

The comment in the auth reference says "MP doesn't support PKCE." If this is confirmed, this is an accepted risk. If MP has since added PKCE support, it should be enabled.

## Recommended Action

1. Verify whether Ministry Platform OAuth server now supports PKCE
2. If supported: set `pkce: true` and update test at `src/auth.test.ts:143`
3. If not supported: document this as an accepted limitation in auth.md
