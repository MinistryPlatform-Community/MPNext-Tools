# Fix Log: 004 - Singleton Double Initialization

**Status:** FIXED  
**Commit:** 01d1fbb  

## Changes Made
Removed `this.initialize()` from the constructor of all 4 services:
- toolService.ts, userService.ts, addressLabelService.ts, groupService.ts

Initialization now only happens via the awaited `getInstance()` path.
248/248 tests passing.
