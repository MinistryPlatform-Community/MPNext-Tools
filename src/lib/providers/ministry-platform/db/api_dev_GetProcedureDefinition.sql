/****** Object:  StoredProcedure [dbo].[api_dev_GetProcedureDefinition]    Script Date: 04/16/2026 ******/
DROP PROCEDURE IF EXISTS [dbo].[api_dev_GetProcedureDefinition]
GO

/****** Object:  StoredProcedure [dbo].[api_dev_GetProcedureDefinition]    Script Date: 04/16/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

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
