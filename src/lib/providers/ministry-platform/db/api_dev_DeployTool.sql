/****** Object:  StoredProcedure [dbo].[api_dev_DeployTool]    Script Date: 04/17/2026 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_dev_DeployTool]
GO

/****** Object:  StoredProcedure [dbo].[api_dev_DeployTool]    Script Date: 04/17/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

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
