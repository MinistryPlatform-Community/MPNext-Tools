# New Stored Procedure Command

Scaffold a new Ministry Platform API stored procedure with the full deployment pattern: idempotent DROP/CREATE, metadata registration, and role grants.

## Arguments

- `$ARGUMENTS` - The stored procedure name (e.g., `api_Common_DoSomething`, `api_Tools_GetData`). If not provided, ask the user for a procedure name before proceeding.

## Instructions

### 1. Gather information

From the user, collect:

| Field | Required | Example |
|-------|----------|---------|
| **Procedure name** | Yes (from $ARGUMENTS) | `api_Common_GenerateSlug` |
| **Description** | Yes (ask if not provided) | `Generates an MP slug URL for a table record` |
| **Parameters** | Yes (ask if not provided) | `@DomainID INT`, `@RecordID INT = NULL` |

Naming convention: procedure names should follow `api_{Category}_{Action}` pattern (e.g., `api_Common_*`, `api_Tools_*`). If the user provides a name that doesn't follow this pattern, confirm it's intentional.

### 2. Generate the SQL file

Create `src/lib/providers/ministry-platform/db/{ProcedureName}.sql` with the following template. Replace all `{placeholders}` with actual values.

**Important**: The `SET ANSI_NULLS`/`SET QUOTED_IDENTIFIER` directives are included in each file for standalone execution, even though the build script strips them when creating the unified install script.

```sql
/****** Object:  StoredProcedure [dbo].[{ProcedureName}]    Script Date: {MM/DD/YYYY} ******/
DROP PROCEDURE IF EXISTS [dbo].[{ProcedureName}]
GO

/****** Object:  StoredProcedure [dbo].[{ProcedureName}]    Script Date: {MM/DD/YYYY} ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- {ProcedureName}
-- =============================================
-- Description: {Description}
-- Last Modified: {MM/DD/YYYY}
-- {Author - use git user name}
-- =============================================
CREATE PROCEDURE [dbo].[{ProcedureName}]
    {Parameters - one per line, comma-separated}
AS
BEGIN
    SET NOCOUNT ON;

    -- TODO: Implement procedure logic

END
GO

-- =============================================
-- SP MetaData Install
-- =============================================
DECLARE @spName NVARCHAR(128) = '{ProcedureName}';
DECLARE @spDescription NVARCHAR(500) = '{Description}';

IF NOT EXISTS (
    SELECT API_Procedure_ID FROM dp_API_Procedures WHERE Procedure_Name = @spName
)
BEGIN
    INSERT INTO dp_API_Procedures (Procedure_Name, Description)
    VALUES (@spName, @spDescription);
END

-- Grant to Administrators Role
DECLARE @AdminRoleID INT = (
    SELECT Role_ID FROM dp_Roles WHERE Role_Name = 'Administrators'
);

IF NOT EXISTS (
    SELECT 1
    FROM dp_Role_API_Procedures RP
    INNER JOIN dp_API_Procedures AP ON AP.API_Procedure_ID = RP.API_Procedure_ID
    WHERE AP.Procedure_Name = @spName AND RP.Role_ID = @AdminRoleID
)
BEGIN
    INSERT INTO dp_Role_API_Procedures (Domain_ID, API_Procedure_ID, Role_ID)
    VALUES (
        1,
        (SELECT API_Procedure_ID FROM dp_API_Procedures WHERE Procedure_Name = @spName),
        @AdminRoleID
    );
END
GO
```

### 3. Verify

After creating the file:

1. Run `npm run mp:build:install` to confirm the build picks up the new file
2. Confirm the new procedure appears in `_INSTALL/ministryplatform-install.sql`
3. Show the user the created file path and a summary of what was generated

## Checklist

- [ ] Procedure name follows naming convention (`api_{Category}_{Action}`)
- [ ] SQL file created in `src/lib/providers/ministry-platform/db/`
- [ ] DROP PROCEDURE IF EXISTS present (idempotent create)
- [ ] Metadata install block present (idempotent dp_API_Procedures registration)
- [ ] Role grant block present (idempotent dp_Role_API_Procedures for Administrators)
- [ ] `npm run mp:build:install` succeeds

## Template Explanation

For less technical users, here's why each section matters:

| Section | Purpose | Why It's Needed |
|---------|---------|-----------------|
| `DROP PROCEDURE IF EXISTS` | Removes the old version before creating the new one | Allows the script to be re-run safely without "already exists" errors |
| `SET ANSI_NULLS / QUOTED_IDENTIFIER` | SQL Server session settings | Required for stored procedure creation; build script strips these for the unified install |
| Header comment block | Documents the procedure | Helps identify what the proc does, when it was last changed, and by whom |
| `CREATE PROCEDURE` | The actual procedure code | This is the logic that runs when the procedure is called |
| Metadata install (`dp_API_Procedures`) | Registers the proc in Ministry Platform's API catalog | Without this, the proc exists in SQL but MP doesn't know about it and won't expose it via the API |
| Role grant (`dp_Role_API_Procedures`) | Grants execution permission to Administrators | Without this, no one can call the proc through the MP API, even though it exists |

All INSERT sections use `IF NOT EXISTS` guards so they skip gracefully on re-runs.

## Notes

- The unified install script at `_INSTALL/ministryplatform-install.sql` is auto-generated by the build — never edit it manually
- SQL files in `src/lib/providers/ministry-platform/db/` are combined alphabetically by the build script
- Domain_ID is hardcoded to `1` in role grants (matches existing pattern across all deployment scripts)
- If the procedure needs to be callable from the app, a corresponding service method should be added — see `src/services/` and `.claude/references/services.md`
