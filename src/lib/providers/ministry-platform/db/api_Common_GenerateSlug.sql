/****** Object:  StoredProcedure [dbo].[api_Common_GenerateSlug]    Script Date: 9/24/2025 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_Common_GenerateSlug]
GO

/****** Object:  StoredProcedure [dbo].[api_Common_GenerateSlug]    Script Date: 9/24/2025 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

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
