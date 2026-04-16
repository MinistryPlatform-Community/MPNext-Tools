-- =============================================
-- Ministry Platform Database Install Script
-- Generated: 2026-04-16T01:09:01.359Z
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
