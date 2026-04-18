---
title: Ministry Platform Schema — Tables
domain: mp-schema
type: generated-reference
last_verified: 2026-04-17
source: npm run mp:generate:models
---

## Purpose
Auto-generated catalog of Ministry Platform tables, primary keys, and foreign key relationships. Regenerate with `npm run mp:generate:models` (runs `src/lib/providers/ministry-platform/scripts/generate-types.ts` with `--clean --zod`, emitting to `src/lib/providers/ministry-platform/models/`).

## Generated metadata

**Generated (source):** 2026-04-16T02:07:32.640Z | **Tables:** 301

**Type files:** `src/lib/providers/ministry-platform/models/{PascalCaseTableName}.ts` and `{PascalCaseTableName}Schema.ts`
**Access:** R=Read, RW=ReadWrite, RWAD=ReadWriteAssignDelete

---

### _Deployments [R] [None]
PK: `Deployment_ID`

### Account_Types [R] [None]
PK: `Account_Type_ID`

### Accounting_Companies [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Accounting_Company_ID` | FK: Company_Contact_ID→Contacts, Default_Congregation→Congregations, Pledge_Campaign_ID→Pledge_Campaigns, Alternate_Pledge_Campaign→Pledge_Campaigns, Statement_Cutoff_Automation_ID→Statement_Cutoff_Automation, Standard_Statement→dp_Reports

### Activity_Log [RW] [DataExport]
PK: `Activity_Log_ID` | FK: Contact_ID→Contacts, Household_ID→Households, Page_ID→dp_Pages, Congregation_ID→Congregations, Ministry_ID→Ministries

### Activity_Log_Staging [R] [None]
PK: `Activity_Log_Staging_ID`

### Addresses [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Address_ID`

### Alternate_Email_Types [RWAD] [None]
PK: `Alternate_Email_Type_ID`

### Alternate_Emails [RWAD] [None]
PK: `Alternate_Email_ID` | FK: Contact_ID→Contacts, Alternate_Email_Type_ID→Alternate_Email_Types

### Assignment_Roles [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Assignment_Role_ID`

### Attribute_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Attribute_Type_ID`

### Attributes [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Attribute_ID` | FK: Attribute_Type_ID→Attribute_Types

### Audience_Audience_Filters [RWAD] [None]
PK: `Audience_Audience_Filter_ID` | FK: Audience_ID→Audiences, Filter_ID→Audience_Filters, Operator_ID→Audience_Operators

### Audience_Filters [RWAD] [None]
PK: `Filter_ID`

### Audience_Members [RWAD] [None]
PK: `Audience_Member_ID` | FK: Audience_ID→Audiences, Contact_ID→Contacts

### Audience_Members_Staging [R] [None]
PK: `Contact_Id`

### Audience_Operators [RWAD] [None]
PK: `Operator_ID`

### Audiences [RWAD] [None]
PK: `Audience_ID`

### Background_Check_Statuses [R] [None]
PK: `Background_Check_Status_ID`

### Background_Check_Types [RWAD] [None]
PK: `Background_Check_Type_ID`

### Background_Checks [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Background_Check_ID` | FK: Contact_ID→Contacts, Requesting_Ministry→Ministries, Background_Check_Type_ID→Background_Check_Types, Background_Check_Status_ID→Background_Check_Statuses

### Banks [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Bank_ID` | FK: Accounting_Company_ID→Accounting_Companies, Address_ID→Addresses

### Batch_Entry_Types [R] [None]
PK: `Batch_Entry_Type_ID`

### Batch_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Batch_Type_ID`

### Batch_Usage_Types [RWAD] [None]
PK: `Batch_Usage_Type_ID`

### Batches [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Batch_ID` | FK: Batch_Entry_Type_ID→Batch_Entry_Types, Batch_Type_ID→Batch_Types, Default_Program→Programs, Source_Event→Events, Deposit_ID→Deposits, Congregation_ID→Congregations, Default_Payment_Type→Payment_Types, Operator_User→dp_Users, Batch_Usage_Type_ID→Batch_Usage_Types, Pledge_Campaign_ID→Pledge_Campaigns

### Beneficiary_Relationships [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Beneficiary_Relationship_ID`

### Benefit_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Benefit_Type_ID`

### Book_Checkouts [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Book_Checkout_ID` | FK: Book_Checkout_ID→Book_Checkouts, Book_ID→Books, Contact_ID→Contacts

### Books [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Book_ID` | FK: Genre_ID→Genres

### Buildings [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Building_ID` | FK: Location_ID→Locations, Building_Coordinator→Contacts

### Campaign_Goals [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Campaign_Goal_ID` | FK: Campaign_ID→Pledge_Campaigns, Congregation_ID→Congregations

### Care_Case_Types [RWAD] [None]
PK: `Care_Case_Type_ID`

### Care_Cases [RWAD] [None]
PK: `Care_Case_ID` | FK: Household_ID→Households, Contact_ID→Contacts, Care_Case_Type_ID→Care_Case_Types, Location_ID→Locations, Case_Manager→dp_Users, Program_ID→Programs, Congregation_ID→Congregations

### Care_Outcomes [R] [None]
PK: `Care_Outcome_ID`

### Care_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Care_Type_ID` | FK: User_ID→dp_Users

### Certification_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Certification_Type_ID`

### Chart_Colors [RWAD] [None]
PK: `Chart_Color_ID`

### Checkin_Search_Results_Types [R] [None]
PK: `Checkin_Search_Results_Type_ID`

### Church_Associations [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Church_Association_ID` | FK: Address_ID→Addresses

### Citizenship_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Citizenship_Type_ID`

### Congregation_Audits [RWAD] [None]
PK: `Congregation_Audit_ID` | FK: Household_ID→Households, Prior_Congregation→Congregations, New_Congregation→Congregations

### Congregations [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Congregation_ID` | FK: Accounting_Company_ID→Accounting_Companies, Location_ID→Locations, Contact_ID→Contacts, Pastor→dp_Users, Plan_A_Visit_Template→dp_Communication_Templates, Plan_A_Visit_User→dp_Users, Sacrament_Place_ID→Sacrament_Places, App_ID→Pocket_Platform_Apps

### Contact_Attributes [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Contact_Attribute_ID` | FK: Contact_ID→Contacts, Attribute_ID→Attributes

### Contact_Households [RWAD] [None]
PK: `Contact_Household_ID` | FK: Contact_ID→Contacts, Household_ID→Households, Household_Position_ID→Household_Positions, Household_Type_ID→Household_Types

### Contact_Identifier_Log [RWAD] [None]
PK: `Contact_Identifier_ID` | FK: Contact_ID→Contacts

### Contact_Log [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Contact_Log_ID` | FK: Contact_ID→Contacts, Contact_Log_Type_ID→Contact_Log_Types, Made_By→dp_Users, Planned_Contact_ID→Planned_Contacts, Original_Contact_Log_Entry→Contact_Log, Feedback_Entry_ID→Feedback_Entries

### Contact_Log_Types [R] [None]
PK: `Contact_Log_Type_ID`

### Contact_Private_Notes [RWAD] [None]
PK: `Contact_Private_Note_ID` | FK: User_ID→dp_Users, Contact_ID→Contacts

### Contact_Relationships [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Contact_Relationship_ID` | FK: Contact_ID→Contacts, Relationship_ID→Relationships, Related_Contact_ID→Contacts

### Contact_Staging [RWAD] [DataExport]
PK: `Contact_Staging_ID` | FK: Existing_Contact_Record→Contacts, Prefix_ID→Prefixes, Suffix_ID→Suffixes, Gender_ID→Genders, Marital_Status_ID→Marital_Statuses, Contact_Status_ID→Contact_Statuses, Existing_Household_Record→Households, Household_Position_ID→Household_Positions, Participant_Type_ID→Participant_Types, Congregation_ID→Congregations

### Contact_Statuses [R] [None]
PK: `Contact_Status_ID`

### Contacts [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Contact_ID` | FK: Prefix_ID→Prefixes, Suffix_ID→Suffixes, Gender_ID→Genders, Marital_Status_ID→Marital_Statuses, Contact_Status_ID→Contact_Statuses, Household_ID→Households, Household_Position_ID→Household_Positions, Participant_Record→Participants, Donor_Record→Donors, Industry_ID→Industries, Occupation_ID→Occupations, User_Account→dp_Users, Primary_Language_ID→Primary_Languages, Faith_Background_ID→Faith_Backgrounds, Texting_Opt_In_Type_ID→Texting_Opt_In_Types

### Continents [R] [None]
PK: `Continent_ID`

### Contribution_Statement_Donors [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Statement_Donor_ID` | FK: Statement_ID→Contribution_Statements, Donor_ID→Donors

### Contribution_Statements [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Statement_ID` | FK: Accounting_Company_ID→Accounting_Companies, Household_ID→Households, Statement_Type_ID→Statement_Types, Contact_Record→Contacts, Spouse_Record→Contacts, Archived_Campaign→Pledge_Campaigns, Alternate_Archived_Campaign→Pledge_Campaigns

### Countries [R] [None]
PK: `Country_ID` | FK: Continent_ID→Continents

### Currencies [R] [None]
PK: `Currency_ID`

### Custom_Widget_DS [RWAD] [DataExport]
PK: `Custom_Widget_DS_ID`

### Date_Accuracies [R] [None]
PK: `Date_Accuracy_ID`

### Deposits [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Deposit_ID` | FK: Congregation_ID→Congregations

### Donation_Distributions [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Donation_Distribution_ID` | FK: Donation_ID→Donations, Program_ID→Programs, Pledge_ID→Pledges, Target_Event→Events, Soft_Credit_Donor→Donors, Donation_Source_ID→Donation_Sources, Projected_Gift_Frequency→Frequencies, Soft_Credit_Statement_ID→Contribution_Statements

### Donation_Frequencies [R] [None]
PK: `Donation_Frequency_ID`

### Donation_Levels [R] [None]
PK: `Donation_Level_ID`

### Donation_Sources [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Donation_Source_ID` | FK: Campaign_ID→Pledge_Campaigns

### Donations [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Donation_ID` | FK: Donor_ID→Donors, Payment_Type_ID→Payment_Types, Batch_ID→Batches, Donor_Account_ID→Donor_Accounts, Statement_ID→Contribution_Statements

### Donor_Accounts [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Donor_Account_ID` | FK: Donor_ID→Donors, Account_Type_ID→Account_Types, Bank_ID→Banks

### Donors [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Donor_ID` | FK: Contact_ID→Contacts, Statement_Frequency_ID→Statement_Frequencies, Statement_Type_ID→Statement_Types, Statement_Method_ID→Statement_Methods, Always_Soft_Credit→Donors, Always_Pledge_Credit→Donors, Donation_Frequency_ID→Donation_Frequencies, Donation_Level_ID→Donation_Levels

### dp_Account_Information [RWAD] [None]
PK: `Account_Information_ID` | FK: Congregation_ID→Congregations, Integration_Definition_Type_ID→dp_Integration_Definition_Types

### dp_API_Clients [RWAD] [FileAttach, DataExport]
PK: `API_Client_ID` | FK: Client_User_ID→dp_Users, Authentication_Flow_ID→dp_Authentication_Flows

### dp_Application_Labels [RWAD] [FileAttach, DataExport]
PK: `Application_Label_ID` | FK: API_Client_ID→dp_API_Clients

### dp_Audit_Retention_Messages [RWAD] [DataExport]
PK: `Audit_Retention_Message_ID` | FK: _Audit_Retention_Policy_ID→dp_Audit_Retention_Policies

### dp_Audit_Retention_Policies [RWAD] [FileAttach, DataExport]
PK: `Audit_Retention_Policy_ID` | FK: Retention_Type_ID→dp_Audit_Retention_Types, Audit_Type_ID→dp_Audit_Types

### dp_Authentication_Log [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Authentication_ID`

### dp_Bookmarks [RWAD] [FileAttach, DataExport]
PK: `Bookmark_ID`

### dp_Communication_Messages [RWAssign] [DataExport]
PK: `Communication_Message_ID` | FK: Communication_ID→dp_Communications, Action_Status_ID→dp_Communication_Action_Statuses, Contact_ID→Contacts

### dp_Communication_Publications [RWAD] [FileAttach, DataExport]
PK: `Communication_Publication_ID` | FK: Communication_ID→dp_Communications, Publication_ID→dp_Publications

### dp_Communication_Snippets [RWAD] [FileAttach, DataExport]
PK: `Communication_Snippet_ID` | FK: Pertains_To→dp_Pages

### dp_Communication_Templates [RWAD] [FileAttach, DataExport]
PK: `Communication_Template_ID` | FK: Pertains_To_Page_ID→dp_Pages, Template_User→dp_Users, Template_User_Group→dp_User_Groups, From_Contact→Contacts, Reply_to_Contact→Contacts, Communication_Type_ID→dp_Communication_Types

### dp_Communication_Types [R] [None]
PK: `Communication_Type_ID`

### dp_Communications [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Communication_ID` | FK: Author_User_ID→dp_Users, Communication_Type_ID→dp_Communication_Types, Communication_Status_ID→dp_Communication_Statuses, Selection_ID→dp_Selections, Pertains_To_Page_ID→dp_Pages, To_Contact→Contacts, From_SMS_Number→dp_SMS_Numbers, From_Contact→Contacts, Reply_to_Contact→Contacts, Template_User→dp_Users, Template_User_Group→dp_User_Groups, Alternate_Email_Type_ID→Alternate_Email_Types, Publication_ID→dp_Publications

### dp_Configuration_Lists [RW] [DataExport]
PK: `Configuration_List_ID`

### dp_Configuration_Settings [RW] [DataExport]
PK: `Configuration_Setting_ID` | FK: Primary_Key_Page_ID→dp_Pages

### dp_Contact_Publications [RWAD] [FileAttach, DataExport]
PK: `Contact_Publication_ID` | FK: Contact_ID→Contacts, Publication_ID→dp_Publications

### dp_Export_Log [RWAD] [FileAttach, DataExport]
PK: `Export_ID` | FK: User_ID→dp_Users

### dp_Field_Format_Types [RWAD] [FileAttach, DataExport]
PK: `Field_Format_Type_ID`

### dp_Identity_Providers [RWAD] [FileAttach, DataExport]
PK: `Identity_Provider_ID` | FK: Identity_Provider_Type_ID→dp_Identity_Provider_Types

### dp_Impersonate_Contacts [RWAD] [None]
PK: `Impersonate_Contact_ID` | FK: User_ID→dp_Users, Contact_ID→Contacts

### dp_Inbound_SMS [RWAD] [FileAttach, DataExport]
PK: `Inbound_SMS_ID` | FK: Contact_ID→Contacts, Last_Message_ID→dp_Communication_Messages

### dp_Integration_Definition_Types [RWAD] [None]
PK: `Integration_Definition_Type_ID`

### dp_Notification_Page_Records [RWAD] [FileAttach, DataExport]
PK: `Notification_Record_ID` | FK: Notification_ID→dp_Notifications, Page_ID→dp_Pages

### dp_Notification_Page_Views [RWAD] [FileAttach, DataExport]
PK: `Notification_Page_View_ID` | FK: Notification_ID→dp_Notifications, Page_View_ID→dp_Page_Views

### dp_Notification_Selections [RWAD] [FileAttach, DataExport]
PK: `Notification_Selection_ID` | FK: Notification_ID→dp_Notifications, Selection_ID→dp_Selections

### dp_Notification_Sub_Page_Views [RWAD] [FileAttach, DataExport]
PK: `Notification_Sub_Page_View_ID` | FK: Notification_ID→dp_Notifications, Sub_Page_View_ID→dp_Sub_Page_Views

### dp_Notifications [RWAD] [FileAttach, DataExport]
PK: `Notification_ID` | FK: User_ID→dp_Users, Template_ID→dp_Communication_Templates, User_Group_ID→dp_User_Groups

### dp_Page_Views [RWAD] [None]
PK: `Page_View_ID` | FK: Page_ID→dp_Pages, User_ID→dp_Users, User_Group_ID→dp_User_Groups

### dp_Process_Steps [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Process_Step_ID` | FK: Process_Step_Type_ID→dp_Process_Step_Types, Process_ID→dp_Processes, Specific_User→dp_Users, Escalate_to_Step→dp_Process_Steps, Email_Template→dp_Communication_Templates, To_Specific_Contact→Contacts, Webhook_ID→dp_Webhooks, Text_Template→dp_Communication_Templates, Specific_User_Group_ID→dp_User_Groups, Completion_Rule_ID→dp_Completion_Rules

### dp_Process_Submissions [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Process_Submission_ID` | FK: Submitted_By→dp_Users, Process_ID→dp_Processes, Process_Submission_Status_ID→dp_Process_Submission_Statuses

### dp_Processes [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Process_ID` | FK: Process_Manager→dp_Users

### dp_Publications [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Publication_ID` | FK: Congregation_ID→Congregations, Moderator→dp_Users

### dp_Record_Insights [RWAD] [FileAttach, DataExport]
PK: `Record_Insight_ID` | FK: Page_ID→dp_Pages, Sub_Page_View_ID→dp_Sub_Page_Views

### dp_Record_Security [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Record_Security_ID`

### dp_Role_Reports [RWAD] [DataExport]
PK: `Role_Report_ID` | FK: Role_ID→dp_Roles, Report_ID→dp_Reports

### dp_Roles [RWAssign] [FileAttach, DataExport, SecureRecord]
PK: `Role_ID` | FK: Role_Type_ID→dp_Role_Types

### dp_Secure_Configuration_Settings [RWAD] [None]
PK: `Secure_Configuration_Setting_ID`

### dp_SMS_Numbers [RWAD] [FileAttach, DataExport]
PK: `SMS_Number_ID` | FK: User_Group_ID→dp_User_Groups, Congregation_ID→Congregations, Texting_Compliance_Level→Texting_Compliance_Levels

### dp_Sub_Page_Views [RWAD] [None]
PK: `Sub_Page_View_ID` | FK: Sub_Page_ID→dp_Sub_Pages, User_ID→dp_Users

### dp_Tasks [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Task_ID` | FK: Author_User_ID→dp_Users, Assigned_User_ID→dp_Users, _Process_Submission_ID→dp_Process_Submissions, Assigned_User_Group_ID→dp_User_Groups, Completion_Rule_ID→dp_Completion_Rules

### dp_User_Charts [RWAD] [None]
PK: `User_Chart_ID` | FK: Chart_ID→dp_Charts, User_ID→dp_Users, Chart_Type_ID→dp_Chart_Types

### dp_User_Global_Filters [RWAD] [None]
PK: `dp_User_Global_Filter_ID` | FK: User_ID→dp_Users

### dp_User_Groups [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `User_Group_ID` | FK: Moderator→dp_Users

### dp_User_Preferences [RWAD] [None]
PK: `User_Preference_ID` | FK: User_ID→dp_Users, Page_ID→dp_Pages, Sub_Page_ID→dp_Sub_Pages

### dp_User_Roles [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `User_Role_ID` | FK: User_ID→dp_Users, Role_ID→dp_Roles

### dp_User_User_Groups [RWAD] [DataExport]
PK: `User_User_Group_ID` | FK: User_ID→dp_Users, User_Group_ID→dp_User_Groups

### dp_Users [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `User_ID` | FK: Contact_ID→Contacts, Supervisor→dp_Users

### dp_View_Keys [RWAD] [FileAttach, DataExport]
PK: `View_Key_ID`

### dp_Webhook_Invocations [RWAD] [FileAttach, DataExport]
PK: `Webhook_Invocation_ID` | FK: Webhook_ID→dp_Webhooks, Status_ID→dp_Webhook_Invocation_Statuses, Task_ID→dp_Tasks

### dp_Webhooks [RWAD] [FileAttach, DataExport]
PK: `Webhook_ID`

### Equipment [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Equipment_ID` | FK: Equipment_Type_ID→Equipment_Types, Room_ID→Rooms, Equipment_Coordinator→dp_Users

### Equipment_Types [R] [None]
PK: `Equipment_Type_ID`

### Event_Equipment [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Event_Equipment_ID` | FK: Event_ID→Events, Equipment_ID→Equipment, Room_ID→Rooms

### Event_Groups [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Event_Group_ID` | FK: Event_ID→Events, Group_ID→Groups, Room_ID→Rooms, Curriculum_ID→Pocket_Platform_Curriculum

### Event_Metrics [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Event_Metric_ID` | FK: Event_ID→Events, Metric_ID→Metrics, Group_ID→Groups

### Event_Participants [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Event_Participant_ID` | FK: Event_ID→Events, Participant_ID→Participants, Participation_Status_ID→Participation_Statuses, Group_Participant_ID→Group_Participants, Group_ID→Groups, Room_ID→Rooms, Group_Role_ID→Group_Roles, Response_ID→Responses, RSVP_Status_ID→RSVP_Statuses

### Event_Rooms [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Event_Room_ID` | FK: Event_ID→Events, Room_ID→Rooms, Group_ID→Groups, Room_Layout_ID→Room_Layouts

### Event_Services [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Event_Service_ID` | FK: Event_ID→Events, Service_ID→Servicing

### Event_Types [RWAD] [None]
PK: `Event_Type_ID`

### Events [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Event_ID` | FK: Event_Type_ID→Event_Types, Congregation_ID→Congregations, Location_ID→Locations, Program_ID→Programs, Primary_Contact→Contacts, Visibility_Level_ID→Visibility_Levels, Online_Registration_Product→Products, Registration_Form→Forms, Search_Results→Checkin_Search_Results_Types, Registrant_Message→dp_Communication_Templates, Optional_Reminder_Message→dp_Communication_Templates, Attendee_Message→dp_Communication_Templates, Parent_Event_ID→Events, Priority_ID→Priorities

### Faith_Backgrounds [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Faith_Background_ID`

### Feedback_Entries [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Feedback_Entry_ID` | FK: Contact_ID→Contacts, Feedback_Type_ID→Feedback_Types, Program_ID→Programs, Visibility_Level_ID→Visibility_Levels, Assigned_To→Contacts, Care_Outcome_ID→Care_Outcomes, Care_Case_ID→Care_Cases

### Feedback_Types [R] [None]
PK: `Feedback_Type_ID`

### Follow_Up_Action_Types [R] [None]
PK: `Action_Type_ID`

### Form_Field_Types [R] [None]
PK: `Form_Field_Type_ID`

### Form_Fields [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Form_Field_ID` | FK: Field_Type_ID→Form_Field_Types, Form_ID→Forms, Depends_On→Form_Fields

### Form_Response_Answers [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Form_Response_Answer_ID` | FK: Form_Field_ID→Form_Fields, Form_Response_ID→Form_Responses, Event_Participant_ID→Event_Participants, Pledge_ID→Pledges, Opportunity_Response→Responses

### Form_Responses [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Form_Response_ID` | FK: Form_ID→Forms, Contact_ID→Contacts, Event_ID→Events, Pledge_Campaign_ID→Pledge_Campaigns, Opportunity_ID→Opportunities, Opportunity_Response→Responses, Congregation_ID→Congregations, Event_Participant_ID→Event_Participants

### Forms [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Form_ID` | FK: Congregation_ID→Congregations, Primary_Contact→Contacts, Response_Message→dp_Communication_Templates

### Frequencies [RWAD] [None]
PK: `Frequency_ID`

### Genders [R] [None]
PK: `Gender_ID`

### Genres [R] [None]
PK: `Genre_ID`

### Group_Activities [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Group_Activity_ID`

### Group_Attributes [RWAD] [None]
PK: `Group_Attribute_ID` | FK: Attribute_ID→Attributes, Group_ID→Groups

### Group_Ended_Reasons [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Group_Ended_Reason_ID`

### Group_Focuses [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Group_Focus_ID`

### Group_Inquiries [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Group_Inquiry_ID` | FK: Group_ID→Groups, Contact_ID→Contacts

### Group_Participants [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Group_Participant_ID` | FK: Group_ID→Groups, Participant_ID→Participants, Group_Role_ID→Group_Roles

### Group_Role_Directions [R] [None]
PK: `Group_Role_Direction_ID`

### Group_Role_Intensities [R] [None]
PK: `Group_Role_Intensity_ID`

### Group_Role_Types [R] [None]
PK: `Group_Role_Type_ID`

### Group_Roles [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Group_Role_ID` | FK: Group_Role_Type_ID→Group_Role_Types, Group_Role_Direction_ID→Group_Role_Directions, Group_Role_Intensity_ID→Group_Role_Intensities, Ministry_ID→Ministries

### Group_Rooms [RWAD] [None]
PK: `Group_Room_ID` | FK: Group_ID→Groups, Room_ID→Rooms

### Group_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Group_Type_ID` | FK: Default_Role→Group_Roles

### Groups [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Group_ID` | FK: Group_Type_ID→Group_Types, Ministry_ID→Ministries, Congregation_ID→Congregations, Primary_Contact→Contacts, Parent_Group→Groups, Priority_ID→Priorities, Offsite_Meeting_Address→Addresses, Life_Stage_ID→Life_Stages, Group_Focus_ID→Group_Focuses, Meeting_Day_ID→Meeting_Days, Meeting_Frequency_ID→Meeting_Frequencies, Meeting_Duration_ID→Meeting_Durations, Required_Book→Books, Descended_From→Groups, Reason_Ended→Group_Ended_Reasons, Promote_to_Group→Groups, SMS_Number→dp_SMS_Numbers, Default_Meeting_Room→Rooms

### Household_Care_Log [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Household_Care_ID` | FK: Household_ID→Households, Care_Type_ID→Care_Types, Care_Outcome_ID→Care_Outcomes, Provided_By→Contacts, Paid_To→Contacts, Care_Case_ID→Care_Cases, Contact_ID→Contacts

### Household_Identifier_Log [RWAD] [None]
PK: `Household_Identifier_ID` | FK: Household_ID→Households

### Household_Positions [R] [None]
PK: `Household_Position_ID`

### Household_Sources [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Household_Source_ID`

### Household_Types [R] [None]
PK: `Household_Type_ID`

### Households [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Household_ID` | FK: Address_ID→Addresses, Congregation_ID→Congregations, Care_Person→Contacts, Household_Source_ID→Household_Sources, Alternate_Mailing_Address→Addresses

### Import_Destinations [RWAD] [None]
PK: `Import_Destination_ID`

### Import_Templates [RWAD] [None]
PK: `Import_Template_ID` | FK: Import_Destination_ID→Import_Destinations, Congregation_ID→Congregations

### Industries [R] [None]
PK: `Industry_ID`

### Invoice_Detail [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Invoice_Detail_ID` | FK: Invoice_ID→Invoices, Recipient_Contact_ID→Contacts, Event_Participant_ID→Event_Participants, Product_ID→Products, Product_Option_Price_ID→Product_Option_Prices

### Invoice_Sources [R] [None]
PK: `Invoice_Source_ID`

### Invoice_Statuses [R] [None]
PK: `Invoice_Status_ID`

### Invoices [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Invoice_ID` | FK: Purchaser_Contact_ID→Contacts, Invoice_Status_ID→Invoice_Statuses, Congregation_ID→Congregations, Invoice_Source→Invoice_Sources

### Item_Priorities [R] [None]
PK: `Item_Priority_ID`

### Item_Statuses [R] [None]
PK: `Item_Status_ID`

### Journeys [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Journey_ID` | FK: Leadership_Team→Groups

### Letters [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Letter_ID` | FK: Page_ID→dp_Pages, Congregation_ID→Congregations

### Life_Stages [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Life_Stage_ID`

### Location_Categories [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Location_Category_ID`

### Location_Group_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Location_Group_Type_ID`

### Location_Groups [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Location_Group_ID` | FK: Location_Group_Type_ID→Location_Group_Types, Parent_Location_Group→Location_Groups

### Location_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Location_Type_ID`

### Locations [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Location_ID` | FK: Congregation_ID→Congregations, Location_Type_ID→Location_Types, Address_ID→Addresses, Location_Group_ID→Location_Groups, Mailing_Address_ID→Addresses, Location_Category_ID→Location_Categories

### Maintenance_Requests [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Maintenance_Request_ID` | FK: Submitted_For→dp_Users

### Mapping_Values [R] [None]
PK: `Mapping_Value_ID`

### Marital_Statuses [R] [None]
PK: `Marital_Status_ID`

### Meeting_Days [R] [None]
PK: `Meeting_Day_ID`

### Meeting_Durations [RWAD] [None]
PK: `Meeting_Duration_ID`

### Meeting_Frequencies [R] [None]
PK: `Meeting_Frequency_ID`

### Member_Statuses [RWAD] [None]
PK: `Member_Status_ID`

### Memorized_Batches [RWAD] [None]
PK: `Memorized_Batch_ID` | FK: Congregation_ID→Congregations

### Metrics [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Metric_ID`

### Milestones [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Milestone_ID` | FK: Journey_ID→Journeys, Next_Milestone→Milestones, Congregation_ID→Congregations

### Ministries [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Ministry_ID` | FK: Primary_Contact→Contacts, Parent_Ministry→Ministries, Priority_ID→Priorities, Leadership_Team→Groups

### MobileApp_Menu_Items [RWAD] [None]
PK: `MobileApp_Menu_Item_ID` | FK: Role_ID→dp_Roles

### mp_vw_Current_Program_Participants [R] [None]
PK: `mp_vw_Current_Program_Participants_ID`

### mp_vw_Last_Known_Activity [R] [None]
PK: `mp_vw_Last_Known_Activity_ID`

### mp_vw_possible_leaders [R] [None]
PK: `mp_vw_possible_leaders_ID`

### mp_vw_Primary_HH [R] [None]
PK: `mp_vw_Primary_HH_ID`

### Need_Campaigns [RWAD] [FileAttach, DataExport]
PK: `Need_Campaign_ID`

### Need_Providers [RWAD] [FileAttach, DataExport]
PK: `Need_Provider_ID` | FK: Contact_ID→Contacts

### Need_Type_Providers [RWAD] [FileAttach, DataExport]
PK: `Need_Type_Provider_ID` | FK: Need_Type_ID→Need_Types, Need_Provider_ID→Need_Providers

### Need_Types [RWAD] [FileAttach, DataExport]
PK: `Need_Type_ID` | FK: Need_Campaign_ID→Need_Campaigns

### Needs [RWAD] [FileAttach, DataExport]
PK: `Need_ID` | FK: Requester_Contact→Contacts, Need_Campaign_ID→Need_Campaigns, Need_Type_ID→Need_Types, Need_Provider_ID→Need_Providers, Care_Case_ID→Care_Cases

### Occupations [R] [None]
PK: `Occupation_ID`

### Opportunities [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Opportunity_ID` | FK: Group_Role_ID→Group_Roles, Program_ID→Programs, Visibility_Level_ID→Visibility_Levels, Contact_Person→Contacts, Add_to_Group→Groups, Add_to_Event→Events, Required_Gender→Genders, Custom_Form→Forms, Response_Message→dp_Communication_Templates, Optional_Reminder_Message→dp_Communication_Templates

### Opportunity_Attributes [RWAD] [None]
PK: `Opportunity_Attribute_ID` | FK: Attribute_ID→Attributes, Opportunity_ID→Opportunities

### Ordination_Types [R] [None]
PK: `Ordination_Type_ID`

### Participant_Certifications [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Participant_Certification_ID` | FK: Participant_ID→Participants, Certification_Type_ID→Certification_Types

### Participant_Engagement [R] [None]
PK: `Participant_Engagement_ID`

### Participant_Milestones [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Participant_Milestone_ID` | FK: Participant_ID→Participants, Milestone_ID→Milestones, Program_ID→Programs, Event_ID→Events, Witness→Contacts

### Participant_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Participant_Type_ID` | FK: Set_Inactivated_To→Participant_Types, Set_Reactivated_To→Participant_Types

### Participants [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Participant_ID` | FK: Contact_ID→Contacts, Participant_Type_ID→Participant_Types, Member_Status_ID→Member_Statuses, Participant_Engagement_ID→Participant_Engagement, Church_of_Record→Households

### Participation_Items [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Participation_Item_ID`

### Participation_Requirements [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Participation_Requirement_ID` | FK: Group_Role_ID→Group_Roles, Background_Check_Type_ID→Background_Check_Types, Certification_Type_ID→Certification_Types, Milestone_ID→Milestones, Custom_Form_ID→Forms

### Participation_Statuses [R] [None]
PK: `Participation_Status_ID`

### Payment_Detail [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Payment_Detail_ID` | FK: Payment_ID→Payments, Invoice_Detail_ID→Invoice_Detail

### Payment_Types [R] [None]
PK: `Payment_Type_ID`

### Payments [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Payment_ID` | FK: Contact_ID→Contacts, Payment_Type_ID→Payment_Types, Congregation_ID→Congregations, Invoice_ID→Invoices

### Personnel [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_ID` | FK: Contact_ID→Contacts, Personnel_Type_ID→Personnel_Types, Personnel_Record_Status_ID→Personnel_Record_Statuses, Congregation_ID→Congregations, Citizenship_Type_ID→Citizenship_Types, Personnel_Category_ID→Personnel_Categories

### Personnel_Assignment_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Assignment_Type_ID`

### Personnel_Assignments [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Assignment_ID` | FK: Personnel_ID→Personnel, Personnel_Assignment_Type_ID→Personnel_Assignment_Types, Location_ID→Locations, Assignment_Role_ID→Assignment_Roles

### Personnel_Beneficiaries [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Beneficiary_ID` | FK: Personnel_ID→Personnel, Contact_ID→Contacts, Beneficiary_Relationship_ID→Beneficiary_Relationships

### Personnel_Benefits [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Benefit_ID` | FK: Personnel_ID→Personnel, Benefit_Type_ID→Benefit_Types

### Personnel_Categories [R] [None]
PK: `Personnel_Category_ID`

### Personnel_Comment_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Comment_Type_ID`

### Personnel_Comments [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Comment_ID` | FK: Personnel_ID→Personnel, Personnel_Comment_Type_ID→Personnel_Comment_Types

### Personnel_Estate_Plans [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Estate_Plan_ID` | FK: Personnel_ID→Personnel

### Personnel_Ordination [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Ordination_ID` | FK: Personnel_ID→Personnel, Deacon_Ordained_Here→Church_Associations, Religious_Order_ID→Religious_Orders, Religious_Order_Status_ID→Religious_Order_Statuses, Priesthood_Ordained_Here→Church_Associations

### Personnel_Record_Statuses [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Record_Status_ID`

### Personnel_Resume_Item_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Resume_Item_Type_ID`

### Personnel_Resume_Items [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Resume_Item_ID` | FK: Personnel_ID→Personnel, Resume_Item_Type_ID→Personnel_Resume_Item_Types, Location_ID→Locations

### Personnel_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Personnel_Type_ID`

### Perspectives [R] [None]
PK: `Perspective_ID`

### Planned_Contacts [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Planned_Contact_ID` | FK: Manager→dp_Users, Next_Planned_Contact→Planned_Contacts, Next_Contact_By→dp_Users, Call_Team→Groups

### Pledge_Adjustment_Types [R] [None]
PK: `Pledge_Adjustment_Type_ID`

### Pledge_Adjustments [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Pledge_Adjustment_ID` | FK: Pledge_ID→Pledges, Pledge_Adjustment_Type_ID→Pledge_Adjustment_Types

### Pledge_Campaign_Types [R] [None]
PK: `Pledge_Campaign_Type_ID`

### Pledge_Campaigns [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Pledge_Campaign_ID` | FK: Pledge_Campaign_Type_ID→Pledge_Campaign_Types, Event_ID→Events, Program_ID→Programs, Registration_Form→Forms, Congregation_ID→Congregations

### Pledge_Frequencies [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Pledge_Frequency_ID`

### Pledge_Statuses [R] [None]
PK: `Pledge_Status_ID`

### Pledges [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Pledge_ID` | FK: Donor_ID→Donors, Pledge_Campaign_ID→Pledge_Campaigns, Pledge_Status_ID→Pledge_Statuses, Parish_Credited_ID→Congregations, _Gift_Frequency→Frequencies, Donation_Source_ID→Donation_Sources, Batch_ID→Batches

### Pocket_Platform_Devices [RWAD] [None]
PK: `Device_ID` | FK: User_ID→dp_Users, App_ID→Pocket_Platform_Apps

### Pocket_Platform_Migrations [R] [None]
PK: `Pocket_Platform_Migrations_ID`

### Prefixes [R] [None]
PK: `Prefix_ID`

### Primary_Languages [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Primary_Language_ID`

### Print_Servers [RWAD] [FileAttach, DataExport]
PK: `Print_Server_ID`

### Priorities [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Priority_ID` | FK: Perspective_ID→Perspectives, Parent_Priority_ID→Priorities

### Procedures [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Procedure_ID` | FK: User_ID→dp_Users, Ministry_ID→Ministries, Page_ID→dp_Pages

### Product_Option_Groups [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Product_Option_Group_ID` | FK: Product_ID→Products

### Product_Option_Prices [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Product_Option_Price_ID` | FK: Product_Option_Group_ID→Product_Option_Groups, Add_to_Group→Groups

### Products [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Product_ID` | FK: Congregation_ID→Congregations, Price_Currency→Currencies

### Program_Groups [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Program_Group_ID` | FK: Program_ID→Programs, Group_ID→Groups, Room_ID→Rooms

### Program_Types [R] [None]
PK: `Program_Type_ID`

### Programs [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Program_ID` | FK: Congregation_ID→Congregations, Ministry_ID→Ministries, Program_Type_ID→Program_Types, Leadership_Team→Groups, Primary_Contact→Contacts, Priority_ID→Priorities, Statement_Header_ID→Statement_Headers, Pledge_Campaign_ID→Pledge_Campaigns, Default_Target_Event→Events, SMS_Number→dp_SMS_Numbers

### Relationships [R] [None]
PK: `Relationship_ID` | FK: Reciprocal_Relationship_ID→Relationships

### Religious_Order_Statuses [R] [None]
PK: `Religious_Order_Status_ID`

### Religious_Orders [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Religious_Order_ID`

### Request_Statuses [R] [None]
PK: `Request_Status_ID`

### Response_Follow_Ups [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Response_Follow_Up_ID` | FK: Response_ID→Responses, Action_Type_ID→Follow_Up_Action_Types, Made_By→dp_Users

### Response_Results [R] [None]
PK: `Response_Result_ID`

### Responses [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Response_ID` | FK: Opportunity_ID→Opportunities, Participant_ID→Participants, Response_Result_ID→Response_Results, Event_ID→Events

### Room_Layouts [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Room_Layout_ID` | FK: Room_ID→Rooms

### Room_Usage_Types [R] [None]
PK: `Room_Usage_Type_ID`

### Rooms [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Room_ID` | FK: Building_ID→Buildings, Default_Room_Layout→Room_Layouts, Room_Usage_Type_ID→Room_Usage_Types, Parent_Room_ID→Rooms, Print_Server_ID→Print_Servers

### RSVP_Statuses [RWAD] [None]
PK: `RSVP_Status_ID`

### Sacrament_Places [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Sacrament_Place_ID` | FK: Address_ID→Addresses, Mailing_Address_ID→Addresses, Church_Association_ID→Church_Associations

### Sacrament_Sponsors [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Sacrament_Sponsor_ID` | FK: Sacrament_ID→Sacraments, Sponsor_ID→Contacts, Sponsor_Type_ID→Sponsor_Types

### Sacrament_Types [R] [None]
PK: `Sacrament_Type_ID`

### Sacraments [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Sacrament_ID` | FK: Sacrament_Type_ID→Sacrament_Types, Date_Received_Accuracy_ID→Date_Accuracies, Participant_ID→Participants, Performed_By_ID→Contacts, Place_ID→Sacrament_Places, Father_ID→Contacts, Mother_ID→Contacts, Spouse_ID→Participants, Ordination_Type_ID→Ordination_Types

### Schedule_Roles [RWAD] [None]
PK: `Schedule_Role_ID` | FK: Schedule_ID→Schedules, Group_Role_ID→Group_Roles

### Schedule_Statuses [RWAD] [None]
PK: `Schedule_Status_ID`

### Scheduled_Donation_Distributions [RWAD] [None]
PK: `Scheduled_Donation_Distribution_ID` | FK: Scheduled_Donation_ID→Scheduled_Donations, Program_ID→Programs, Pledge_ID→Pledges, Donation_Source_ID→Donation_Sources, Parish_Credited_ID→Congregations, Target_Event→Events

### Scheduled_Donations [RWAD] [DataExport]
PK: `Scheduled_Donation_ID` | FK: Donor_ID→Donors, Donor_Account_ID→Donor_Accounts, Target_Event→Events, Payment_Type_ID→Payment_Types, Gift_Frequency_ID→Frequencies, Congregation_ID→Congregations, Memorized_Batch_ID→Memorized_Batches

### Scheduled_Participants [RWAD] [None]
PK: `Schedule_Participant_ID` | FK: Schedule_Role_ID→Schedule_Roles, Participant_ID→Participants

### Schedules [RWAD] [FileAttach]
PK: `Schedule_ID` | FK: Event_ID→Events, Schedule_Status_ID→Schedule_Statuses, Group_ID→Groups, Primary_Contact→Contacts

### Service_Types [RWAD] [None]
PK: `Service_Type_ID`

### Servicing [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Service_ID` | FK: Service_Type_ID→Service_Types, Team_Group_ID→Groups, Contact_ID→Contacts

### Sponsor_Types [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Sponsor_Type_ID`

### Staff [RWAD] [FileAttach, DataExport]
PK: `Staff_ID` | FK: Contact_ID→Contacts

### Statement_Cutoff_Automation [R] [None]
PK: `Statement_Cutoff_Automation_ID`

### Statement_Frequencies [R] [None]
PK: `Statement_Frequency_ID`

### Statement_Headers [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Statement_Header_ID`

### Statement_Methods [R] [None]
PK: `Statement_Method_ID`

### Statement_Types [R] [None]
PK: `Statement_Type_ID`

### Suffixes [R] [None]
PK: `Suffix_ID`

### Suggestion_Types [R] [None]
PK: `Suggestion_Type_ID`

### Texting_Compliance_Levels [RWAD] [FileAttach, DataExport]
PK: `Texting_Compliance_Level_ID`

### Texting_Opt_In_Types [RWAD] [FileAttach, DataExport]
PK: `Texting_Opt_In_Type_ID`

### Time_Off_Types [R] [None]
PK: `Time_Off_Type_ID`

### Visibility_Levels [R] [None]
PK: `Visibility_Level_ID`

### Volunteer_Unavailable_Dates [RWAD] [FileAttach, DataExport, SecureRecord]
PK: `Volunteer_Unavailable_Date_ID` | FK: Contact_ID→Contacts

### vw_mp_Campaign_Goals [R] [FileAttach, DataExport, SecureRecord]
PK: `Campaign_Goal_ID` | FK: Campaign_Goal_ID→Campaign_Goals, Pledge_Campaign_ID→Pledge_Campaigns

### vw_mp_Contact_Details [R] [None]
PK: `ID`

### vw_mp_contact_mail_name [R] [DataExport]
PK: `Contact_ID`

### vw_mp_giving_unit_summary [R] [DataExport]
PK: `Household_ID` | FK: Household_ID→Households, Contact_ID→Contacts

### vw_mp_Participation_Compliance [R] [DataExport]
PK: `ID` | FK: Group_ID→Groups, Participant_ID→Participants, Group_Role_ID→Group_Roles

### vw_mp_Participation_Compliance_Details [R] [DataExport]
PK: `ID` | FK: Group_ID→Groups, Participant_ID→Participants, Group_Role_ID→Group_Roles, Background_Check_Type_ID→Background_Check_Types, Certification_Type_ID→Certification_Types, Milestone_ID→Milestones, Custom_Form_ID→Forms

### vw_mp_Personnel_Audit_Overview [R] [FileAttach, DataExport, SecureRecord]
PK: `Audit_Item_ID`

### vw_mp_Projected_Scheduled_Donations [R] [FileAttach, DataExport, SecureRecord]
PK: `ID` | FK: Scheduled_Donation_ID→Scheduled_Donations, Donor_ID→Donors, Congregation_ID→Congregations, Donor_Account_ID→Donor_Accounts, Payment_Type_ID→Payment_Types, Gift_Frequency_ID→Frequencies

### vw_mp_Response_Qualification_Details [R] [DataExport]
PK: `ID` | FK: Response_ID→Responses, Group_Role_ID→Group_Roles, Participant_ID→Participants, Background_Check_Type_ID→Background_Check_Types, Certification_Type_ID→Certification_Types, Milestone_ID→Milestones, Custom_Form_ID→Forms

### vw_mp_Response_Qualifications [R] [DataExport]
PK: `ID` | FK: Response_ID→Responses, Group_Role_ID→Group_Roles, Participant_ID→Participants

### vw_mp_User_Rights [R] [DataExport]
PK: `View_ID` | FK: Contact_ID→Contacts, User_ID→dp_Users

### Weekly_Snapshots [R] [None]
PK: `Weekly_Snapshot_ID` | FK: Congregation_ID→Congregations

### Wifi_Device_Sessions [RWAD] [None]
PK: `Wifi_Device_Session_ID` | FK: Wifi_Device_ID→Wifi_Devices

### Wifi_Devices [RWAD] [None]
PK: `Wifi_Device_ID` | FK: Contact_ID→Contacts

### Z_Event_Notifications [R] [None]
PK: `Z_Event_Notifications_ID`

### Z_Form_Notifications [R] [None]
PK: `Z_Form_Notifications_ID`

### Z_Opp_Notifications [R] [None]
PK: `Z_Opp_Notifications_ID`
