# Fix Log: 013 - Missing Authorization Checks in Server Actions

**Status:** PARTIALLY ADDRESSED (accepted architecture)

## Analysis

Ministry Platform's REST API enforces its own authorization model — all API requests use
authenticated tokens with user context, and MP applies row-level security based on the
user's roles and domain. Adding duplicate authorization at the application layer would
require replicating MP's permission model, which is not practical.

## What Was Already Fixed

- **Input validation on table/column names:** Fixed in TODO #001 (commit 2214fcc) — 
  `resolveContactIds()` in toolService now validates tableName, primaryKey, and 
  contactIdField via `validateColumnName()` before use in queries.
- **Authentication checks:** All server actions verify session exists before proceeding.
- **GUID validation:** All GUID-based lookups now validated (commit 2214fcc).

## Accepted Risk

MP API-level authorization is the primary enforcement mechanism. The application layer
authenticates users and validates inputs, but delegates record-level access control
to the MP REST API. This is appropriate for a tool that operates within MP's security model.
