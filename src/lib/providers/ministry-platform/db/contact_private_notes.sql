-- ========================================================================================
--      Setup Contact Private Notes
-- ========================================================================================
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
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
