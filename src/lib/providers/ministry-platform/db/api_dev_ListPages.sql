/****** Object:  StoredProcedure [dbo].[api_dev_ListPages]    Script Date: 04/17/2026 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_dev_ListPages]
GO

/****** Object:  StoredProcedure [dbo].[api_dev_ListPages]    Script Date: 04/17/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- api_dev_ListPages
-- =============================================
-- Description: Developer-only. Lists dp_Pages (Page_ID, Display_Name) for the
--              Deploy Tool picker. Optional case-insensitive @Search filter on
--              Display_Name or Table_Name. Capped at 100 rows ordered by Display_Name.
-- Last Modified: 04/17/2026
-- Chris Kehayias
-- =============================================
CREATE PROCEDURE [dbo].[api_dev_ListPages]
    @DomainID INT,
    @Search NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Term NVARCHAR(256) = NULLIF(LTRIM(RTRIM(ISNULL(@Search, ''))), '');

    SELECT TOP (100)
        p.Page_ID,
        p.Display_Name
    FROM dp_Pages p
    WHERE (@Term IS NULL OR p.Display_Name LIKE '%' + @Term + '%' OR p.Table_Name LIKE '%' + @Term + '%')
    ORDER BY p.Display_Name;
END
GO

-- =============================================
-- SP MetaData Install
-- =============================================
DECLARE @spName NVARCHAR(128) = 'api_dev_ListPages';
DECLARE @spDescription NVARCHAR(500) = 'Developer-only. Lists dp_Pages (Page_ID, Display_Name) with optional search on Display_Name or Table_Name — used by the Deploy Tool picker.';

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
