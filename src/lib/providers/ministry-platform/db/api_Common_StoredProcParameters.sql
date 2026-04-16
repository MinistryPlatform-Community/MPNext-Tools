/****** Object:  StoredProcedure [dbo].[api_Common_StoredProcParameters]    Script Date: 9/24/2025 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_Common_StoredProcParameters]
GO

/****** Object:  StoredProcedure [dbo].[api_Common_StoredProcParameters]    Script Date: 9/24/2025 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

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
