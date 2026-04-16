# Missing Indexes on Contact_Private_Notes Table

**Severity:** LOW  
**Category:** Database  

## Problem

`src/lib/providers/ministry-platform/db/contact_private_notes.sql` creates the `Contact_Private_Notes` table with foreign keys to `dp_Users` and `Contacts` but no indexes on those FK columns.

## Impact

Queries filtering by `User_ID`, `Contact_ID`, or `Domain_ID` will perform full table scans as the table grows.

## Recommended Fix

Add indexes after table creation:

```sql
CREATE INDEX idx_Contact_Private_Notes_UserID ON Contact_Private_Notes(User_ID);
CREATE INDEX idx_Contact_Private_Notes_ContactID ON Contact_Private_Notes(Contact_ID);
CREATE INDEX idx_Contact_Private_Notes_DomainID ON Contact_Private_Notes(Domain_ID);
```
