# Fix Log: 005 - Missing Error Boundaries and Loading States

**Status:** FIXED  
**Commit:** 7a08722  

## Changes Made
- Created `src/app/(web)/error.tsx` — error boundary for all authenticated routes
- Created 4 `loading.tsx` files with skeleton UI for tool routes
- Fixed unhandled promise in signin page (.catch added)
- Fixed unhandled promise in group-wizard edit mode (.catch added)

248/248 tests passing.
