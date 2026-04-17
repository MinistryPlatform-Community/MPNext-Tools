-- =============================================
-- Ministry Platform Database Install Script
-- Generated: 2026-04-17T19:46:46.475Z
-- Auto-generated - Do not edit manually
-- =============================================
-- NOTE: Run this script against your Ministry Platform database
-- =============================================

-- Set session options for consistency
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
SET NOCOUNT ON
GO

PRINT 'Starting Ministry Platform database installation...'
GO


-- =============================================
-- FILE: api_Common_GenerateSlug.sql
-- =============================================

/****** Object:  StoredProcedure [dbo].[api_Common_GenerateSlug]    Script Date: 9/24/2025 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_Common_GenerateSlug]
GO

/****** Object:  StoredProcedure [dbo].[api_Common_GenerateSlug]    Script Date: 9/24/2025 ******/
-- =============================================
-- api_Common_GenerateSlug
-- =============================================
-- Description: Generates an MP slug URL for a table record and optional subpage for the given domain.
-- Last Modified: 9/24/2025
-- Chris Kehayias
-- =============================================
CREATE PROCEDURE [dbo].[api_Common_GenerateSlug]
    @DomainID INT,
    @TableName VARCHAR(50),
    @RecordID INT = NULL,
    @SubPage VARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @domainUrl NVARCHAR(255) = (
        SELECT External_Server_Name
        FROM dp_Domains
        WHERE Domain_ID = @DomainID
    );

    DECLARE @pageID INT = (
        SELECT TOP 1 Page_ID
        FROM dp_Pages
        WHERE Table_Name LIKE @TableName
        ORDER BY Filter_Clause
    );

    DECLARE @subPageID INT = NULL;

    IF (@SubPage IS NOT NULL)
    BEGIN
        SET @subPageID = (
            SELECT TOP 1 Sub_Page_ID
            FROM dp_Sub_Pages
            WHERE Parent_Page_ID = (
                      SELECT TOP 1 Page_ID
                      FROM dp_Pages
                      WHERE Table_Name LIKE @TableName
                      ORDER BY Filter_Clause
                  )
              AND Display_Name LIKE @SubPage
        );
    END

    IF (@RecordID IS NOT NULL AND @subPageID IS NOT NULL)
    BEGIN
        SELECT CONCAT('https://', @domainUrl, '/mp/', @pageID, '/', @RecordID, '/', @subPageID) AS SLUG;
    END
    ELSE IF (@RecordID IS NOT NULL)
    BEGIN
        SELECT CONCAT('https://', @domainUrl, '/mp/', @pageID, '/', @RecordID) AS SLUG;
    END
    ELSE
    BEGIN
        SELECT CONCAT('https://', @domainUrl, '/mp/', @pageID) AS SLUG;
    END
END
GO

-- =============================================
-- SP MetaData Install
-- =============================================
DECLARE @spName NVARCHAR(128) = 'api_Common_GenerateSlug';
DECLARE @spDescription NVARCHAR(500) = 'Generates an MP slug URL for a table record and optional subpage for the given domain';

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

GO

-- =============================================
-- FILE: api_Common_StoredProcParameters.sql
-- =============================================

/****** Object:  StoredProcedure [dbo].[api_Common_StoredProcParameters]    Script Date: 9/24/2025 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_Common_StoredProcParameters]
GO

/****** Object:  StoredProcedure [dbo].[api_Common_StoredProcParameters]    Script Date: 9/24/2025 ******/
-- =============================================
-- api_Common_StoredProcParameters
-- =============================================
-- Description: Returns Stored Proc Parameter Details
-- Last Modified: 10/26/2025
-- Chris Kehayias
-- =============================================
CREATE PROCEDURE [dbo].[api_Common_StoredProcParameters]
    @DomainID INT,
    @ProcName sysname
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @SchemaName sysname = N'dbo';

    ;WITH ProcDef AS (
        SELECT
            p.object_id,
            s.name AS SchemaName,
            p.name AS ProcedureName,
            sm.definition,
            ASPos = NULLIF(
                        NULLIF(
                            CHARINDEX(NCHAR(10) + N'AS', sm.definition COLLATE Latin1_General_CI_AS), 0
                        ),
                    0)
        FROM sys.procedures p
        JOIN sys.schemas s ON s.schema_id = p.schema_id
        JOIN sys.sql_modules sm ON sm.object_id = p.object_id
        WHERE s.name = @SchemaName AND p.name = @ProcName
    ),
    Header AS (
        SELECT
            d.object_id,
            d.SchemaName,
            d.ProcedureName,
            HeaderText = CASE
                            WHEN d.ASPos IS NOT NULL AND d.ASPos > 0
                                THEN LEFT(d.definition, d.ASPos-1)
                            ELSE d.definition
                        END
        FROM ProcDef d
    ),
    Params AS (
        SELECT
            h.object_id,
            h.SchemaName,
            h.ProcedureName,
            ps.parameter_id,
            ps.name AS ParameterName,
            TYPE_NAME(ps.user_type_id) AS DataType,
            ps.max_length,
            ps.precision,
            ps.scale,
            ps.is_output,
            HeaderText = h.HeaderText
        FROM Header h
        LEFT JOIN sys.parameters ps ON ps.object_id = h.object_id
    ),
    Parsed AS (
        SELECT
            p.*,
            ParamPos = NULLIF(CHARINDEX(p.ParameterName, p.HeaderText COLLATE Latin1_General_CI_AS), 0),
            EqPos = CASE
                    WHEN CHARINDEX(p.ParameterName, p.HeaderText COLLATE Latin1_General_CI_AS) > 0
                        THEN NULLIF(CHARINDEX('=', p.HeaderText COLLATE Latin1_General_CI_AS,
                                            CHARINDEX(p.ParameterName, p.HeaderText COLLATE Latin1_General_CI_AS)), 0)
                    ELSE NULL
                    END
        FROM Params p
    )
    SELECT
        p.ParameterName,
        p.DataType,
        p.max_length  AS MaxLength,
        p.precision   AS [Precision],
        p.scale       AS [Scale],
        p.is_output   AS IsOutputParameter,
        DefaultValueExists = CASE WHEN p.EqPos IS NOT NULL THEN 1 ELSE 0 END
    FROM Parsed p
    WHERE p.ParameterName <> '@DomainID'  -- ignore @DomainID
    ORDER BY p.parameter_id;

END
GO

-- =============================================
-- SP MetaData Install
-- =============================================
DECLARE @spName NVARCHAR(128) = 'api_Common_StoredProcParameters';
DECLARE @spDescription NVARCHAR(500) = 'Returns detailed parameter information about stored procedures by name.';

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

GO

-- =============================================
-- FILE: api_MPNextTools_GetPageFields.sql
-- =============================================

/****** Object:  StoredProcedure [dbo].[api_MPNextTools_GetPageFields]    Script Date: 04/16/2026 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_MPNextTools_GetPageFields]
GO

/****** Object:  StoredProcedure [dbo].[api_MPNextTools_GetPageFields]    Script Date: 04/16/2026 ******/
-- =============================================
-- api_MPNextTools_GetPageFields
-- =============================================
-- Description: Returns all page field records for a given Page_ID
-- Last Modified: 04/16/2026
-- Chris Kehayias
-- =============================================
CREATE PROCEDURE [dbo].[api_MPNextTools_GetPageFields]
    @DomainID INT,
    @PageID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Page_Field_ID, Page_ID, Field_Name, Group_Name, View_Order,
           Required, Hidden, Default_Value, Filter_Clause,
           Depends_On_Field, Field_Label, Writing_Assistant_Enabled
    FROM dp_Page_Fields
    WHERE Page_ID = @PageID
    ORDER BY View_Order

END
GO

-- =============================================
-- SP MetaData Install
-- =============================================
DECLARE @spName NVARCHAR(128) = 'api_MPNextTools_GetPageFields';
DECLARE @spDescription NVARCHAR(500) = 'Returns all page field records for a given Page_ID';

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

GO

-- =============================================
-- FILE: api_MPNextTools_GetPages.sql
-- =============================================

/****** Object:  StoredProcedure [dbo].[api_MPNextTools_GetPages]    Script Date: 04/16/2026 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_MPNextTools_GetPages]
GO

/****** Object:  StoredProcedure [dbo].[api_MPNextTools_GetPages]    Script Date: 04/16/2026 ******/
-- =============================================
-- api_MPNextTools_GetPages
-- =============================================
-- Description: Returns a simple list of page metadata (Page_ID, Display_Name, Table_Name)
-- Last Modified: 04/16/2026
-- Chris Kehayias
-- =============================================
CREATE PROCEDURE [dbo].[api_MPNextTools_GetPages]
    @DomainID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Page_ID, Display_Name, Table_Name
    FROM dp_Pages
    ORDER BY Display_Name

END
GO

-- =============================================
-- SP MetaData Install
-- =============================================
DECLARE @spName NVARCHAR(128) = 'api_MPNextTools_GetPages';
DECLARE @spDescription NVARCHAR(500) = 'Returns a simple list of page metadata (Page_ID, Display_Name, Table_Name)';

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

GO

-- =============================================
-- FILE: api_MPNextTools_UpdatePageFieldOrder.sql
-- =============================================

/****** Object:  StoredProcedure [dbo].[api_MPNextTools_UpdatePageFieldOrder]    Script Date: 04/16/2026 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_MPNextTools_UpdatePageFieldOrder]
GO

/****** Object:  StoredProcedure [dbo].[api_MPNextTools_UpdatePageFieldOrder]    Script Date: 04/16/2026 ******/
-- =============================================
-- api_MPNextTools_UpdatePageFieldOrder
-- =============================================
-- Description: Upserts a page field row by Page_ID + Field_Name.
--              Updates if exists, inserts if not.
-- Last Modified: 04/16/2026
-- Chris Kehayias
-- =============================================
CREATE PROCEDURE [dbo].[api_MPNextTools_UpdatePageFieldOrder]
    @DomainID INT,
    @PageID INT,
    @FieldName VARCHAR(64),
    @GroupName NVARCHAR(75) = NULL,
    @ViewOrder SMALLINT = NULL,
    @Required BIT = 0,
    @Hidden BIT = 0,
    @DefaultValue NVARCHAR(128) = NULL,
    @FilterClause NVARCHAR(2000) = NULL,
    @DependsOnField VARCHAR(64) = NULL,
    @FieldLabel NVARCHAR(64) = NULL,
    @WritingAssistantEnabled BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1 FROM dp_Page_Fields
        WHERE Page_ID = @PageID AND Field_Name = @FieldName
    )
    BEGIN
        UPDATE dp_Page_Fields
        SET Group_Name = @GroupName,
            View_Order = @ViewOrder,
            Required = @Required,
            Hidden = @Hidden,
            Default_Value = @DefaultValue,
            Filter_Clause = @FilterClause,
            Depends_On_Field = @DependsOnField,
            Field_Label = @FieldLabel,
            Writing_Assistant_Enabled = @WritingAssistantEnabled
        WHERE Page_ID = @PageID AND Field_Name = @FieldName;
    END
    ELSE
    BEGIN
        INSERT INTO dp_Page_Fields (
            Page_ID, Field_Name, Group_Name, View_Order,
            Required, Hidden, Default_Value, Filter_Clause,
            Depends_On_Field, Field_Label, Writing_Assistant_Enabled
        )
        VALUES (
            @PageID, @FieldName, @GroupName, @ViewOrder,
            @Required, @Hidden, @DefaultValue, @FilterClause,
            @DependsOnField, @FieldLabel, @WritingAssistantEnabled
        );
    END

END
GO

-- =============================================
-- SP MetaData Install
-- =============================================
DECLARE @spName NVARCHAR(128) = 'api_MPNextTools_UpdatePageFieldOrder';
DECLARE @spDescription NVARCHAR(500) = 'Upserts a page field row by Page_ID + Field_Name';

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

GO

-- =============================================
-- FILE: api_dev_DeployTool.sql
-- =============================================

/****** Object:  StoredProcedure [dbo].[api_dev_DeployTool]    Script Date: 04/17/2026 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_dev_DeployTool]
GO

/****** Object:  StoredProcedure [dbo].[api_dev_DeployTool]    Script Date: 04/17/2026 ******/
-- =============================================
-- api_dev_DeployTool
-- =============================================
-- Description: Developer-only. Forward-deploys a tool by upserting dp_Tools,
--              mapping it to one or more pages in dp_Tool_Pages, and granting
--              access to one or more roles in dp_Role_Tools. The Administrators
--              role is always granted. Idempotent: re-running with the same
--              @ToolName updates the existing tool and adds any missing page
--              or role grants without duplicating rows.
-- Last Modified: 04/17/2026
-- Chris Kehayias
-- =============================================
CREATE PROCEDURE [dbo].[api_dev_DeployTool]
    @DomainID INT,
    @ToolName NVARCHAR(30),
    @LaunchPage NVARCHAR(1024),
    @Description NVARCHAR(100) = NULL,
    @LaunchWithCredentials BIT = 1,
    @LaunchWithParameters BIT = 1,
    @LaunchInNewTab BIT = 0,
    @ShowOnMobile BIT = 0,
    @PageIDs NVARCHAR(MAX) = NULL,        -- Comma-separated list of dp_Pages.Page_ID
    @AdditionalData NVARCHAR(65) = NULL,  -- Applied to each inserted dp_Tool_Pages row
    @RoleIDs NVARCHAR(MAX) = NULL         -- Comma-separated list of dp_Roles.Role_ID; Administrators auto-included
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================
    -- Validate required inputs
    -- =============================
    IF @ToolName IS NULL OR LTRIM(RTRIM(@ToolName)) = ''
    BEGIN
        RAISERROR('@ToolName is required.', 16, 1);
        RETURN;
    END

    IF @LaunchPage IS NULL OR LTRIM(RTRIM(@LaunchPage)) = ''
    BEGIN
        RAISERROR('@LaunchPage is required.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dp_Domains WHERE Domain_ID = @DomainID)
    BEGIN
        RAISERROR('Domain_ID %d not found in dp_Domains.', 16, 1, @DomainID);
        RETURN;
    END

    DECLARE @ToolID INT;

    -- =============================
    -- Upsert dp_Tools (Tool_Name is the natural key)
    -- =============================
    SELECT @ToolID = Tool_ID FROM dp_Tools WHERE Tool_Name = @ToolName;

    IF @ToolID IS NULL
    BEGIN
        INSERT INTO dp_Tools (
            Tool_Name,
            [Description],
            Launch_Page,
            Launch_with_Credentials,
            Launch_with_Parameters,
            Launch_in_New_Tab,
            Show_On_Mobile
        )
        VALUES (
            @ToolName,
            @Description,
            @LaunchPage,
            @LaunchWithCredentials,
            @LaunchWithParameters,
            @LaunchInNewTab,
            @ShowOnMobile
        );

        SET @ToolID = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dp_Tools
        SET [Description]            = @Description,
            Launch_Page              = @LaunchPage,
            Launch_with_Credentials  = @LaunchWithCredentials,
            Launch_with_Parameters   = @LaunchWithParameters,
            Launch_in_New_Tab        = @LaunchInNewTab,
            Show_On_Mobile           = @ShowOnMobile
        WHERE Tool_ID = @ToolID;
    END

    -- =============================
    -- Map tool to pages (skip duplicates, skip unknown Page_IDs)
    -- Uses XML-node split for compatibility with SQL Server versions older
    -- than 2016 (where STRING_SPLIT is unavailable). Safe for integer CSV.
    -- =============================
    IF @PageIDs IS NOT NULL AND LTRIM(RTRIM(@PageIDs)) <> ''
    BEGIN
        DECLARE @PageXml XML = CAST('<r>' + REPLACE(@PageIDs, ',', '</r><r>') + '</r>' AS XML);

        ;WITH PageList AS (
            SELECT DISTINCT TRY_CAST(LTRIM(RTRIM(T.c.value('.', 'NVARCHAR(50)'))) AS INT) AS Page_ID
            FROM @PageXml.nodes('/r') AS T(c)
            WHERE LTRIM(RTRIM(T.c.value('.', 'NVARCHAR(50)'))) <> ''
        )
        INSERT INTO dp_Tool_Pages (Tool_ID, Page_ID, Additional_Data)
        SELECT @ToolID, pl.Page_ID, @AdditionalData
        FROM PageList pl
        WHERE pl.Page_ID IS NOT NULL
          AND EXISTS (SELECT 1 FROM dp_Pages p WHERE p.Page_ID = pl.Page_ID)
          AND NOT EXISTS (
              SELECT 1 FROM dp_Tool_Pages tp
              WHERE tp.Tool_ID = @ToolID AND tp.Page_ID = pl.Page_ID
          );
    END

    -- =============================
    -- Grant tool to roles (Administrators always included)
    -- =============================
    DECLARE @AdminRoleID INT = (SELECT Role_ID FROM dp_Roles WHERE Role_Name = 'Administrators');
    DECLARE @RoleXml XML = CAST('<r>' + REPLACE(ISNULL(@RoleIDs, ''), ',', '</r><r>') + '</r>' AS XML);

    ;WITH RoleList AS (
        SELECT @AdminRoleID AS Role_ID WHERE @AdminRoleID IS NOT NULL
        UNION
        SELECT DISTINCT TRY_CAST(LTRIM(RTRIM(T.c.value('.', 'NVARCHAR(50)'))) AS INT) AS Role_ID
        FROM @RoleXml.nodes('/r') AS T(c)
        WHERE LTRIM(RTRIM(T.c.value('.', 'NVARCHAR(50)'))) <> ''
    )
    INSERT INTO dp_Role_Tools (Role_ID, Tool_ID, Domain_ID)
    SELECT rl.Role_ID, @ToolID, @DomainID
    FROM RoleList rl
    WHERE rl.Role_ID IS NOT NULL
      AND EXISTS (SELECT 1 FROM dp_Roles r WHERE r.Role_ID = rl.Role_ID)
      AND NOT EXISTS (
          SELECT 1 FROM dp_Role_Tools rt
          WHERE rt.Tool_ID = @ToolID
            AND rt.Role_ID  = rl.Role_ID
            AND rt.Domain_ID = @DomainID
      );

    -- =============================
    -- Return resulting state
    -- =============================
    SELECT
        t.Tool_ID,
        t.Tool_Name,
        t.[Description],
        t.Launch_Page,
        t.Launch_with_Credentials,
        t.Launch_with_Parameters,
        t.Launch_in_New_Tab,
        t.Show_On_Mobile
    FROM dp_Tools t
    WHERE t.Tool_ID = @ToolID;

    SELECT
        tp.Tool_Page_ID,
        tp.Tool_ID,
        tp.Page_ID,
        p.Display_Name AS Page_Name,
        tp.Additional_Data
    FROM dp_Tool_Pages tp
    LEFT JOIN dp_Pages p ON p.Page_ID = tp.Page_ID
    WHERE tp.Tool_ID = @ToolID
    ORDER BY tp.Page_ID;

    SELECT
        rt.Role_Tool_ID,
        rt.Tool_ID,
        rt.Role_ID,
        r.Role_Name,
        rt.Domain_ID
    FROM dp_Role_Tools rt
    LEFT JOIN dp_Roles r ON r.Role_ID = rt.Role_ID
    WHERE rt.Tool_ID = @ToolID
    ORDER BY rt.Role_ID;
END
GO

-- =============================================
-- SP MetaData Install
-- =============================================
DECLARE @spName NVARCHAR(128) = 'api_dev_DeployTool';
DECLARE @spDescription NVARCHAR(500) = 'Developer-only. Forward-deploys a tool: upserts dp_Tools, maps pages in dp_Tool_Pages, and grants roles in dp_Role_Tools (Administrators auto-included).';

IF NOT EXISTS (
    SELECT API_Procedure_ID FROM dp_API_Procedures WHERE Procedure_Name = @spName
)
BEGIN
    INSERT INTO dp_API_Procedures (Procedure_Name, Description)
    VALUES (@spName, @spDescription);
END

-- Ensure DeveloperONLY role exists
IF NOT EXISTS (
    SELECT Role_ID FROM dp_Roles WHERE Role_Name = 'DeveloperONLY'
)
BEGIN
    INSERT INTO dp_Roles (Role_Name, Description, Domain_ID)
    VALUES ('DeveloperONLY', 'Developer-only role for tools and procedures not intended for general use', 1);
END

-- Grant to DeveloperONLY Role
DECLARE @DevRoleID INT = (
    SELECT Role_ID FROM dp_Roles WHERE Role_Name = 'DeveloperONLY'
);

IF NOT EXISTS (
    SELECT 1
    FROM dp_Role_API_Procedures RP
    INNER JOIN dp_API_Procedures AP ON AP.API_Procedure_ID = RP.API_Procedure_ID
    WHERE AP.Procedure_Name = @spName AND RP.Role_ID = @DevRoleID
)
BEGIN
    INSERT INTO dp_Role_API_Procedures (Domain_ID, API_Procedure_ID, Role_ID)
    VALUES (
        1,
        (SELECT API_Procedure_ID FROM dp_API_Procedures WHERE Procedure_Name = @spName),
        @DevRoleID
    );
END
GO

GO

-- =============================================
-- FILE: api_dev_GetProcedureDefinition.sql
-- =============================================

/****** Object:  StoredProcedure [dbo].[api_dev_GetProcedureDefinition]    Script Date: 04/16/2026 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_dev_GetProcedureDefinition]
GO

/****** Object:  StoredProcedure [dbo].[api_dev_GetProcedureDefinition]    Script Date: 04/16/2026 ******/
-- =============================================
-- api_dev_GetProcedureDefinition
-- =============================================
-- Description: Returns the actual create SQL script for a stored procedure to enable LLM context
-- Last Modified: 04/16/2026
-- Chris Kehayias
-- =============================================
CREATE PROCEDURE [dbo].[api_dev_GetProcedureDefinition]
    @ProcedureName NVARCHAR(256),
    @SchemaName NVARCHAR(128) = 'dbo'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ObjectId INT;
    DECLARE @FullName NVARCHAR(512) = QUOTENAME(@SchemaName) + '.' + QUOTENAME(@ProcedureName);

    -- Resolve the object
    SET @ObjectId = OBJECT_ID(@FullName, 'P');

    IF @ObjectId IS NULL
    BEGIN
        -- Try finding it as a case-insensitive partial match
        SELECT TOP 10
            s.name AS [Schema],
            p.name AS [ProcedureName],
            p.create_date,
            p.modify_date
        FROM sys.procedures p
        JOIN sys.schemas s ON p.schema_id = s.schema_id
        WHERE p.name LIKE '%' + @ProcedureName + '%'
        ORDER BY p.name;

        RAISERROR('Procedure [%s].[%s] not found. Possible matches returned above.', 16, 1, @SchemaName, @ProcedureName);
        RETURN;
    END

    -- Return the full definition
    SELECT
        s.name                          AS [Schema],
        p.name                          AS [ProcedureName],
        p.create_date                   AS [Created],
        p.modify_date                   AS [LastModified],
        LEN(m.definition)               AS [DefinitionLength],
        m.definition                    AS [Definition]
    FROM sys.sql_modules m
    JOIN sys.procedures p ON m.object_id = p.object_id
    JOIN sys.schemas s ON p.schema_id = s.schema_id
    WHERE m.object_id = @ObjectId;

    -- Also return parameter metadata so the LLM understands the interface
    SELECT
        par.name                        AS [ParameterName],
        TYPE_NAME(par.user_type_id)     AS [DataType],
        par.max_length                  AS [MaxLength],
        par.precision                   AS [Precision],
        par.scale                       AS [Scale],
        par.is_output                   AS [IsOutput],
        par.has_default_value           AS [HasDefault],
        par.default_value               AS [DefaultValue],
        par.parameter_id                AS [OrdinalPosition]
    FROM sys.parameters par
    WHERE par.object_id = @ObjectId
    ORDER BY par.parameter_id;
END
GO

-- =============================================
-- SP MetaData Install
-- =============================================
DECLARE @spName NVARCHAR(128) = 'api_dev_GetProcedureDefinition';
DECLARE @spDescription NVARCHAR(500) = 'Returns the actual create SQL script for a stored procedure to enable LLM context';

IF NOT EXISTS (
    SELECT API_Procedure_ID FROM dp_API_Procedures WHERE Procedure_Name = @spName
)
BEGIN
    INSERT INTO dp_API_Procedures (Procedure_Name, Description)
    VALUES (@spName, @spDescription);
END

-- Ensure DeveloperONLY role exists
IF NOT EXISTS (
    SELECT Role_ID FROM dp_Roles WHERE Role_Name = 'DeveloperONLY'
)
BEGIN
    INSERT INTO dp_Roles (Role_Name, Description, Domain_ID)
    VALUES ('DeveloperONLY', 'Developer-only role for tools and procedures not intended for general use', 1);
END

-- Grant to DeveloperONLY Role
DECLARE @DevRoleID INT = (
    SELECT Role_ID FROM dp_Roles WHERE Role_Name = 'DeveloperONLY'
);

IF NOT EXISTS (
    SELECT 1
    FROM dp_Role_API_Procedures RP
    INNER JOIN dp_API_Procedures AP ON AP.API_Procedure_ID = RP.API_Procedure_ID
    WHERE AP.Procedure_Name = @spName AND RP.Role_ID = @DevRoleID
)
BEGIN
    INSERT INTO dp_Role_API_Procedures (Domain_ID, API_Procedure_ID, Role_ID)
    VALUES (
        1,
        (SELECT API_Procedure_ID FROM dp_API_Procedures WHERE Procedure_Name = @spName),
        @DevRoleID
    );
END
GO

GO

-- =============================================
-- FILE: contact_private_notes.sql
-- =============================================

-- ========================================================================================
--      Setup Contact Private Notes
-- ========================================================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Contact_Private_Notes]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Contact_Private_Notes](
	[Contact_Private_Note_ID] [int] IDENTITY(1,1) NOT NULL,
	[Domain_ID] [int] NOT NULL,
	[User_ID] [int] NOT NULL,
	[Contact_ID] [int] NULL,
	[Notes] [nvarchar](2000) NOT NULL,
	[Start_Date] [datetime] NOT NULL,
 CONSTRAINT [PK_Contact_Private_Notes] PRIMARY KEY CLUSTERED
(
	[Contact_Private_Note_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
END
GO
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DF_Contact_Private_Notes_Start_Date]') AND type = 'D')
BEGIN
ALTER TABLE [dbo].[Contact_Private_Notes] ADD  CONSTRAINT [DF_Contact_Private_Notes_Start_Date]  DEFAULT (getdate()) FOR [Start_Date]
END
GO
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_Contact_Private_Notes_Contacts]') AND parent_object_id = OBJECT_ID(N'[dbo].[Contact_Private_Notes]'))
ALTER TABLE [dbo].[Contact_Private_Notes]  WITH CHECK ADD  CONSTRAINT [FK_Contact_Private_Notes_Contacts] FOREIGN KEY([Contact_ID])
REFERENCES [dbo].[Contacts] ([Contact_ID])
GO
IF  EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_Contact_Private_Notes_Contacts]') AND parent_object_id = OBJECT_ID(N'[dbo].[Contact_Private_Notes]'))
ALTER TABLE [dbo].[Contact_Private_Notes] CHECK CONSTRAINT [FK_Contact_Private_Notes_Contacts]
GO
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_Contact_Private_Notes_dp_Users]') AND parent_object_id = OBJECT_ID(N'[dbo].[Contact_Private_Notes]'))
ALTER TABLE [dbo].[Contact_Private_Notes]  WITH CHECK ADD  CONSTRAINT [FK_Contact_Private_Notes_dp_Users] FOREIGN KEY([User_ID])
REFERENCES [dbo].[dp_Users] ([User_ID])
GO
IF  EXISTS (SELECT * FROM sys.foreign_keys WHERE object_id = OBJECT_ID(N'[dbo].[FK_Contact_Private_Notes_dp_Users]') AND parent_object_id = OBJECT_ID(N'[dbo].[Contact_Private_Notes]'))
ALTER TABLE [dbo].[Contact_Private_Notes] CHECK CONSTRAINT [FK_Contact_Private_Notes_dp_Users]
GO

-- ========================================================================================
--      Add Indexes on Foreign Key Columns
-- ========================================================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Contact_Private_Notes_User_ID' AND object_id = OBJECT_ID(N'[dbo].[Contact_Private_Notes]'))
CREATE NONCLUSTERED INDEX [IX_Contact_Private_Notes_User_ID] ON [dbo].[Contact_Private_Notes]([User_ID] ASC)
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Contact_Private_Notes_Contact_ID' AND object_id = OBJECT_ID(N'[dbo].[Contact_Private_Notes]'))
CREATE NONCLUSTERED INDEX [IX_Contact_Private_Notes_Contact_ID] ON [dbo].[Contact_Private_Notes]([Contact_ID] ASC)
GO
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Contact_Private_Notes_Domain_ID' AND object_id = OBJECT_ID(N'[dbo].[Contact_Private_Notes]'))
CREATE NONCLUSTERED INDEX [IX_Contact_Private_Notes_Domain_ID] ON [dbo].[Contact_Private_Notes]([Domain_ID] ASC)
GO

-- ========================================================================================
--      Add the Page / Page Section Page / Admin Security Role
-- ========================================================================================
    IF NOT EXISTS (SELECT * FROM dp_Pages WHERE Table_Name = 'Contact_Private_Notes')
    BEGIN
		-- ========================================================================================
		--      Add Page
		-- ========================================================================================
		INSERT INTO [dp_Pages] ([Display_Name],[Singular_Name],[Image_Name],[Description],[View_Order],[Table_Name],[Primary_Key],[Default_Field_List],[Selected_Record_Expression],[Filtering_Options],[Filter_Clause],[Default_View],[Pick_List_View],[Special_Fields],[Contact_ID_Field],[Global_Filter_ID_Field],[Start_Date_Field],[End_Date_Field],[Date_Pivot_Field],[Record_Options],[Suppress_New_Button],[Display_Copy],[Append_On_Copy],[Direct_Delete_Only],[Advanced_Options],[In_Global_Search],[Custom_Form_Name],[System_Name],[Display_Search],[Image_Reference_Field],[Facts_View_ID],[Calendar_Type_Field],[Files_Publicly_Accessible])
		VALUES('Contact Private Notes','Contact Private Note',NULL,'Storage for Private Notes',10,'Contact_Private_Notes','Contact_Private_Note_ID','Contact_Private_Note_ID','Contact_Private_Note_ID',NULL,NULL,NULL,NULL,NULL,'Contact_ID',NULL,NULL,NULL,NULL,NULL,1,0,NULL,1,NULL,0,NULL,NULL,NULL,NULL,NULL,NULL,1)

		-- ========================================================================================
		--      Add Page Section
		-- ========================================================================================
		INSERT INTO [dp_Page_Section_Pages] ([Page_ID],[Page_Section_ID],[User_ID])
		VALUES
		(
			(SELECT Page_ID FROM dp_Pages WHERE Table_Name='Contact_Private_Notes')
			,(SELECT Page_Section_ID FROM dp_Page_Sections WHERE Page_Section='Administration')
			,NULL
		)
	END


-- ========================================================================================
--      Add the Page / SubPage Security for Administrators Role
-- ========================================================================================

IF NOT EXISTS (SELECT * FROM dp_Role_Pages WHERE Page_ID = (SELECT Page_ID FROM dp_Pages WHERE Table_Name='Contact_Private_Notes'))
BEGIN
	DECLARE @adminRoleID INT = (SELECT Role_ID FROM dp_Roles WHERE Role_Name='Administrators')

	INSERT INTO dp_Role_Pages (Role_ID,Page_ID,Access_Level)
	VALUES (@adminRoleID,(SELECT TOP 1 Page_ID FROM dp_Pages WHERE Table_Name='Contact_Private_Notes'),3)
END

GO

PRINT 'Ministry Platform database installation completed successfully.'
GO
