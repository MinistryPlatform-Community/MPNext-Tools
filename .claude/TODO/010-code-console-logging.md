# Inconsistent Logging Patterns

**Severity:** LOW  
**Category:** Code Quality  

## Problem

Logging is inconsistent across the codebase:

- **ToolService:** Extensive `console.log` on every method call and result (12+ statements)
- **UserService:** Zero logging
- **AddressLabelService:** Zero logging
- **GroupService:** Zero logging
- **Server Actions:** Mix of `console.error` in catch blocks
- **MP Provider:** Has a proper logger module (`utils/logger.ts`) with `[MP]` prefix and dev-only debug, but it's only used within the provider layer

## Impact

- Debug output in ToolService will spam production logs
- No logging in other services makes debugging difficult
- Inconsistent approach creates confusion about the project's logging strategy

## Recommended Fix

1. Either adopt the existing `logger` module from the MP provider across all services
2. Or remove all `console.log` from ToolService for consistency
3. At minimum, use `console.log` only in development (check `NODE_ENV`)
