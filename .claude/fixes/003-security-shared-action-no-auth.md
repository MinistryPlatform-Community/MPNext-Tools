# Fix Log: 003 - Shared Action Missing Auth Check

**Status:** FIXED  
**Commit:** 28c7827  

## Changes Made
- Added `auth.api.getSession()` check to `getCurrentUserProfile()` in `src/components/shared-actions/user.ts`
- Updated test to mock auth/headers and added "should throw when not authenticated" test case
- Test count: 248/248 passing (net +1 new test)
