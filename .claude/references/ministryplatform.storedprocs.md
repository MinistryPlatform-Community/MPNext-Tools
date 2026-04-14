# Ministry Platform Stored Procedures Reference

This document provides a summary of stored procedures available via the Ministry Platform API for LLM assistants working on the MPNext project.

**Generated:** 2026-04-14T12:00:42.811Z
**Procedures:** 532

---

## Quick Reference

Compact listing of all procedures grouped by prefix. Input parameters shown in parentheses.

### api_* (526 procedures)

- `api_Advanced_EventsAndRoomsByRecord(@RecordID: Integer32)`
- `api_Advanced_GetRecurringItems(@SequenceID: Integer32)`
- `api_Advanced_GetRecurringSequenceTables(no parameters)`
- `api_Advanced_GetRecurringSeries(@TableName: String)`
- `api_Advanced_GetSubPageRecords(@ParentTableName: String, @ParentRecordID: Integer32)`
- `api_BatchManager_AutoAssignPledges(@BatchId: Integer32)`
- `api_BatchManager_CreateFromMemorizedBatch(@MemorizedBatchId: Integer32, @UserId: Integer32)`
- `api_BatchManager_GetBatchImages(@BatchIds: Text)`
- `api_BatchManager_GetDuplicateChecks(@BatchId: Integer32)`
- `api_BatchManager_IgnoreDuplicateCheck(@DonationId: Integer32)`
- `api_BatchManager_SetDonationScanMode(@DonationId: Integer32, @IsCheckScan: Boolean)`
- `api_BatchManager_UpdatePledgeReadonlyValues(@PledgeId: Integer32, @Frequency: Integer32)`
- `api_CareConnect_GetCareCases(@UserID: Integer32, @ApiUrl: String, @SelectAll: Boolean)`
- `api_CareConnect_GetCareConnectStats(@UserID: Integer32)`
- `api_CareConnect_GetHouseholds(no parameters)`
- `api_CareConnect_SearchHouseholds(@LastName: String, @FirstName: String, @ApiUrl: String)`
- `api_CareLife_GetCareCases(@UserID: Integer32, @ApiUrl: String, @SelectAll: Boolean)`
- `api_CareLife_GetCareLifeStats(@UserID: Integer32)`
- `api_CareLife_SearchHouseholds(@LastName: String, @FirstName: String, @ApiUrl: String)`
- `api_CareSuite_GetCareCases(@UserID: Integer32, @ApiUrl: String, @SelectAll: Boolean)`
- `api_CheckIn_GetActivitiesInScope(@ActivityList: String)`
- `api_CheckIn_GetCheckInEvents(@LocalTime: DateTime, @CongregationID: Integer32, @MinistryID: Integer32)`
- `api_CheckIn_GetCheckInMatches(@FirstName: String, @LastName: String, @PhoneNumber: String, @ActivityList: String, @CheckedInStatus: Integer32, @HouseholdID: Integer32, @CardID: String, @IsAttended: Boolean, @DefaultEarlyCheckIn: Integer16, @DefaultLateCheckIn: Integer16, @StopMsg: String, @GuestMsg: String, @NoEventMsg: String, @LocalTime: DateTime)`
- `api_CheckIn_GetCongregations(@BlankParam: String)`
- `api_CheckIn_GetCongregationsAndMinistries(no parameters)`
- `api_CheckIn_GetDefaultGroupRole(@GroupID: Integer32)`
- `api_CheckIn_GetGroupsByActivity(@EventID: Integer32)`
- `api_CheckIn_GetHouseholdMembers(@HouseholdID: Integer32)`
- `api_CheckIn_GetHouseholdRecord(@HouseholdID: Integer32)`
- `api_CheckIn_GetLabelData(@CheckInData: Xml, @AllergyAttributeID: Integer32, @CallNumberType: Integer32, @CallNumberChar: Integer32)`
- `api_CheckIn_GetOrCreateParticipant(@ContactID: Integer32, @DefaultParticipantTypeID: Integer32)`
- `api_CheckIn2_GetActivitiesInScope(@ActivityList: String)`
- `api_CheckIn2_GetCheckInEvents(@LocalTime: DateTime, @CongregationID: Integer32, @MinistryID: Integer32)`
- `api_CheckIn2_GetCheckInHouseholdsFromSharedID(@ActivityList: String, @CardID: String, @IsAttended: Boolean, @LocalTime: DateTime, @HouseholdID: Integer32, @FirstName: String, @LastName: String, @PhoneNumber: String)`
- `api_CheckIn2_GetCheckInMatchesFromSharedID(@ActivityList: String, @CardID: String, @IsAttended: Boolean, @LocalTime: DateTime, @HouseholdID: Integer32, @FirstName: String, @LastName: String, @PhoneNumber: String)`
- `api_CheckIn2_GetCheckInMatchesFromUniqueID(@ActivityList: String, @CardID: String, @HouseholdID: Integer32, @IsAttended: Boolean, @LocalTime: DateTime)`
- `api_CheckIn2_GetCongregations(no parameters)`
- `api_CheckIn2_GetCongregationsAndMinistries(no parameters)`
- `api_CheckIn2_GetDefaultGroupRole(@GroupID: Integer32)`
- `api_CheckIn2_GetDropDownData(no parameters)`
- `api_CheckIn2_GetGroups(@CongregationID: Integer32, @MinistryID: Integer32)`
- `api_CheckIn2_GetGroupsByActivity(@EventID: Integer32, @AgeMonths: Integer32)`
- `api_CheckIn2_GetHouseholdMembers(@HouseholdID: Integer32, @ContactID: Integer32)`
- `api_CheckIn2_GetHouseholdRecord(@HouseholdID: Integer32)`
- `api_CheckIn2_GetLabelData(@CheckInData: Xml, @AllergyAttributeID: Integer32, @CallNumberType: Integer32, @CallNumberChar: Integer32)`
- `api_CheckIn2_GetMinistries(no parameters)`
- `api_CheckIn2_GetOrCreateParticipant(@ContactID: Integer32, @DefaultParticipantTypeID: Integer32)`
- `api_CheckIn2_GetRooms(@CongregationID: Integer32)`
- `api_CheckScan_DeleteBatch(@BatchID: Integer32)`
- `api_CheckScan_DeleteDistribution(@DistributionID: Integer32)`
- `api_CheckScan_DeleteDonation(@DonationID: Integer32)`
- `api_CheckScan_FindDonor(@LastNameOrCompany: String, @AddressLine1: String, @EnvelopeNumber: String, @AccountNumber: String, @RoutingNumber: String)`
- `api_CheckScan_FindDonorAccount(@AccountNumber: String, @RoutingNumber: String, @ContactID: Integer32)`
- `api_CheckScan_FindDonorAccounts(@CheckData: Xml)`
- `api_CheckScan_FindMatchingContact(@FirstName: String, @LastName: String, @Phone: String, @AddressLine1: String)`
- `api_CheckScan_FindPledgesByDonorID(@DonorID: Integer32)`
- `api_CheckScan_FindPledgesByEventID(@EventID: Integer32)`
- `api_CheckScan_GetBatchByID(@BatchID: Integer32)`
- `api_CheckScan_GetBatchSummaries(@UserID: Integer32)`
- `api_CheckScan_GetDonorHistory(@DonorID: Integer32)`
- `api_CheckScan_GetLookupData(@EventTypeID: Integer32, @UserID: Integer32)`
- `api_CIM_GetCheckInHouseholds(@SearchTerm: String, @RestrictToEventList: String, @IsAttended: Boolean, @HouseholdId: Integer32, @AllowPhoneNumber: Boolean, @AllowIdCardBarcode: Boolean, @AllowLastName: Boolean)`
- `api_CIM_GetCheckInResults(@HouseholdID: Integer32, @EventList: Text, @IsAttended: Boolean, @ID_Card: String, @GuestContactID: Integer32)`
- `api_CIM_GetCheckInRooms(@EventList: String, @ActiveOnly: Boolean)`
- `api_CIM_GetDomainTimezone(no parameters)`
- `api_Classroom_GetCongregations(no parameters)`
- `api_Classroom_GetDropDownData(no parameters)`
- `api_Classroom_GetEvents(@GroupsList: Xml)`
- `api_Classroom_GetFriendsAndFamily(@ContactID: Integer32)`
- `api_Classroom_GetGroups(@CongregationID: Integer32, @MinistryID: Integer32)`
- `api_Classroom_GetParticipants(@ParticipationStatusID: Integer32, @EventID: Integer32, @GroupsList: Xml, @SearchTerm: String, @DataPageIndex: Integer16, @GroupRoleTypeID: Integer32)`
- `api_Classroom_GetRooms(@GroupsList: Xml, @CongregationID: Integer32)`
- `api_CloudApps_GetDomainInfo(no parameters)`
- `api_CloudServices_GetContactsToInactivate(no parameters)`
- `api_CloudServices_GetContactsToReactivate(no parameters)`
- `api_CloudServices_GetStats(no parameters)`
- `api_CloudTools_AddAuditLog(@TableName: String, @RecordID: Integer32, @AuditDescription: String, @UserName: String, @UserID: Integer32, @FieldName: String, @FieldLabel: String, @PreviousValue: Text, @NewValue: Text)`
- `api_CloudTools_CreateSelection(@UserID: Integer32, @PageID: Integer32, @SelectionName: String)`
- `api_CloudTools_CreateSelectionRecords(@UserID: Integer32, @SelectionID: Integer32, @Records: Xml)`
- `api_CloudTools_ExportDeposit_BANKONE(@PageID: Integer32, @SelectionID: Integer32, @NameID: Integer32)`
- `api_CloudTools_ExportDeposit_GetDataForShelbyGLTRN2000(@SelectionID: Integer32, @BankID: Integer32, @AccountingPeriod: String)`
- `api_CloudTools_GetDomainGUID(no parameters)`
- `api_CloudTools_GetPageData(@pageID: Integer32)`
- `api_CloudTools_GetSelection(@SelectionID: Integer32, @UserID: Integer32, @PageID: Integer32)`
- `api_CloudTools_GetSelections(@UserID: Integer32, @PageID: Integer32)`
- `api_CloudTools_GetUserTools(@UserID: Integer32)`
- `api_CloudTools_ResetUserSecurity(@ContactID: Integer32, @UserID: Integer32)`
- `api_CloudTools_UpdateCommunicationMessage(@CommunicationMessageID: Integer32, @StatusID: Integer32, @UserID: Integer32)`
- `api_Common_FindMatchingContact(@FirstName: String, @LastName: String, @Suffix: String, @EmailAddress: String, @Phone: String, @RequireEmail: Boolean)`
- `api_Common_GenerateSlug(@TableName: String, @RecordID: Integer32, @SubPage: String)`
- `api_Common_GetConfigurationLists(@ApplicationCode: String)`
- `api_Common_GetConfigurationSettings(@ApplicationCode: String, @KeyName: String)`
- `api_Common_GetCongregations(no parameters)`
- `api_Common_GetContact_PKFK(@NextTable: String, @RefField: String)`
- `api_Common_GetContactByEmail(@EmailAddress: String)`
- `api_Common_GetContactHouseholdInfo(@HouseholdID: String)`
- `api_Common_GetContactLookupData(no parameters)`
- `api_Common_GetDataRecord(@TableName: String, @RecordId: Integer32)`
- `api_Common_GetDDLRelationships(no parameters)`
- `api_Common_GetDomainConfigurationInfo(no parameters)`
- `api_Common_GetEventsInSeries(@EventID: Integer32)`
- `api_Common_GetMatchingContacts(@FirstName: String, @LastName: String, @EmailAddress: String, @Phone: String, @AddressLine1: String, @City: String, @Zip: String, @StateRegion: String)`
- `api_Common_GetPageID(@TableName: String)`
- `api_Common_GetSelection(@UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32)`
- `api_Common_GetStandardStatement(@StatementID: Integer32)`
- `api_Common_GetUserRecord(@UserID: Integer32)`
- `api_Common_GetUserRecordFromGUID(@UserGUID: Guid)`
- `api_Common_GetUserRoles(@UserID: Integer32)`
- `api_Common_StoredProcParameters(@ProcName: String)`
- `api_CORE_AuthenticateContactGUID(@DomainGUID: String, @ContactGUID: String)`
- `api_CORE_AuthenticateUser(@UserName: String, @Password: String)`
- `api_CORE_AuthenticateUserGUID(@DomainGUID: String, @UserGUID: String)`
- `api_CORE_FindContactByMobile(@MobilePhone: String)`
- `api_CORE_FindContacts(@MobilePhone: String, @EmailAddress: String)`
- `api_CORE_GetDDLData(@tableName: String, @filterRequest: String)`
- `api_CORE_GetDomainData(no parameters)`
- `api_CORE_GetGroupContacts(@groupID: Integer32)`
- `api_CORE_GetGroupDetails(@groupID: Integer32)`
- `api_CORE_GetGroupParticipant(@groupID: Integer32, @contactID: Integer32)`
- `api_CORE_GetLookupValuesData(no parameters)`
- `api_CORE_GetMyGroups(@ContactID: Integer32)`
- `api_CORE_GetPageID(@page: String)`
- `api_CORE_GetPrimaryKey(@TableName: String)`
- `api_CORE_GetReAuth(@UserID: Integer32)`
- `api_CORE_GetRecordFile(@tableName: String, @recordID: Integer32, @defaultImage: Integer32, @thumbnailImage: Integer32)`
- `api_CORE_GetRichPerson(@contactID: Integer32)`
- `api_CORE_GetRoleContacts(@roleID: Integer32)`
- `api_CORE_GetTableData(@tableName: String, @primaryKey: String, @recordID: Integer32, @filterRequest: String, @orderBy: String, @orderByDesc: Integer32, @topCount: Integer32)`
- `api_CORE_GetTemplate(@TemplateID: Integer32)`
- `api_CORE_GetUserGroups(@UserID: Integer32)`
- `api_CORE_GetUserRoles(@UserID: Integer32)`
- `api_CoreTool_ACH_GetCompanies(@UserID: Integer32)`
- `api_CoreTool_ACH_GetData(@AccountingCompanyID: Integer32, @ACHPaymentTypeID: Integer32, @DayOfMonth: Integer32)`
- `api_CoreTool_AddFamily_GetDropDownData(no parameters)`
- `api_CoreTool_AddFamily_GetHousehold(@HouseholdID: Integer32)`
- `api_CoreTool_AssignDonor_GetDonations(@UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32, @RecordID: Integer32)`
- `api_CoreTool_AssignEnvelopeNumber(@UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32, @RecordID: Integer32)`
- `api_CoreTool_AssignParticipant_CleanUp(@EventParticipantID: Integer32)`
- `api_CoreTool_AssignParticipant_GetEvents(@SearchTerm: String, @EventID: Integer32)`
- `api_CoreTool_AssignParticipant_GetRegistrations(@RecordID: Integer32)`
- `api_CoreTool_BatchImport_GetContactBySysID(@DonorSysID: Integer32)`
- `api_CoreTool_BatchImport_GetProgramIdByAccountNumber(@AccountNumber: String)`
- `api_CoreTool_ChangeCongregation(@UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32, @RecordID: Integer32)`
- `api_CoreTool_CombineGroupParticipants_Delete(@GroupParticipantIDToDelete: Integer32, @GroupParticipantIDToKeep: Integer32)`
- `api_CoreTool_CombineGroupParticipants_GetAttendance(@GroupParticipantIDToDelete: Integer32)`
- `api_CoreTool_CombineGroupParticipants_GetData(@UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32, @RecordID: Integer32)`
- `api_CoreTool_Common_CreateGeography(@AddressID: Integer32)`
- `api_CoreTool_Common_CreateSelection(@UserID: Integer32, @CurrentSelectionID: Integer32, @NewSelectionName: String, @ContactIDList: Text, @AddPrimaryFamily: Boolean)`
- `api_CoreTool_Common_DeleteRecord(@TableName: String, @PrimaryKey: String, @RecordID: Integer32)`
- `api_CoreTool_Common_GetCongregations(no parameters)`
- `api_CoreTool_Common_GetContactForPage(@pageID: Integer32, @recordID: Integer32, @ContactField: String, @Table1Field: String)`
- `api_CoreTool_Common_GetContactForPage_Backup(@pageID: Integer32, @recordID: Integer32, @ContactField: String, @Table1Field: String)`
- `api_CoreTool_Common_GetContactInfo(@ContactID: Integer32)`
- `api_CoreTool_Common_GetContactRelationships(@ContactID1: Integer32, @ContactID2: Integer32, @RelationshipID: Integer32)`
- `api_CoreTool_Common_GetCopyRecord_Data(@recordID: Integer32, @TableName: String)`
- `api_CoreTool_Common_GetDonationsBySubscriptionCode(@SubscriptionCode: String)`
- `api_CoreTool_Common_GetDonor(@DonorID: Integer32)`
- `api_CoreTool_Common_GetFKRecords(@TableName: String, @PrimaryKey: String, @ForeignKey: String, @OldRecordID: Integer32)`
- `api_CoreTool_Common_GetHouseholdForContact(@ContactID: Integer32)`
- `api_CoreTool_Common_GetParticipant(@ParticipantID: Integer32)`
- `api_CoreTool_Common_GetParticipantTypes(no parameters)`
- `api_CoreTool_Common_GetPKFK(@TableName: String)`
- `api_CoreTool_Common_GetProgramsByCongregation(@CongregationID: Integer32)`
- `api_CoreTool_Common_GetTableInfo(@TableName: String)`
- `api_CoreTool_Common_GetUserByID(@userID: Integer32)`
- `api_CoreTool_Common_GetUsersWithRoles(no parameters)`
- `api_CoreTool_Common_GetUserTools(@UserID: Integer32)`
- `api_CoreTool_Common_UpdateFileRecords(@Page: String, @OldRecordID: Integer32, @NewRecordID: Integer32)`
- `api_CoreTool_Common_UpdateRecords(@TableName: String, @ColumnName: String, @MasterRecord: Integer32, @MergeRecord: Integer32)`
- `api_CoreTool_ConnectionCard_GetDropDownData(@CongregationID: Integer32)`
- `api_CoreTool_ConnectionCard_GetFamilyMembers(@HouseholdID: Integer32)`
- `api_CoreTool_ConnectionCard_GetHouseholds(@LastName: String, @FirstName: String)`
- `api_CoreTool_ContactMerge_CleanUp(@ContactID: Integer32)`
- `api_CoreTool_ContactMerge_FindDuplicates(@ContactID: Integer32, @UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32)`
- `api_CoreTool_ContactMerge_FindDuplicates_SDM(@ContactID: Integer32)`
- `api_CoreTool_ContactMerge_GetContacts(@ContactsXML: Xml, @UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32)`
- `api_CoreTool_ContactMerge_Prepare_Contact(@MasterContactID: Integer32, @MergeContactID: Integer32)`
- `api_CoreTool_ContactMerge_Prepare_Donor(@MasterDonorID: Integer32, @MergeDonorID: Integer32)`
- `api_CoreTool_ContactMerge_Prepare_Participant(@MasterParticipantID: Integer32, @MergeParticipantID: Integer32)`
- `api_CoreTool_ContactMerge_Prepare_User(@MasterUserID: Integer32, @MergeUserID: Integer32)`
- `api_CoreTool_ContactTool_GetData(@Mode: String, @itemID: Integer32, @pageID: Integer32, @UserID: Integer32)`
- `api_CoreTool_CopyBatch_CheckBatchName(@BatchName: String)`
- `api_CoreTool_CopyBatch_GetBatchData(@recordID: Integer32)`
- `api_CoreTool_CopyBatch_GetDonationDistributions(@DonationID: Integer32)`
- `api_CoreTool_CreateParticipant(@UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32, @RecordID: Integer32)`
- `api_CoreTool_DeceasedPerson_GetData(@RecordID: Integer32)`
- `api_CoreTool_DeleteFiles_DeleteFile(@DeleteFileID: Integer32)`
- `api_CoreTool_DeleteFiles_GetFiles(@UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32, @RecordID: Integer32)`
- `api_CoreTool_DonationImport_AddUpdateDonorAddress(@AddressID: Integer32, @AddressLine1: String, @AddressLine2: String, @City: String, @StateRegion: String, @PostalCode: String)`
- `api_CoreTool_DonationImport_FindContact(@LastName: String, @FirstName: String)`
- `api_CoreTool_DonationImport_FindDonorAddress(@AddressLine1: String, @City: String, @PostalCode: String)`
- `api_CoreTool_DonationImport_FindDonorsSpouse(@DonorID: Integer32)`
- `api_CoreTool_DonationImport_GetAddressByDonorID(@DonorID: Integer32)`
- `api_CoreTool_DonationImport_GetBatchSummaryData(@BatchID: Integer32)`
- `api_CoreTool_DonationImport_GetCongregations(no parameters)`
- `api_CoreTool_DonationImport_GetPaymentTypes(no parameters)`
- `api_CoreTool_DonationImport_GetPrograms(no parameters)`
- `api_CoreTool_DonationImport_GetProjects(no parameters)`
- `api_CoreTool_DonationImport_GetRelationshipID(@RelationshipName: String)`
- `api_CoreTool_DonationImport_GetUnfinalizedBatches(@BatchSearchString: String)`
- `api_CoreTool_DonationImport_ImportDonation(@AccountNumber: String, @RoutingNumber: String, @EnvelopeNumber: String, @DonationAmount: Money, @DonationDate: DateTime, @PaymentTypeID: Integer32, @ItemNumber: String, @BatchID: Integer32, @DefaultProgramID: Integer32, @Notes: String)`
- `api_CoreTool_DonationImport_IsMarriedHeadHousehold(@DonorID: Integer32)`
- `api_CoreTool_DonationImport_LookupDonor(@SearchTerm: String)`
- `api_CoreTool_DonationImport_UpdateDonationInfo(@DonationID: Integer32, @ContactID: Integer32, @DonorID: Integer32, @Amount1: Money, @Amount2: Money, @Amount3: Money, @Amount4: Money, @Amount5: Money, @Program1: Integer32, @Program2: Integer32, @Program3: Integer32, @Program4: Integer32, @Program5: Integer32, @Event1: Integer32, @Event2: Integer32, @Event3: Integer32, @Event4: Integer32, @Event5: Integer32, @DonorAccountID: Integer32)`
- `api_CoreTool_EventMetrics_GetData(@eventID: Integer32, @ministryID: Integer32, @metricID: Integer32, @groupID: Integer32)`
- `api_CoreTool_ExportDeposit_GetDataForBANKONE(@PageID: Integer32, @SelectionID: Integer32, @DomainGUID: String, @UserGUID: String, @NameID: Integer32)`
- `api_CoreTool_ExportDeposit_GetDataForBANKONE_Standard(@PageID: Integer32, @SelectionID: Integer32, @DomainGUID: String, @UserGUID: String)`
- `api_CoreTool_ExportDeposit_GetDataForQuickBooks(no parameters)`
- `api_CoreTool_ExportDeposit_GetDataForShelbyGLTRN2000(@SelectionID: Integer32, @BankID: Integer32, @AccountingPeriod: String)`
- `api_CoreTool_ExportDeposit_UpdateDepositClearSelection(@PageID: Integer32, @SelectionID: Integer32, @UserGUID: String)`
- `api_CoreTool_ExportDeposti_GetBanks(@BankID: Integer32)`
- `api_CoreTool_FormResponse_GetDDL(@EventID: Integer32, @FormID: Integer32)`
- `api_CoreTool_FormResponses(@FormID: Integer32, @EventID: Integer32, @FromDate: DateTime, @ToDate: DateTime)`
- `api_CoreTool_FormResponses_FromEvent(@EventID: Integer32, @FromDate: DateTime, @ToDate: DateTime)`
- `api_CoreTool_FormResponses_FromOpportunity(@OpportunityID: Integer32, @FromDate: DateTime, @ToDate: DateTime)`
- `api_CoreTool_FormResponses_FromPledgeCampaign(@PledgeCampaignID: Integer32, @FromDate: DateTime, @ToDate: DateTime)`
- `api_CoreTool_FormViewer_GetFormGuid(@FormID: Integer32)`
- `api_CoreTool_GetGroupParticipants(@groupID: Integer32, @eventID: Integer32)`
- `api_CoreTool_GetPageInfo(@pageID: Integer32)`
- `api_CoreTool_GetParticipantData(@RecordID: Integer32)`
- `api_CoreTool_GetPledgeData(@donorID: Integer32)`
- `api_CoreTool_GetResetSecurityData(@Mode: String, @itemID: Integer32, @userID: Integer32, @pageID: Integer32)`
- `api_CoreTool_GetSubscriptions(@ContactID: Integer32)`
- `api_CoreTool_GetSuffixes(no parameters)`
- `api_CoreTool_GroupAttendance_GetData(@recordID: Integer32, @MinistryID: Integer32)`
- `api_CoreTool_GroupAttendance_GetGroupParticipants(@groupID: Integer32, @eventID: Integer32)`
- `api_CoreTool_GroupAttendance_GetSingleData(@groupParticipantID: Integer32, @eventID: Integer32)`
- `api_CoreTool_Impersonate_GetContacts(@SelectionID: Integer32, @PageID: Integer32, @UserID: Integer32, @RecordID: Integer32)`
- `api_CoreTool_Impersonate_GetUsers(@SelectionID: Integer32, @PageID: Integer32, @UserID: Integer32, @RecordID: Integer32, @SearchString: String)`
- `api_CoreTool_Inactivate_GetContactPublications(@ContactID: Integer32)`
- `api_CoreTool_Inactivate_GetData(@Mode: String, @itemID: Integer32, @userID: Integer32, @pageID: Integer32)`
- `api_CoreTool_Inactivate_GetUserRoles(@ContactID: Integer32)`
- `api_CoreTool_LookUpDonor(@SearchTerm: String)`
- `api_CoreTool_MailChimpSync_FindContacts(@Data: Xml)`
- `api_CoreTool_MailChimpSync_FindSubscribers(@PublicationID: Integer32, @Data: Xml)`
- `api_CoreTool_MailChimpSync_GetContactsByEmail(@Email: String)`
- `api_CoreTool_MailChimpSync_GetPublications(no parameters)`
- `api_CoreTool_MailChimpSync_GetSubscriberByEmail(@Email: String, @PublicationID: Integer32)`
- `api_CoreTool_MailChimpSync_GettPublicationSubscribers(@PublicationID: Integer32)`
- `api_CoreTool_MapSelection_GetData(@UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32, @ContactID: Integer32)`
- `api_CoreTool_PAV_GetAddresses(@UserID: Integer32, @AddressesPageID: Integer32, @SelectionID: Integer32, @PageNumber: Integer32, @ReturnIndividuals: Boolean)`
- `api_CoreTool_PAV_GetAddresses_OLD(@UserID: Integer32, @AddressesPageID: Integer32, @SelectionID: Integer32, @PageNumber: Integer32)`
- `api_CoreTool_RegistrationManager_FindPayer(@SearchTerm: String, @EventParticipantID: Integer32)`
- `api_CoreTool_RegistrationManager_GetEvents(@SearchTerm: String, @EventID: Integer32)`
- `api_CoreTool_RegistrationManager_GetParticipantData(@EventParticipantID: Integer32)`
- `api_CoreTool_RegistrationManager_GetParticipants(@EventID: Integer32)`
- `api_CoreTool_ResetUserSecurity(@ContactID: Integer32)`
- `api_CoreTool_ReverseDonation_GetData(@UserID: Integer32, @PageID: Integer32, @SelectionID: Integer32, @RecordID: Integer32)`
- `api_CoreTool_RollScan_GetEventInfoByEventID(@EventID: Integer32)`
- `api_CoreTool_RollScan_GetGroupParticipantByID(@GroupParticipantID: Integer32)`
- `api_CoreTool_RollScan_GetParticipationStatuses(no parameters)`
- `api_CoreTool_RollScan_IsEventParticipant(@EventID: Integer32, @GroupParticipantID: Integer32)`
- `api_CoreTool_TransferSelection(@UserID: Integer32, @CurrentSelectionID: Integer32, @TargetPageName: String, @TargetPageID: Integer32, @TargetSelectionID: Integer32, @NewSelectionName: String, @Remove: Boolean, @Heads: Boolean, @NonCustodialHeads: Boolean, @CreateMissingRecords: Boolean)`
- `api_CoreTool_TransferSelection_GetData(@SelectionID: Integer32, @PageID: Integer32, @UserID: Integer32)`
- `api_CoreTool_TrimSelection_GetData(@PageID: Integer32, @UserID: Integer32, @SelectionID: Integer32, @ContactStatusID: Integer32, @MaritalStatusID: Integer32, @GenderID: Integer32, @AgeFrom: Integer32, @AgeTo: Integer32, @HouseholdPositionID: Integer32, @CongregationID: Integer32, @ParticipantTypeID: Integer32, @MinistryID: Integer32, @GroupTypeID: Integer32, @GroupRoleTypeID: Integer32, @GroupRoleID: Integer32, @GroupID: Integer32, @PublicationIDCurrent: Integer32, @PublicationIDPrevious: Integer32)`
- `api_CoreTool_TrimSelection_GetDropDownData(@MinistryID: Integer32, @GroupTypeID: Integer32, @GroupRoleTypeID: Integer32)`
- `api_CoreTool_TrimSelection_Trim(@SelectionID: Integer32, @FunctionName: String, @ContactStatusID: Integer32, @MaritalStatusID: Integer32, @GenderID: Integer32, @AgeFrom: Integer32, @AgeTo: Integer32, @HouseholdPositionID: Integer32, @CongregationID: Integer32, @ParticipantTypeID: Integer32, @MinistryID: Integer32, @GroupTypeID: Integer32, @GroupRoleTypeID: Integer32, @GroupRoleID: Integer32, @GroupID: Integer32, @CreateRemainderSelection: Boolean, @RemainderSelectionName: String, @PublicationIDCurrent: Integer32, @PublicationIDPrevious: Integer32)`
- `api_Custom_BrowserCommunication(@UserName: String, @CommunicationGUID: String)`
- `api_custom_Dashboard(@Username: String)`
- `api_custom_EventFinder(@UserName: String, @ProgramID: String)`
- `api_Custom_GetCongregation(@CongregationID: Integer32)`
- `api_custom_GroupManagerWidget_JSON(@Username: String, @GroupID: Integer32)`
- `api_custom_GroupWidget(@Username: String, @GroupFocusID: Integer32, @MeetingDayID: Integer32, @CongregationID: Integer32, @Keyword: String, @ShowFullAddress: Boolean, @ShowFutureGroups: Boolean)`
- `api_custom_MilestoneGamification(@Username: String, @JourneyID: Integer32)`
- `api_custom_MyFamilyEvents(@Username: String)`
- `api_Custom_MyForms(@Username: String)`
- `api_custom_MyMissionTrips(@Username: String, @PledgeID: Integer32)`
- `api_custom_PlatformWidget(@Username: String, @RecordID: Integer32)`
- `api_custom_PledgeGaugeWidget_JSON(@Username: String, @PledgeCampaignID: Integer32)`
- `api_Custom_Publication_Messages(@UserName: String, @PublicationID: Integer32, @MessageID: Integer32)`
- `api_custom_StaffWidget(@UserName: String)`
- `api_Custom_VBSHub(@UserName: String)`
- `api_DeleteRecurringDonations(@SubscriptionCode: String)`
- `api_FindMatchingContact(@FirstName: String, @LastName: String, @CompanyName: String, @Suffix: String, @Phone: String, @Address: String, @City: String, @State: String, @Zip: String, @CongregationID: Integer32, @CreateParticipant: Boolean, @CreateDonor: Boolean, @DonorAccountID: Integer32)`
- `api_GetBatchSummaryData(@BatchID: Integer32)`
- `api_GetEventProducts(@ProductID: Integer32)`
- `api_GetInvoiceDetailData(@Invoice_ID: Integer32)`
- `api_GetPurchaseHistoryData(@ContactID: Integer32, @Month: Integer32, @Year: Integer32)`
- `api_GetUserInfo(@User_ID: Integer32)`
- `api_GetUserRoles(@UserID: Integer32)`
- `api_GroupConnect_CreateOrUpdateGroupEventParticipantRSVP(@Event_ID: Integer32, @Participant_ID: Integer32, @Event_Participant_ID: Integer32, @Group_Participant_ID: Integer32, @Participation_Status_ID: Integer32, @Group_ID: Integer32, @RSVP_Status_ID: Integer32, @Notes: String, @UserId: Integer32, @UserName: String)`
- `api_GroupConnect_GetEventsAndSchedules(@GroupId: Integer32, @ViewablePastMonths: Integer32)`
- `api_GroupConnect_GetGroupApplicants(@GroupId: Integer32)`
- `api_GroupConnect_GetGroupDetails(@ImageBaseUrl: String, @GroupId: Integer32, @UserId: Integer32)`
- `api_GroupConnect_GetGroupInfoBySchedule(@ScheduleIds: Integers)`
- `api_GroupConnect_GetGroupMeetings(@GroupId: Integer32, @EventId: Integer32, @UserId: Integer32, @ImageBaseUrl: String)`
- `api_GroupConnect_GetGroupMembers(@GroupId: Integer32)`
- `api_GroupConnect_GetGroupRoles(@GroupId: Integer32)`
- `api_GroupConnect_GetGroupRsvp(@GroupId: Integer32, @EventId: Integer32, @RSVP_Status_ID: Integer32)`
- `api_GroupConnect_GetGroupSchedules(@GroupId: Integer32, @ViewablePastMonths: Integer32)`
- `api_GroupConnect_GetGroupSchedulesAttendance(@GroupId: Integer32)`
- `api_GroupConnect_GetMeetingAttendees(@MeetingId: Integer32, @GroupId: Integer32)`
- `api_GroupConnect_GetMeetingEvent(@Group_ID: Integer32, @Event_ID: Integer32)`
- `api_GroupConnect_GetMeetingSchedule(@Group_ID: Integer32, @Sequence_ID: Integer32)`
- `api_GroupConnect_GetMyGroups(@ContactId: Integer32, @ImageBaseUrl: String)`
- `api_GroupConnect_GetNotMarkedAttendanceCount(@GroupId: Integer32)`
- `api_GroupConnect_GetPendingMembers(@GroupId: Integer32)`
- `api_GroupConnect_GetScheduleAvailableContacts(@ScheduleIds: Integers)`
- `api_GroupConnect_GetScheduledMembers(@StartDate: DateTime, @EndDate: DateTime)`
- `api_GroupConnect_GetScheduleParticipants(@ScheduleId: Integer32)`
- `api_GroupConnect_GetScheduleRoles(@ScheduleId: Integer32)`
- `api_GroupConnect_GetSelfSignUpAssignments(@ContactId: Integer32)`
- `api_GroupConnect_GetUniqueNonSequenceMeetings(@GroupId: Integer32)`
- `api_GroupConnect_GetUniqueSequenceMeetings(@GroupId: Integer32)`
- `api_GroupConnect_GetVolunteerAssignments(@ContactId: Integer32)`
- `api_GroupConnect_GetVolunteerTeams(@ContactId: Integer32)`
- `api_GroupConnect_ResetStatus(@EventId: Integer32)`
- `api_GroupConnect_UpdateGroupParticipantPrivacy(@UserId: Integer32, @UserName: String, @GroupParticipantId: Integer32, @ShowBirthday: Boolean, @ShowEmail: Boolean, @ShowHomePhone: Boolean, @ShowMobilePhone: Boolean, @ShowAddress: Boolean, @ShowPhoto: Boolean)`
- `api_GroupLife_GetGroupApplicants(@GroupId: Integer32)`
- `api_GroupLife_GetGroupDetails(@ImageBaseUrl: String, @GroupId: Integer32, @UserId: Integer32)`
- `api_GroupLife_GetGroupMeetings(@GroupId: Integer32, @EventId: Integer32, @ImageBaseUrl: String)`
- `api_GroupLife_GetGroupMembers(@GroupId: Integer32)`
- `api_GroupLife_GetGroupRsvp(@GroupId: Integer32, @EventId: Integer32, @RSVP_Status_ID: Integer32)`
- `api_GroupLife_GetMeetingAttendees(@MeetingId: Integer32, @GroupId: Integer32)`
- `api_GroupLife_GetMyGroups(@ContactId: Integer32, @ImageBaseUrl: String)`
- `api_GroupLife_GetPendingMembers(@GroupId: Integer32)`
- `api_GroupLife_UpdateGroupParticipantPrivacy(@UserId: Integer32, @UserName: String, @GroupParticipantId: Integer32, @ShowBirthday: Boolean, @ShowEmail: Boolean, @ShowHomePhone: Boolean, @ShowMobilePhone: Boolean, @ShowAddress: Boolean, @ShowPhoto: Boolean)`
- `api_ImportDonation(@AccountNumber: String, @RoutingNumber: String, @EnvelopeNumber: String, @DonationAmount: Money, @DonationDate: DateTime, @PaymentTypeID: Integer32, @ItemNumber: String, @BatchID: Integer32, @DefaultProgramID: Integer32, @Notes: String)`
- `api_Integrations_GetChangedContactData(@FromDateTime: DateTime, @ToDateTime: DateTime)`
- `api_Integrations_GetChangedGroupParticipantData(@FromDateTime: DateTime, @ToDateTime: DateTime)`
- `api_Integrations_GetChangedParticipantMilestones(@FromDateTime: DateTime, @ToDateTime: DateTime)`
- `api_ListSync_AddSubscriber(@ContactID: Integer32, @PublicationID: Integer32, @SyncedListName: String)`
- `api_ListSync_GetLists(no parameters)`
- `api_ListSync_GetListSubscribers(@PublicationID: Integer32)`
- `api_ListSync_RemoveSubscriber(@ContactID: Integer32, @PublicationID: Integer32)`
- `api_MatchOrCreateContact(@FirstName: String, @LastName: String, @EmailAddress: String, @PhoneNumber: String, @Address: String, @City: String, @State: String, @Zip: String)`
- `api_MOBILE_Dashboard_Kid(no parameters)`
- `api_MOBILE_GetCareCaseDetail(@careCaseID: Integer32)`
- `api_MOBILE_GetCareCases(@showAll: Boolean)`
- `api_MOBILE_GetContactCustomFieldValue(@lookUpField: String, @recordID: Integer32)`
- `api_MOBILE_GetIncomeData(@statementHeaderID: Integer32, @year: Integer32)`
- `api_MOBILE_GetMonthAndYearData(no parameters)`
- `api_MOBILE_GetPersonFiles(@contactID: Integer32)`
- `api_MOBILE_GetYearGivingByType(@year: Integer32)`
- `api_MOBILE_PersonLookup(@searchItem: String, @searchItem2: String)`
- `api_MPP_DeleteEventGroup(@EventID: Integer32, @GroupID: Integer32)`
- `api_MPP_DeleteMeetingParticipants(@EventParticipantID: Integer32)`
- `api_MPP_DeleteRecurringDonations(@SubscriptionCode: String)`
- `api_MPP_DeleteSubscriptions(@ContactID: Integer32)`
- `api_MPP_EndDateAttributes(@ContactID: Integer32)`
- `api_MPP_FindContactsByEmail(@EmailAddress: String)`
- `api_MPP_FindGroupMembers(@FirstName: String, @LastName: String, @EmailAddress: String, @MobilePhone: String)`
- `api_MPP_FindMatchingContact(@FirstName: String, @LastName: String, @Suffix: String, @EmailAddress: String, @Phone: String, @RequireEmail: Boolean)`
- `api_MPP_FindUserByContactEmail(@EmailAddress: String)`
- `api_MPP_FindUserByUsername(@Username: String)`
- `api_MPP_GetAccountingCompanies(@CongregationID: Integer32)`
- `api_MPP_GetAttributes(@ContactID: Integer32)`
- `api_MPP_GetBackgroundCheckByReferenceNumber(@ReferenceNumber: String)`
- `api_MPP_GetCampusesMinistriesAndPurposes(@IsOnlineGiving: Boolean, @CongregationID: Integer32)`
- `api_MPP_GetCommunication(@CommunicationID: Integer32)`
- `api_MPP_GetContactByGUID(@ContactGUID: String)`
- `api_MPP_GetContactData(@ContactID: Integer32)`
- `api_MPP_GetContactFormData(@ContactID: Integer32)`
- `api_MPP_GetContactLogTypes(no parameters)`
- `api_MPP_GetCountries(no parameters)`
- `api_MPP_GetCurrencies(no parameters)`
- `api_MPP_GetDirectory(@UserContactID: Integer32, @SearchTerm: String, @StartsWith: String, @HouseholdID: Integer32, @PageNumber: Integer32)`
- `api_MPP_GetDonationBySubscriptionCode(@TransactionID: String)`
- `api_MPP_GetDonationByTransactionCode(@TransactionID: String)`
- `api_MPP_GetDonorData(@ContactID: Integer32, @DonorID: Integer32)`
- `api_MPP_GetEncryptionKey(no parameters)`
- `api_MPP_GetEventByID(@EventID: Integer32)`
- `api_MPP_GetEventFinderData(no parameters)`
- `api_MPP_GetEventProducts(@ProductID: Integer32)`
- `api_MPP_GetEvents(@Year: Integer32, @Month: Integer32, @Ministry: Integer32, @Congregation: Integer32, @HasRegistrations: Boolean, @HasVolunteerOpportunities: Boolean, @FeaturedEvents: Boolean, @GlobalCongregationID: Integer32, @ProgramID: Integer32)`
- `api_MPP_GetEvents_backup(@Year: Integer32, @Month: Integer32, @Ministry: Integer32, @Congregation: Integer32, @HasRegistrations: Boolean)`
- `api_MPP_GetEvents2(@Year: Integer32, @Month: Integer32, @Ministry: Integer32, @Congregation: Integer32, @HasRegistrations: Boolean, @HasVolunteerOpportunities: Boolean, @FeaturedEvents: Boolean, @GlobalCongregationID: Integer32)`
- `api_MPP_GetFamilyMembers(@UserID: Integer32)`
- `api_MPP_GetForm(@FormGUID: String)`
- `api_MPP_GetGroupByID(@GroupID: Integer32)`
- `api_MPP_GetGroupFinderData(@CongregationID: Integer32)`
- `api_MPP_GetGroups(@GroupTypeID: Integer32, @CongregationID: Integer32, @ParentGroupID: Integer32, @ZipCode: String, @KeyWord: String, @GroupFocus: Integer32, @LifeStage: Integer32, @Sun: Boolean, @Mon: Boolean, @Tue: Boolean, @Wed: Boolean, @Thu: Boolean, @Fri: Boolean, @Sat: Boolean, @Morning: Boolean, @LunchTime: Boolean, @Afternoon: Boolean, @Evening: Boolean, @MinistryID: Integer32, @GlobalCongregationID: Integer32)`
- `api_MPP_GetGroupsBySurvey(@ContactID: Integer32, @SurveyData: Xml)`
- `api_MPP_GetInvoiceDetailData(@InvoiceID: Integer32)`
- `api_MPP_GetMakeAPledgeCampaigns(@PledgeCampaignTypeID: Integer32, @PledgeCampaignID: Integer32)`
- `api_MPP_GetMeetingParticipants(@EventID: Integer32, @GroupID: Integer32, @ContactID: Integer32, @PendingGroupRoleID: Integer32)`
- `api_MPP_GetMissionTripParticipants(@CampaignID: Integer32)`
- `api_MPP_GetMissionTrips(@MissionTripCampaignTypeID: Integer32)`
- `api_MPP_GetMissionTripsForRegistration(@ContactID: Integer32, @MissionTripCampaignTypeID: Integer32, @PledgeCampaignID: Integer32, @SearchString: String)`
- `api_MPP_GetMyCalls(@ContactID: Integer32)`
- `api_MPP_GetMyCallsByID(@ContactID: Integer32, @ContactLogID: Integer32)`
- `api_MPP_GetMyEventByID(@EventID: Integer32, @GroupID: Integer32, @ContactID: Integer32)`
- `api_MPP_GetMyEvents(@ContactID: Integer32, @FromDate: DateTime, @ToDate: DateTime)`
- `api_MPP_GetMyGroupByID(@GroupID: Integer32, @ContactID: Integer32, @Year: Integer32, @Month: Integer32, @PendingGroupRoleID: Integer32)`
- `api_MPP_GetMyGroupInquiries(@GroupID: Integer32, @GroupInquiryID: Integer32)`
- `api_MPP_GetMyGroupMemberByID(@GroupID: Integer32, @GroupParticipantID: Integer32)`
- `api_MPP_GetMyGroupMembers(@GroupID: Integer32)`
- `api_MPP_GetMyGroups(@ContactID: Integer32)`
- `api_MPP_GetMyMissionTripByID(@PledgeID: Integer32, @ContactID: Integer32)`
- `api_MPP_GetMyMissionTripDonors(@PledgeID: Integer32, @ContactID: Integer32)`
- `api_MPP_GetMyMissionTrips(@ContactID: Integer32, @MissionTripCampaignTypeID: Integer32)`
- `api_MPP_GetMyPledges(@ContactID: Integer32)`
- `api_MPP_GetMyPublications(@ContactID: Integer32)`
- `api_MPP_GetNewMeetingData(@GroupID: Integer32, @ContactID: Integer32)`
- `api_MPP_GetOnlineGivingHistory(@ContactID: Integer32, @Month: Integer32, @Year: Integer32, @ReturnImages: Boolean)`
- `api_MPP_GetOnlineGivingStatement(@ContactID: Integer32, @StmtYr: Integer32, @AccountingCompanyID: Integer32)`
- `api_MPP_GetOnlineGivingYears(@ContactID: Integer32)`
- `api_MPP_GetOpportunities(@Ministry: Integer32, @Congregation: Integer32, @SearchTerm: String, @EventID: Integer32, @GroupRoleID: Integer32, @GlobalCongregationID: Integer32)`
- `api_MPP_GetOpportunitiesBySurvey(@ContactID: Integer32, @SurveyData: Xml)`
- `api_MPP_GetOpportunityByID(@OpportunityID: Integer32)`
- `api_MPP_GetOpportunityFinderLookupData(@CongregationID: Integer32, @MinistryID: Integer32, @GroupRoleID: Integer32, @EventID: Integer32)`
- `api_MPP_GetOpportunityFinderResults(@Ministry: Integer32, @Congregation: Integer32, @SearchTerm: String, @EventID: Integer32, @GroupRoleID: Integer32)`
- `api_MPP_GetParentGroups(@CongregationID: Integer32, @GroupTypeID: Integer32)`
- `api_MPP_GetPasswordResetData(@EmailAddress: String)`
- `api_MPP_GetPaymentByTransactionCode(@TransactionID: String)`
- `api_MPP_GetPaymentsByPaymentDetailID(@PaymentDetailID: Integer32)`
- `api_MPP_GetPledgeCampaigns(@CongregationID: Integer32)`
- `api_MPP_GetProductsAndOptions(@ProductID: Integer32, @EventID: Integer32, @IgnoreQuantities: Boolean)`
- `api_MPP_GetPromoCode(@PromoCode: String, @ProductID: Integer32, @EventID: Integer32)`
- `api_MPP_GetPurchaseHistoryData(@ContactID: Integer32, @Month: Integer32, @Year: Integer32)`
- `api_MPP_GetRSVPContacts(@GroupID: Integer32, @ParticipantData: Xml)`
- `api_MPP_GetSuffixes(no parameters)`
- `api_MPP_GetTransactionByTransactionCode(@TransactionID: String)`
- `api_MPP_GetUserByUserName(@UserName: String)`
- `api_MPP_GetUserData(@ContactID: Integer32)`
- `api_MPP_UpdateRSVP(@EventID: Integer32, @ContactGUID: String, @RSVPResponse: String, @RSVPYesStatus: Integer32, @RSVPNoStatus: Integer32, @RSVPMaybeStatus: Integer32)`
- `api_MPPW_CleanAbandonedGroupParticipants(@GroupParticipantId: Integer32)`
- `api_MPPW_GetContactInfo(@ImageBaseUrl: String, @UserId: Integer32)`
- `api_MPPW_GetDonationSubtotal(@PledgeCampaignID: Integer32)`
- `api_MPPW_GetEventById(@EventId: Integer32, @ImageBaseUrl: String, @IsStaffUser: Boolean)`
- `api_MPPW_GetEvents(@ImageBaseUrl: String, @EventIds: Integers)`
- `api_MPPW_GetFieldLists(no parameters)`
- `api_MPPW_GetInvoice(@InvoiceGuid: String)`
- `api_MPPW_GetMyContributionStatements(@ContactId: Integer32)`
- `api_MPPW_GetMyGivingHistory(@ContactId: Integer32, @Year: Integer32, @Month: Integer32)`
- `api_MPPW_GetMyGroups(@UserId: Integer32, @ImageBaseUrl: String)`
- `api_MPPW_GetMyInvoices(@ContactId: Integer32, @ImageBaseUrl: String)`
- `api_MPPW_GetMyMissionTripDonors(@PledgeCampaignTypeId: Integer32, @UserId: Integer32, @ImageBaseUrl: String)`
- `api_MPPW_GetMyMissionTrips(@UserId: Integer32, @PledgeCampaignTypeId: Integer32, @ImageBaseUrl: String)`
- `api_MPPW_GetMyMissionTripTeamProgress(@UserId: Integer32, @PledgeCampaignTypeId: Integer32, @ImageBaseUrl: String)`
- `api_MPPW_GetMyPledges(@UserId: Integer32, @ImageBaseUrl: String)`
- `api_MPPW_GetPledgeCampaign(@PledgeCampaignId: Integer32, @IsMissionTrip: Boolean, @ImageBaseUrl: String)`
- `api_MPPW_GetPreCheckEvents(@HouseholdID: Integer32, @EventDate: DateTime)`
- `api_MPPW_GetProduct(@ProductID: Integer32, @EventId: Integer32, @EventParticipantId: Integer32)`
- `api_MPPW_GetRsvpEvents(@UserID: Integer32, @EventDate: DateTime)`
- `api_MPPW_GetRsvpEventsSummary(@UserID: Integer32, @StartDate: DateTime, @EndDate: DateTime)`
- `api_MPPW_GetUnpaidInvoiceDetails(@InvoiceId: Integer32)`
- `api_MPPW_SearchEvents(@CongregationId: Integer32, @MinistryId: Integer32, @EventTypeId: Integer32, @ProgramId: Integer32, @SignupType: Integer32, @IsFeatured: Boolean, @Keyword: String, @IsStaffUser: Boolean, @MonthId: Byte)`
- `api_MPPW_SearchGroups(@ImageBaseUrl: String, @GroupId: Integer32, @GroupTypeId: Integer32, @UserId: Integer32, @CongregationId: Integer32, @MinistryId: Integer32, @ParentGroupId: Integer32, @GroupFocusId: Integer32, @LifeStageId: Integer32, @CityPostalCode: String, @Keyword: String, @DaysOfWeek: String, @Morning: Boolean, @Lunchtime: Boolean, @Afternoon: Boolean, @Evening: Boolean, @ShowFullGroups: Boolean, @CountGroupInquiries: Boolean, @ShowFutureGroups: Boolean, @ShowFullAddress: Boolean, @MeetsOnline: Boolean)`
- `api_MPPW_SearchMissionTrips(@PledgeCampaignTypeId: Integer32, @CongregationId: Integer32, @MinistryId: Integer32, @ProgramId: Integer32, @Keyword: String, @ShowFullTrips: Integer32, @ImageBaseUrl: String, @MaxResults: Integer32)`
- `api_MPPW_SearchOpportunities(@ImageBaseUrl: String, @CongregationId: Integer32, @MinistryId: Integer32, @ProgramId: Integer32, @IsStaffUser: Boolean, @EventId: Integer32, @GenderId: Integer32, @MinimumAge: Integer32, @Keyword: String, @Frequency: Byte, @AttributeIDs: String)`
- `api_MPPW_SearchSubscriptions(@ContactId: Integer32, @ImageBaseUrl: String, @SearchTerm: String, @CongregationFilter: Integer32)`
- `api_OGCC_GetAddressByUserId(@UserID: Integer32)`
- `api_OGCC_GetEncryptionKey(no parameters)`
- `api_OGCC_GetPledgeCampainsWithPledges(no parameters)`
- `api_OGCC_GetProgramsAndPaymentTypes(no parameters)`
- `api_PAPP_GetContact_JSON(@contactGUID: String)`
- `api_PAPP_VolunteerBirthdays_JSON(no parameters)`
- `api_PocketPlatform_Device_Updater(no parameters)`
- `api_PocketPlatform_Set_LatestSermonDate(no parameters)`
- `api_Tools_AppendSelection(@SelectionID: Integer32, @IDs: Text)`
- `api_Tools_CheckExistenceOfSelectionById(@SelectionId: Integer32)`
- `api_Tools_CheckExistenceOfSelectionByName(@Name: String, @PageID: Integer32, @UserID: Integer32)`
- `api_Tools_ClearSelectedRecords(@SelectionId: Integer32, @RecordId: Integer32)`
- `api_Tools_CreateAuditOnBehalfOfUser(@TableName: String, @RecordID: Integer32, @AuditDescription: String, @UserID: Integer32, @FieldName: String, @FieldLabel: String, @PreviousValue: Text, @NewValue: Text, @PreviousID: Integer32, @NewID: Integer32)`
- `api_Tools_CreateContactIdentifierLogEntry(@ContactID: Integer32, @RecordIds: Integers, @UserId: Integer32)`
- `api_Tools_CreateHouseholdIdentifierLogEntry(@HouseholdID: Integer32, @RecordIds: Integers, @UserId: Integer32)`
- `api_Tools_CreateSelection(@Name: String, @IDs: Text, @PageID: Integer32, @UserID: Integer32)`
- `api_Tools_DeleteUsers(@UserIds: String)`
- `api_Tools_GetAgeGroups(@ParticipantID: Integer32, @AgeGroupTypeID: Integer32)`
- `api_Tools_GetBatchedDonationDistributions(@SelectionId: Integer32, @BatchId: Integer32)`
- `api_Tools_GetContactsBackground(@ContactIds: String)`
- `api_Tools_GetDefaultEventParticipants(@EventId: Integer32)`
- `api_Tools_GetDepositDataToExportToRealmAccounting(@DepositID: Integer32)`
- `api_Tools_GetDomainData(no parameters)`
- `api_Tools_GetDonationPossibleMatches(@FirstName: String, @LastName: String, @Phone: String, @Email: String, @AddressLine1: String, @DateOfBirth: String)`
- `api_Tools_GetGroupAttendance(@EventId: Integer32, @GroupId: Integer32)`
- `api_Tools_GetHouseholdsWithHeads(@Search: Text)`
- `api_Tools_GetMatchingPrograms(@Program_ID: Integer32, @Program_Name: String, @Account_Number: String, @Congregation: Integer32)`
- `api_Tools_GetMergeTags(@PageId: Integer32)`
- `api_Tools_GetOrphanedHouseholds(@DeleteContactIds: String)`
- `api_Tools_GetPageData(@PageID: Integer32)`
- `api_Tools_GetPagesDataByNamesList(@Names: Text)`
- `api_Tools_GetParticipantSacramentDetails(@PageId: Integer32, @RecordId: Integer32, @SelectionId: Integer32)`
- `api_Tools_GetProduct(@ProductId: Integer32)`
- `api_Tools_GetRecordSequenceId(@TableName: String, @RecordId: Integer32)`
- `api_Tools_GetRoleAccessLevelForPages(@RoleId: Integer32)`
- `api_Tools_GetRoleAccessLevelForSubPages(@RoleId: Integer32)`
- `api_Tools_GetRoleAPIProcedures(@RoleId: Integer32)`
- `api_Tools_GetRolePages(@RoleId: Integer32)`
- `api_Tools_GetSelectedBatchSummaries(@SelectionId: Integer32, @BatchId: Integer32)`
- `api_Tools_GetSelectedContacts(@SelectionId: Integer32, @SelectFields: String)`
- `api_Tools_GetSelectedDonations(@SelectionId: Integer32, @DonationId: Integer32)`
- `api_Tools_GetSelectedDonationsSummary(@SelectionId: Integer32, @DonationId: Integer32)`
- `api_Tools_GetSelectedEventParticipants(@EventId: Integer32)`
- `api_Tools_GetSelectedPaymentsSummary(@SelectionId: Integer32, @PaymentId: Integer32)`
- `api_Tools_GetSelectedRecords(@SelectionId: Integer32)`
- `api_Tools_GetSelectionsByPageId(@PageID: Integer32, @UserID: Integer32)`
- `api_Tools_GetSequenceRecords(@TableName: String, @SequenceId: Integer32)`
- `api_Tools_GetSimilarContactCounts(@ContactId: Integer32)`
- `api_Tools_GetSimilarContacts(@ContactId: Integer32, @SelectionId: Integer32)`
- `api_Tools_GetSimilarHouseholdCounts(no parameters)`
- `api_Tools_GetSimilarHouseholds(@HouseholdId: Integer32, @SelectionId: Integer32)`
- `api_Tools_GetSubpageByTableNames(@TargetTableName: String, @ParentTableName: String)`
- `api_Tools_GetTableForeignKeys(@TableName: String, @ColumnName: String)`
- `api_Tools_GetTemplate(@TemplateId: Integer32, @UserId: Integer32)`
- `api_Tools_GetUserPages(@UserId: Integer32)`
- `api_Tools_GetUsers(@SearchTerm: String)`
- `api_Tools_GetUserSelections(@UserID: Integer32)`
- `api_Tools_GetUserTemplates(@UserId: Integer32, @CurrentTemplateId: Integer32)`
- `api_Tools_GetUserTools(@UserId: Integer32)`
- `api_Tools_LoadFormById(@FormId: Integer32)`
- `api_Tools_MoveFilesToAnotherRecord(@PageName: String, @PrimaryRecordId: Integer32, @RecordIds: String)`
- `api_Tools_NextAvailableEnvelopeNumber(@NumberOfEnvelopes: Integer32, @ContactID: Integer32, @CongregationID: Integer32)`
- `api_Tools_PostContactMergeCleanUp(@ContactID: Integer32)`
- `api_Tools_ReassignUserToContactId(@UserId: Integer32, @ContactId: Integer32)`
- `api_Tools_RemoveIdenticalGlobalFilter(@RecordIds: Integers, @UserId: Integer32)`
- `api_Tools_RemoveIdenticalUserGroup(@RecordIds: Integers, @UserId: Integer32)`
- `api_Tools_RemoveIdenticalUserRole(@RecordIds: Integers, @UserId: Integer32)`
- `api_Tools_RemoveRecordsFromSelection(@SelectionId: Integer32, @RecordIds: Text)`
- `api_Tools_RemoveSelection(@SelectionID: Integer32)`
- `api_Tools_RemoveUserDuplicates(@PrimaryUserId: Integer32, @UserIds: String)`
- `api_Tools_ReplaceSelectionRecord(@TableName: String, @PrimaryRecordId: Integer32, @ReplaceRecordId: Integer32)`
- `api_Tools_ResetContactGuids(@ContactID: Integer32, @UserID: Integer32)`
- `api_Tools_SearchEventsWithDefaultParticipants(@SearchTerm: Text)`
- `api_Tools_UpdateCertificationGUID(@ParticipantCertificationId: Integer32, @CertificationGUID: String)`
- `api_Tools_UpdateTableForeignKeys(@TableName: String, @ColumnName: String, @PrimaryRecordId: Integer32, @RecordIds: String, @UserId: Integer32)`
- `api_Tools_User_Page_Access(@UserId: Integer32, @TableName: String, @PageName: String)`
- `api_UpdateDonationInfo(@DonationID: Integer32, @ContactID: Integer32, @DonorID: Integer32, @Amount1: Money, @Amount2: Money, @Amount3: Money, @Amount4: Money, @Program1: Integer32, @Program2: Integer32, @Program3: Integer32, @Program4: Integer32, @Event1: Integer32, @Event2: Integer32, @Event3: Integer32, @Event4: Integer32, @DonorAccountID: Integer32)`
- `api_UpDateInvoiceStatus(@Invoice_ID: Integer32, @Invoice_Status: Integer32)`
- `api_Upgrade_GetFileList(no parameters)`
- `api_XMLTool_GetBatchSummaryData(@BatchID: Integer32)`
- `api_XMLTool_GetDonationData(@DonationID: Integer32)`
- `api_XMLTool_ImportDonation(@AccountNumber: String, @RoutingNumber: String, @EnvelopeNumber: String, @DonationAmount: Money, @DonationDate: DateTime, @PaymentTypeID: Integer32, @ItemNumber: String, @BatchID: Integer32, @DefaultProgramID: Integer32, @Notes: String)`
- `api_XMLTool_LookupDonor(@SearchTerm: String)`
- `api_XMLTool_UpdateDonationInfo(@DonationID: Integer32, @ContactID: Integer32, @DonorID: Integer32, @Amount1: Money, @Amount2: Money, @Amount3: Money, @Amount4: Money, @Program1: Integer32, @Program2: Integer32, @Program3: Integer32, @Program4: Integer32, @Event1: Integer32, @Event2: Integer32, @Event3: Integer32, @Event4: Integer32, @DonorAccountID: Integer32)`

### service_* (2 procedures)

- `service_data_quality_assign_pledge(@BatchId: Integer32)`
- `service_notification_attendance(no parameters)`

### util_* (4 procedures)

- `util_CreateContact(@UpdateExisting: Boolean, @IgnoreDupes: Boolean, @FirstName: String, @LastName: String, @DateOfBirth: Date, @EmailAddress: String, @MobilePhone: String, @HomePhone: String, @AddressLine1: String, @AddressLine2: String, @City: String, @State: String, @Zip: String, @CongregationID: Integer32, @DoNotContact: Boolean, @InternalKey: String)`
- `util_MergeSecurityRoles(@RoleID2Keep: Integer32, @RoleID2Combine: Integer32)`
- `util_mfa_key_configured(@hostName: String, @secureSettingId: Integer32)`
- `util_migrate_Connection(@secureSettingId: Integer32, @domainConnectionId: Integer32)`

---

## Detailed Reference

Full parameter details for each stored procedure.

### api_*

#### api_Advanced_EventsAndRoomsByRecord

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RecordID | Input | Integer32 | -1 |

#### api_Advanced_GetRecurringItems

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SequenceID | Input | Integer32 | -1 |

#### api_Advanced_GetRecurringSequenceTables

No parameters.

#### api_Advanced_GetRecurringSeries

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 50 |

#### api_Advanced_GetSubPageRecords

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ParentTableName | Input | String | 75 |
| @ParentRecordID | Input | Integer32 | -1 |

#### api_BatchManager_AutoAssignPledges

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchId | Input | Integer32 | -1 |

#### api_BatchManager_CreateFromMemorizedBatch

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MemorizedBatchId | Input | Integer32 | -1 |
| @UserId | Input | Integer32 | -1 |

#### api_BatchManager_GetBatchImages

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchIds | Input | Text | -1 |

#### api_BatchManager_GetDuplicateChecks

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchId | Input | Integer32 | -1 |

#### api_BatchManager_IgnoreDuplicateCheck

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonationId | Input | Integer32 | -1 |

#### api_BatchManager_SetDonationScanMode

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonationId | Input | Integer32 | -1 |
| @IsCheckScan | Input | Boolean | -1 |

#### api_BatchManager_UpdatePledgeReadonlyValues

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PledgeId | Input | Integer32 | -1 |
| @Frequency | Input | Integer32 | -1 |

#### api_CareConnect_GetCareCases

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @ApiUrl | Input | String | 500 |
| @SelectAll | Input | Boolean | -1 |

#### api_CareConnect_GetCareConnectStats

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_CareConnect_GetHouseholds

No parameters.

#### api_CareConnect_SearchHouseholds

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @LastName | Input | String | 50 |
| @FirstName | Input | String | 50 |
| @ApiUrl | Input | String | 500 |

#### api_CareLife_GetCareCases

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @ApiUrl | Input | String | 500 |
| @SelectAll | Input | Boolean | -1 |

#### api_CareLife_GetCareLifeStats

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_CareLife_SearchHouseholds

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @LastName | Input | String | 50 |
| @FirstName | Input | String | 50 |
| @ApiUrl | Input | String | 500 |

#### api_CareSuite_GetCareCases

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @ApiUrl | Input | String | 500 |
| @SelectAll | Input | Boolean | -1 |

#### api_CheckIn_GetActivitiesInScope

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ActivityList | Input | String | 2000 |

#### api_CheckIn_GetCheckInEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @LocalTime | Input | DateTime | -1 |
| @CongregationID | Input | Integer32 | -1 |
| @MinistryID | Input | Integer32 | -1 |

#### api_CheckIn_GetCheckInMatches

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FirstName | Input | String | 25 |
| @LastName | Input | String | 25 |
| @PhoneNumber | Input | String | 25 |
| @ActivityList | Input | String | 200 |
| @CheckedInStatus | Input | Integer32 | -1 |
| @HouseholdID | Input | Integer32 | -1 |
| @CardID | Input | String | 50 |
| @IsAttended | Input | Boolean | -1 |
| @DefaultEarlyCheckIn | Input | Integer16 | -1 |
| @DefaultLateCheckIn | Input | Integer16 | -1 |
| @StopMsg | Input | String | 50 |
| @GuestMsg | Input | String | 50 |
| @NoEventMsg | Input | String | 50 |
| @LocalTime | Input | DateTime | -1 |

#### api_CheckIn_GetCongregations

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BlankParam | Input | String | 50 |

#### api_CheckIn_GetCongregationsAndMinistries

No parameters.

#### api_CheckIn_GetDefaultGroupRole

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupID | Input | Integer32 | -1 |

#### api_CheckIn_GetGroupsByActivity

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |

#### api_CheckIn_GetHouseholdMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | Integer32 | -1 |

#### api_CheckIn_GetHouseholdRecord

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | Integer32 | -1 |

#### api_CheckIn_GetLabelData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CheckInData | Input | Xml | -1 |
| @AllergyAttributeID | Input | Integer32 | -1 |
| @CallNumberType | Input | Integer32 | -1 |
| @CallNumberChar | Input | Integer32 | -1 |

#### api_CheckIn_GetOrCreateParticipant

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @DefaultParticipantTypeID | Input | Integer32 | -1 |

#### api_CheckIn2_GetActivitiesInScope

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ActivityList | Input | String | 2000 |

#### api_CheckIn2_GetCheckInEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @LocalTime | Input | DateTime | -1 |
| @CongregationID | Input | Integer32 | -1 |
| @MinistryID | Input | Integer32 | -1 |

#### api_CheckIn2_GetCheckInHouseholdsFromSharedID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ActivityList | Input | String | 200 |
| @CardID | Input | String | 50 |
| @IsAttended | Input | Boolean | -1 |
| @LocalTime | Input | DateTime | -1 |
| @HouseholdID | Input | Integer32 | -1 |
| @FirstName | Input | String | 25 |
| @LastName | Input | String | 25 |
| @PhoneNumber | Input | String | 25 |

#### api_CheckIn2_GetCheckInMatchesFromSharedID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ActivityList | Input | String | 200 |
| @CardID | Input | String | 50 |
| @IsAttended | Input | Boolean | -1 |
| @LocalTime | Input | DateTime | -1 |
| @HouseholdID | Input | Integer32 | -1 |
| @FirstName | Input | String | 25 |
| @LastName | Input | String | 25 |
| @PhoneNumber | Input | String | 25 |

#### api_CheckIn2_GetCheckInMatchesFromUniqueID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ActivityList | Input | String | 200 |
| @CardID | Input | String | 50 |
| @HouseholdID | Input | Integer32 | -1 |
| @IsAttended | Input | Boolean | -1 |
| @LocalTime | Input | DateTime | -1 |

#### api_CheckIn2_GetCongregations

No parameters.

#### api_CheckIn2_GetCongregationsAndMinistries

No parameters.

#### api_CheckIn2_GetDefaultGroupRole

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupID | Input | Integer32 | -1 |

#### api_CheckIn2_GetDropDownData

No parameters.

#### api_CheckIn2_GetGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |
| @MinistryID | Input | Integer32 | -1 |

#### api_CheckIn2_GetGroupsByActivity

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |
| @AgeMonths | Input | Integer32 | -1 |

#### api_CheckIn2_GetHouseholdMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |

#### api_CheckIn2_GetHouseholdRecord

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | Integer32 | -1 |

#### api_CheckIn2_GetLabelData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CheckInData | Input | Xml | -1 |
| @AllergyAttributeID | Input | Integer32 | -1 |
| @CallNumberType | Input | Integer32 | -1 |
| @CallNumberChar | Input | Integer32 | -1 |

#### api_CheckIn2_GetMinistries

No parameters.

#### api_CheckIn2_GetOrCreateParticipant

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @DefaultParticipantTypeID | Input | Integer32 | -1 |

#### api_CheckIn2_GetRooms

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |

#### api_CheckScan_DeleteBatch

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchID | Input | Integer32 | -1 |

#### api_CheckScan_DeleteDistribution

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DistributionID | Input | Integer32 | -1 |

#### api_CheckScan_DeleteDonation

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonationID | Input | Integer32 | -1 |

#### api_CheckScan_FindDonor

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @LastNameOrCompany | Input | String | 25 |
| @AddressLine1 | Input | String | 25 |
| @EnvelopeNumber | Input | String | 25 |
| @AccountNumber | Input | String | 25 |
| @RoutingNumber | Input | String | 25 |

#### api_CheckScan_FindDonorAccount

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @AccountNumber | Input | String | 50 |
| @RoutingNumber | Input | String | 50 |
| @ContactID | Input | Integer32 | -1 |

#### api_CheckScan_FindDonorAccounts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CheckData | Input | Xml | -1 |

#### api_CheckScan_FindMatchingContact

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FirstName | Input | String | 50 |
| @LastName | Input | String | 50 |
| @Phone | Input | String | 50 |
| @AddressLine1 | Input | String | 75 |

#### api_CheckScan_FindPledgesByDonorID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonorID | Input | Integer32 | -1 |

#### api_CheckScan_FindPledgesByEventID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |

#### api_CheckScan_GetBatchByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchID | Input | Integer32 | -1 |

#### api_CheckScan_GetBatchSummaries

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_CheckScan_GetDonorHistory

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonorID | Input | Integer32 | -1 |

#### api_CheckScan_GetLookupData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventTypeID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |

#### api_CIM_GetCheckInHouseholds

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SearchTerm | Input | String | 50 |
| @RestrictToEventList | Input | String | 2000 |
| @IsAttended | Input | Boolean | -1 |
| @HouseholdId | Input | Integer32 | -1 |
| @AllowPhoneNumber | Input | Boolean | -1 |
| @AllowIdCardBarcode | Input | Boolean | -1 |
| @AllowLastName | Input | Boolean | -1 |

#### api_CIM_GetCheckInResults

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | Integer32 | -1 |
| @EventList | Input | Text | -1 |
| @IsAttended | Input | Boolean | -1 |
| @ID_Card | Input | String | 50 |
| @GuestContactID | Input | Integer32 | -1 |

#### api_CIM_GetCheckInRooms

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventList | Input | String | 2000 |
| @ActiveOnly | Input | Boolean | -1 |

#### api_CIM_GetDomainTimezone

No parameters.

#### api_Classroom_GetCongregations

No parameters.

#### api_Classroom_GetDropDownData

No parameters.

#### api_Classroom_GetEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupsList | Input | Xml | -1 |

#### api_Classroom_GetFriendsAndFamily

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_Classroom_GetGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |
| @MinistryID | Input | Integer32 | -1 |

#### api_Classroom_GetParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ParticipationStatusID | Input | Integer32 | -1 |
| @EventID | Input | Integer32 | -1 |
| @GroupsList | Input | Xml | -1 |
| @SearchTerm | Input | String | 75 |
| @DataPageIndex | Input | Integer16 | -1 |
| @GroupRoleTypeID | Input | Integer32 | -1 |

#### api_Classroom_GetRooms

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupsList | Input | Xml | -1 |
| @CongregationID | Input | Integer32 | -1 |

#### api_CloudApps_GetDomainInfo

No parameters.

#### api_CloudServices_GetContactsToInactivate

No parameters.

#### api_CloudServices_GetContactsToReactivate

No parameters.

#### api_CloudServices_GetStats

No parameters.

#### api_CloudTools_AddAuditLog

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 50 |
| @RecordID | Input | Integer32 | -1 |
| @AuditDescription | Input | String | 50 |
| @UserName | Input | String | 254 |
| @UserID | Input | Integer32 | -1 |
| @FieldName | Input | String | 50 |
| @FieldLabel | Input | String | 50 |
| @PreviousValue | Input | Text | -1 |
| @NewValue | Input | Text | -1 |

#### api_CloudTools_CreateSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionName | Input | String | 50 |

#### api_CloudTools_CreateSelectionRecords

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @Records | Input | Xml | -1 |

#### api_CloudTools_ExportDeposit_BANKONE

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @NameID | Input | Integer32 | -1 |

#### api_CloudTools_ExportDeposit_GetDataForShelbyGLTRN2000

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionID | Input | Integer32 | -1 |
| @BankID | Input | Integer32 | -1 |
| @AccountingPeriod | Input | String | 2 |

#### api_CloudTools_GetDomainGUID

No parameters.

#### api_CloudTools_GetPageData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @pageID | Input | Integer32 | -1 |

#### api_CloudTools_GetSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |

#### api_CloudTools_GetSelections

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |

#### api_CloudTools_GetUserTools

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_CloudTools_ResetUserSecurity

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |

#### api_CloudTools_UpdateCommunicationMessage

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CommunicationMessageID | Input | Integer32 | -1 |
| @StatusID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |

#### api_Common_FindMatchingContact

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FirstName | Input | String | 50 |
| @LastName | Input | String | 50 |
| @Suffix | Input | String | 10 |
| @EmailAddress | Input | String | 150 |
| @Phone | Input | String | 50 |
| @RequireEmail | Input | Boolean | -1 |

#### api_Common_GenerateSlug

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 50 |
| @RecordID | Input | Integer32 | -1 |
| @SubPage | Input | String | 50 |

#### api_Common_GetConfigurationLists

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ApplicationCode | Input | String | 50 |

#### api_Common_GetConfigurationSettings

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ApplicationCode | Input | String | 50 |
| @KeyName | Input | String | 50 |

#### api_Common_GetCongregations

No parameters.

#### api_Common_GetContact_PKFK

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @NextTable | Input | String | 150 |
| @RefField | Input | String | 150 |

#### api_Common_GetContactByEmail

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EmailAddress | Input | String | 254 |

#### api_Common_GetContactHouseholdInfo

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | String | 11 |

#### api_Common_GetContactLookupData

No parameters.

#### api_Common_GetDataRecord

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 75 |
| @RecordId | Input | Integer32 | -1 |

#### api_Common_GetDDLRelationships

No parameters.

#### api_Common_GetDomainConfigurationInfo

No parameters.

#### api_Common_GetEventsInSeries

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |

#### api_Common_GetMatchingContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FirstName | Input | String | 50 |
| @LastName | Input | String | 50 |
| @EmailAddress | Input | String | 150 |
| @Phone | Input | String | 50 |
| @AddressLine1 | Input | String | 75 |
| @City | Input | String | 75 |
| @Zip | Input | String | 75 |
| @StateRegion | Input | String | 75 |

#### api_Common_GetPageID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 50 |

#### api_Common_GetSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |

#### api_Common_GetStandardStatement

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @StatementID | Input | Integer32 | -1 |

#### api_Common_GetUserRecord

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_Common_GetUserRecordFromGUID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserGUID | Input | Guid | -1 |

#### api_Common_GetUserRoles

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_Common_StoredProcParameters

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ProcName | Input | String | 128 |

#### api_CORE_AuthenticateContactGUID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DomainGUID | Input | String | 40 |
| @ContactGUID | Input | String | 40 |

#### api_CORE_AuthenticateUser

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserName | Input | String | 256 |
| @Password | Input | String | 256 |

#### api_CORE_AuthenticateUserGUID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DomainGUID | Input | String | 40 |
| @UserGUID | Input | String | 40 |

#### api_CORE_FindContactByMobile

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MobilePhone | Input | String | 50 |

#### api_CORE_FindContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MobilePhone | Input | String | 50 |
| @EmailAddress | Input | String | 256 |

#### api_CORE_GetDDLData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @tableName | Input | String | 255 |
| @filterRequest | Input | String | 255 |

#### api_CORE_GetDomainData

No parameters.

#### api_CORE_GetGroupContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @groupID | Input | Integer32 | -1 |

#### api_CORE_GetGroupDetails

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @groupID | Input | Integer32 | -1 |

#### api_CORE_GetGroupParticipant

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @groupID | Input | Integer32 | -1 |
| @contactID | Input | Integer32 | -1 |

#### api_CORE_GetLookupValuesData

No parameters.

#### api_CORE_GetMyGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_CORE_GetPageID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @page | Input | String | 255 |

#### api_CORE_GetPrimaryKey

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 40 |

#### api_CORE_GetReAuth

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_CORE_GetRecordFile

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @tableName | Input | String | 255 |
| @recordID | Input | Integer32 | -1 |
| @defaultImage | Input | Integer32 | -1 |
| @thumbnailImage | Input | Integer32 | -1 |

#### api_CORE_GetRichPerson

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @contactID | Input | Integer32 | -1 |

#### api_CORE_GetRoleContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @roleID | Input | Integer32 | -1 |

#### api_CORE_GetTableData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @tableName | Input | String | 255 |
| @primaryKey | Input | String | 64 |
| @recordID | Input | Integer32 | -1 |
| @filterRequest | Input | String | 255 |
| @orderBy | Input | String | 255 |
| @orderByDesc | Input | Integer32 | -1 |
| @topCount | Input | Integer32 | -1 |

#### api_CORE_GetTemplate

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TemplateID | Input | Integer32 | -1 |

#### api_CORE_GetUserGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_CORE_GetUserRoles

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_CoreTool_ACH_GetCompanies

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_CoreTool_ACH_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @AccountingCompanyID | Input | Integer32 | -1 |
| @ACHPaymentTypeID | Input | Integer32 | -1 |
| @DayOfMonth | Input | Integer32 | -1 |

#### api_CoreTool_AddFamily_GetDropDownData

No parameters.

#### api_CoreTool_AddFamily_GetHousehold

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | Integer32 | -1 |

#### api_CoreTool_AssignDonor_GetDonations

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_AssignEnvelopeNumber

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_AssignParticipant_CleanUp

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventParticipantID | Input | Integer32 | -1 |

#### api_CoreTool_AssignParticipant_GetEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SearchTerm | Input | String | 50 |
| @EventID | Input | Integer32 | -1 |

#### api_CoreTool_AssignParticipant_GetRegistrations

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_BatchImport_GetContactBySysID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonorSysID | Input | Integer32 | -1 |

#### api_CoreTool_BatchImport_GetProgramIdByAccountNumber

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @AccountNumber | Input | String | 5 |

#### api_CoreTool_ChangeCongregation

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_CombineGroupParticipants_Delete

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupParticipantIDToDelete | Input | Integer32 | -1 |
| @GroupParticipantIDToKeep | Input | Integer32 | -1 |

#### api_CoreTool_CombineGroupParticipants_GetAttendance

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupParticipantIDToDelete | Input | Integer32 | -1 |

#### api_CoreTool_CombineGroupParticipants_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_Common_CreateGeography

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @AddressID | Input | Integer32 | -1 |

#### api_CoreTool_Common_CreateSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @CurrentSelectionID | Input | Integer32 | -1 |
| @NewSelectionName | Input | String | 50 |
| @ContactIDList | Input | Text | -1 |
| @AddPrimaryFamily | Input | Boolean | -1 |

#### api_CoreTool_Common_DeleteRecord

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 100 |
| @PrimaryKey | Input | String | 100 |
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_Common_GetCongregations

No parameters.

#### api_CoreTool_Common_GetContactForPage

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @pageID | Input | Integer32 | -1 |
| @recordID | Input | Integer32 | -1 |
| @ContactField | Input | String | 150 |
| @Table1Field | Input | String | 150 |

#### api_CoreTool_Common_GetContactForPage_Backup

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @pageID | Input | Integer32 | -1 |
| @recordID | Input | Integer32 | -1 |
| @ContactField | Input | String | 150 |
| @Table1Field | Input | String | 150 |

#### api_CoreTool_Common_GetContactInfo

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_CoreTool_Common_GetContactRelationships

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID1 | Input | Integer32 | -1 |
| @ContactID2 | Input | Integer32 | -1 |
| @RelationshipID | Input | Integer32 | -1 |

#### api_CoreTool_Common_GetCopyRecord_Data

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @recordID | Input | Integer32 | -1 |
| @TableName | Input | String | 50 |

#### api_CoreTool_Common_GetDonationsBySubscriptionCode

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SubscriptionCode | Input | String | 50 |

#### api_CoreTool_Common_GetDonor

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonorID | Input | Integer32 | -1 |

#### api_CoreTool_Common_GetFKRecords

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 100 |
| @PrimaryKey | Input | String | 100 |
| @ForeignKey | Input | String | 100 |
| @OldRecordID | Input | Integer32 | -1 |

#### api_CoreTool_Common_GetHouseholdForContact

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_CoreTool_Common_GetParticipant

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ParticipantID | Input | Integer32 | -1 |

#### api_CoreTool_Common_GetParticipantTypes

No parameters.

#### api_CoreTool_Common_GetPKFK

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 100 |

#### api_CoreTool_Common_GetProgramsByCongregation

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |

#### api_CoreTool_Common_GetTableInfo

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 100 |

#### api_CoreTool_Common_GetUserByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @userID | Input | Integer32 | -1 |

#### api_CoreTool_Common_GetUsersWithRoles

No parameters.

#### api_CoreTool_Common_GetUserTools

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_CoreTool_Common_UpdateFileRecords

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Page | Input | String | 100 |
| @OldRecordID | Input | Integer32 | -1 |
| @NewRecordID | Input | Integer32 | -1 |

#### api_CoreTool_Common_UpdateRecords

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 100 |
| @ColumnName | Input | String | 100 |
| @MasterRecord | Input | Integer32 | -1 |
| @MergeRecord | Input | Integer32 | -1 |

#### api_CoreTool_ConnectionCard_GetDropDownData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |

#### api_CoreTool_ConnectionCard_GetFamilyMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | Integer32 | -1 |

#### api_CoreTool_ConnectionCard_GetHouseholds

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @LastName | Input | String | 50 |
| @FirstName | Input | String | 50 |

#### api_CoreTool_ContactMerge_CleanUp

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_CoreTool_ContactMerge_FindDuplicates

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |

#### api_CoreTool_ContactMerge_FindDuplicates_SDM

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_CoreTool_ContactMerge_GetContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactsXML | Input | Xml | -1 |
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |

#### api_CoreTool_ContactMerge_Prepare_Contact

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MasterContactID | Input | Integer32 | -1 |
| @MergeContactID | Input | Integer32 | -1 |

#### api_CoreTool_ContactMerge_Prepare_Donor

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MasterDonorID | Input | Integer32 | -1 |
| @MergeDonorID | Input | Integer32 | -1 |

#### api_CoreTool_ContactMerge_Prepare_Participant

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MasterParticipantID | Input | Integer32 | -1 |
| @MergeParticipantID | Input | Integer32 | -1 |

#### api_CoreTool_ContactMerge_Prepare_User

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MasterUserID | Input | Integer32 | -1 |
| @MergeUserID | Input | Integer32 | -1 |

#### api_CoreTool_ContactTool_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Mode | Input | String | 50 |
| @itemID | Input | Integer32 | -1 |
| @pageID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |

#### api_CoreTool_CopyBatch_CheckBatchName

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchName | Input | String | 75 |

#### api_CoreTool_CopyBatch_GetBatchData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @recordID | Input | Integer32 | -1 |

#### api_CoreTool_CopyBatch_GetDonationDistributions

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonationID | Input | Integer32 | -1 |

#### api_CoreTool_CreateParticipant

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_DeceasedPerson_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_DeleteFiles_DeleteFile

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DeleteFileID | Input | Integer32 | -1 |

#### api_CoreTool_DeleteFiles_GetFiles

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_DonationImport_AddUpdateDonorAddress

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @AddressID | Input | Integer32 | -1 |
| @AddressLine1 | Input | String | 75 |
| @AddressLine2 | Input | String | 75 |
| @City | Input | String | 50 |
| @StateRegion | Input | String | 50 |
| @PostalCode | Input | String | 15 |

#### api_CoreTool_DonationImport_FindContact

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @LastName | Input | String | 50 |
| @FirstName | Input | String | 50 |

#### api_CoreTool_DonationImport_FindDonorAddress

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @AddressLine1 | Input | String | 75 |
| @City | Input | String | 50 |
| @PostalCode | Input | String | 15 |

#### api_CoreTool_DonationImport_FindDonorsSpouse

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonorID | Input | Integer32 | -1 |

#### api_CoreTool_DonationImport_GetAddressByDonorID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonorID | Input | Integer32 | -1 |

#### api_CoreTool_DonationImport_GetBatchSummaryData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchID | Input | Integer32 | -1 |

#### api_CoreTool_DonationImport_GetCongregations

No parameters.

#### api_CoreTool_DonationImport_GetPaymentTypes

No parameters.

#### api_CoreTool_DonationImport_GetPrograms

No parameters.

#### api_CoreTool_DonationImport_GetProjects

No parameters.

#### api_CoreTool_DonationImport_GetRelationshipID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RelationshipName | Input | String | 50 |

#### api_CoreTool_DonationImport_GetUnfinalizedBatches

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchSearchString | Input | String | 64 |

#### api_CoreTool_DonationImport_ImportDonation

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @AccountNumber | Input | String | 50 |
| @RoutingNumber | Input | String | 50 |
| @EnvelopeNumber | Input | String | 15 |
| @DonationAmount | Input | Money | -1 |
| @DonationDate | Input | DateTime | -1 |
| @PaymentTypeID | Input | Integer32 | -1 |
| @ItemNumber | Input | String | 15 |
| @BatchID | Input | Integer32 | -1 |
| @DefaultProgramID | Input | Integer32 | -1 |
| @Notes | Input | String | 255 |

#### api_CoreTool_DonationImport_IsMarriedHeadHousehold

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonorID | Input | Integer32 | -1 |

#### api_CoreTool_DonationImport_LookupDonor

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SearchTerm | Input | String | 50 |

#### api_CoreTool_DonationImport_UpdateDonationInfo

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonationID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |
| @DonorID | Input | Integer32 | -1 |
| @Amount1 | Input | Money | -1 |
| @Amount2 | Input | Money | -1 |
| @Amount3 | Input | Money | -1 |
| @Amount4 | Input | Money | -1 |
| @Amount5 | Input | Money | -1 |
| @Program1 | Input | Integer32 | -1 |
| @Program2 | Input | Integer32 | -1 |
| @Program3 | Input | Integer32 | -1 |
| @Program4 | Input | Integer32 | -1 |
| @Program5 | Input | Integer32 | -1 |
| @Event1 | Input | Integer32 | -1 |
| @Event2 | Input | Integer32 | -1 |
| @Event3 | Input | Integer32 | -1 |
| @Event4 | Input | Integer32 | -1 |
| @Event5 | Input | Integer32 | -1 |
| @DonorAccountID | Input | Integer32 | -1 |

#### api_CoreTool_EventMetrics_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @eventID | Input | Integer32 | -1 |
| @ministryID | Input | Integer32 | -1 |
| @metricID | Input | Integer32 | -1 |
| @groupID | Input | Integer32 | -1 |

#### api_CoreTool_ExportDeposit_GetDataForBANKONE

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @DomainGUID | Input | String | 40 |
| @UserGUID | Input | String | 40 |
| @NameID | Input | Integer32 | -1 |

#### api_CoreTool_ExportDeposit_GetDataForBANKONE_Standard

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @DomainGUID | Input | String | 40 |
| @UserGUID | Input | String | 40 |

#### api_CoreTool_ExportDeposit_GetDataForQuickBooks

No parameters.

#### api_CoreTool_ExportDeposit_GetDataForShelbyGLTRN2000

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionID | Input | Integer32 | -1 |
| @BankID | Input | Integer32 | -1 |
| @AccountingPeriod | Input | String | 2 |

#### api_CoreTool_ExportDeposit_UpdateDepositClearSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @UserGUID | Input | String | 40 |

#### api_CoreTool_ExportDeposti_GetBanks

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BankID | Input | Integer32 | -1 |

#### api_CoreTool_FormResponse_GetDDL

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |
| @FormID | Input | Integer32 | -1 |

#### api_CoreTool_FormResponses

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FormID | Input | Integer32 | -1 |
| @EventID | Input | Integer32 | -1 |
| @FromDate | Input | DateTime | -1 |
| @ToDate | Input | DateTime | -1 |

#### api_CoreTool_FormResponses_FromEvent

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |
| @FromDate | Input | DateTime | -1 |
| @ToDate | Input | DateTime | -1 |

#### api_CoreTool_FormResponses_FromOpportunity

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @OpportunityID | Input | Integer32 | -1 |
| @FromDate | Input | DateTime | -1 |
| @ToDate | Input | DateTime | -1 |

#### api_CoreTool_FormResponses_FromPledgeCampaign

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PledgeCampaignID | Input | Integer32 | -1 |
| @FromDate | Input | DateTime | -1 |
| @ToDate | Input | DateTime | -1 |

#### api_CoreTool_FormViewer_GetFormGuid

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FormID | Input | Integer32 | -1 |

#### api_CoreTool_GetGroupParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @groupID | Input | Integer32 | -1 |
| @eventID | Input | Integer32 | -1 |

#### api_CoreTool_GetPageInfo

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @pageID | Input | Integer32 | -1 |

#### api_CoreTool_GetParticipantData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_GetPledgeData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @donorID | Input | Integer32 | -1 |

#### api_CoreTool_GetResetSecurityData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Mode | Input | String | 50 |
| @itemID | Input | Integer32 | -1 |
| @userID | Input | Integer32 | -1 |
| @pageID | Input | Integer32 | -1 |

#### api_CoreTool_GetSubscriptions

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_CoreTool_GetSuffixes

No parameters.

#### api_CoreTool_GroupAttendance_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @recordID | Input | Integer32 | -1 |
| @MinistryID | Input | Integer32 | -1 |

#### api_CoreTool_GroupAttendance_GetGroupParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @groupID | Input | Integer32 | -1 |
| @eventID | Input | Integer32 | -1 |

#### api_CoreTool_GroupAttendance_GetSingleData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @groupParticipantID | Input | Integer32 | -1 |
| @eventID | Input | Integer32 | -1 |

#### api_CoreTool_Impersonate_GetContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_Impersonate_GetUsers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |
| @RecordID | Input | Integer32 | -1 |
| @SearchString | Input | String | 75 |

#### api_CoreTool_Inactivate_GetContactPublications

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_CoreTool_Inactivate_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Mode | Input | String | 50 |
| @itemID | Input | Integer32 | -1 |
| @userID | Input | Integer32 | -1 |
| @pageID | Input | Integer32 | -1 |

#### api_CoreTool_Inactivate_GetUserRoles

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_CoreTool_LookUpDonor

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SearchTerm | Input | String | 50 |

#### api_CoreTool_MailChimpSync_FindContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Data | Input | Xml | -1 |

#### api_CoreTool_MailChimpSync_FindSubscribers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PublicationID | Input | Integer32 | -1 |
| @Data | Input | Xml | -1 |

#### api_CoreTool_MailChimpSync_GetContactsByEmail

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Email | Input | String | 256 |

#### api_CoreTool_MailChimpSync_GetPublications

No parameters.

#### api_CoreTool_MailChimpSync_GetSubscriberByEmail

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Email | Input | String | 256 |
| @PublicationID | Input | Integer32 | -1 |

#### api_CoreTool_MailChimpSync_GettPublicationSubscribers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PublicationID | Input | Integer32 | -1 |

#### api_CoreTool_MapSelection_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |

#### api_CoreTool_PAV_GetAddresses

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @AddressesPageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @PageNumber | Input | Integer32 | -1 |
| @ReturnIndividuals | Input | Boolean | -1 |

#### api_CoreTool_PAV_GetAddresses_OLD

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @AddressesPageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @PageNumber | Input | Integer32 | -1 |

#### api_CoreTool_RegistrationManager_FindPayer

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SearchTerm | Input | String | 50 |
| @EventParticipantID | Input | Integer32 | -1 |

#### api_CoreTool_RegistrationManager_GetEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SearchTerm | Input | String | 50 |
| @EventID | Input | Integer32 | -1 |

#### api_CoreTool_RegistrationManager_GetParticipantData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventParticipantID | Input | Integer32 | -1 |

#### api_CoreTool_RegistrationManager_GetParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |

#### api_CoreTool_ResetUserSecurity

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_CoreTool_ReverseDonation_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @RecordID | Input | Integer32 | -1 |

#### api_CoreTool_RollScan_GetEventInfoByEventID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |

#### api_CoreTool_RollScan_GetGroupParticipantByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupParticipantID | Input | Integer32 | -1 |

#### api_CoreTool_RollScan_GetParticipationStatuses

No parameters.

#### api_CoreTool_RollScan_IsEventParticipant

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |
| @GroupParticipantID | Input | Integer32 | -1 |

#### api_CoreTool_TransferSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @CurrentSelectionID | Input | Integer32 | -1 |
| @TargetPageName | Input | String | 50 |
| @TargetPageID | Input | Integer32 | -1 |
| @TargetSelectionID | Input | Integer32 | -1 |
| @NewSelectionName | Input | String | 50 |
| @Remove | Input | Boolean | -1 |
| @Heads | Input | Boolean | -1 |
| @NonCustodialHeads | Input | Boolean | -1 |
| @CreateMissingRecords | Input | Boolean | -1 |

#### api_CoreTool_TransferSelection_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionID | Input | Integer32 | -1 |
| @PageID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |

#### api_CoreTool_TrimSelection_GetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |
| @SelectionID | Input | Integer32 | -1 |
| @ContactStatusID | Input | Integer32 | -1 |
| @MaritalStatusID | Input | Integer32 | -1 |
| @GenderID | Input | Integer32 | -1 |
| @AgeFrom | Input | Integer32 | -1 |
| @AgeTo | Input | Integer32 | -1 |
| @HouseholdPositionID | Input | Integer32 | -1 |
| @CongregationID | Input | Integer32 | -1 |
| @ParticipantTypeID | Input | Integer32 | -1 |
| @MinistryID | Input | Integer32 | -1 |
| @GroupTypeID | Input | Integer32 | -1 |
| @GroupRoleTypeID | Input | Integer32 | -1 |
| @GroupRoleID | Input | Integer32 | -1 |
| @GroupID | Input | Integer32 | -1 |
| @PublicationIDCurrent | Input | Integer32 | -1 |
| @PublicationIDPrevious | Input | Integer32 | -1 |

#### api_CoreTool_TrimSelection_GetDropDownData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MinistryID | Input | Integer32 | -1 |
| @GroupTypeID | Input | Integer32 | -1 |
| @GroupRoleTypeID | Input | Integer32 | -1 |

#### api_CoreTool_TrimSelection_Trim

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionID | Input | Integer32 | -1 |
| @FunctionName | Input | String | 75 |
| @ContactStatusID | Input | Integer32 | -1 |
| @MaritalStatusID | Input | Integer32 | -1 |
| @GenderID | Input | Integer32 | -1 |
| @AgeFrom | Input | Integer32 | -1 |
| @AgeTo | Input | Integer32 | -1 |
| @HouseholdPositionID | Input | Integer32 | -1 |
| @CongregationID | Input | Integer32 | -1 |
| @ParticipantTypeID | Input | Integer32 | -1 |
| @MinistryID | Input | Integer32 | -1 |
| @GroupTypeID | Input | Integer32 | -1 |
| @GroupRoleTypeID | Input | Integer32 | -1 |
| @GroupRoleID | Input | Integer32 | -1 |
| @GroupID | Input | Integer32 | -1 |
| @CreateRemainderSelection | Input | Boolean | -1 |
| @RemainderSelectionName | Input | String | 50 |
| @PublicationIDCurrent | Input | Integer32 | -1 |
| @PublicationIDPrevious | Input | Integer32 | -1 |

#### api_Custom_BrowserCommunication

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserName | Input | String | 75 |
| @CommunicationGUID | Input | String | 150 |

#### api_custom_Dashboard

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 75 |

#### api_custom_EventFinder

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserName | Input | String | 75 |
| @ProgramID | Input | String | 255 |

#### api_Custom_GetCongregation

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |

#### api_custom_GroupManagerWidget_JSON

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 75 |
| @GroupID | Input | Integer32 | -1 |

#### api_custom_GroupWidget

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 75 |
| @GroupFocusID | Input | Integer32 | -1 |
| @MeetingDayID | Input | Integer32 | -1 |
| @CongregationID | Input | Integer32 | -1 |
| @Keyword | Input | String | 50 |
| @ShowFullAddress | Input | Boolean | -1 |
| @ShowFutureGroups | Input | Boolean | -1 |

#### api_custom_MilestoneGamification

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 75 |
| @JourneyID | Input | Integer32 | -1 |

#### api_custom_MyFamilyEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 75 |

#### api_Custom_MyForms

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 75 |

#### api_custom_MyMissionTrips

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 75 |
| @PledgeID | Input | Integer32 | -1 |

#### api_custom_PlatformWidget

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 75 |
| @RecordID | Input | Integer32 | -1 |

#### api_custom_PledgeGaugeWidget_JSON

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 75 |
| @PledgeCampaignID | Input | Integer32 | -1 |

#### api_Custom_Publication_Messages

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserName | Input | String | 75 |
| @PublicationID | Input | Integer32 | -1 |
| @MessageID | Input | Integer32 | -1 |

#### api_custom_StaffWidget

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserName | Input | String | 75 |

#### api_Custom_VBSHub

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserName | Input | String | 75 |

#### api_DeleteRecurringDonations

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SubscriptionCode | Input | String | 50 |

#### api_FindMatchingContact

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FirstName | Input | String | 50 |
| @LastName | Input | String | 50 |
| @CompanyName | Input | String | 50 |
| @Suffix | Input | String | 10 |
| @Phone | Input | String | 50 |
| @Address | Input | String | 50 |
| @City | Input | String | 50 |
| @State | Input | String | 2 |
| @Zip | Input | String | 25 |
| @CongregationID | Input | Integer32 | -1 |
| @CreateParticipant | Input | Boolean | -1 |
| @CreateDonor | Input | Boolean | -1 |
| @DonorAccountID | Input | Integer32 | -1 |

#### api_GetBatchSummaryData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchID | Input | Integer32 | -1 |

#### api_GetEventProducts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ProductID | Input | Integer32 | -1 |

#### api_GetInvoiceDetailData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Invoice_ID | Input | Integer32 | -1 |

#### api_GetPurchaseHistoryData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @Month | Input | Integer32 | -1 |
| @Year | Input | Integer32 | -1 |

#### api_GetUserInfo

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @User_ID | Input | Integer32 | -1 |

#### api_GetUserRoles

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_GroupConnect_CreateOrUpdateGroupEventParticipantRSVP

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Event_ID | Input | Integer32 | -1 |
| @Participant_ID | Input | Integer32 | -1 |
| @Event_Participant_ID | Input | Integer32 | -1 |
| @Group_Participant_ID | Input | Integer32 | -1 |
| @Participation_Status_ID | Input | Integer32 | -1 |
| @Group_ID | Input | Integer32 | -1 |
| @RSVP_Status_ID | Input | Integer32 | -1 |
| @Notes | Input | String | 4000 |
| @UserId | Input | Integer32 | -1 |
| @UserName | Input | String | 255 |

#### api_GroupConnect_GetEventsAndSchedules

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |
| @ViewablePastMonths | Input | Integer32 | -1 |

#### api_GroupConnect_GetGroupApplicants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupConnect_GetGroupDetails

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ImageBaseUrl | Input | String | 255 |
| @GroupId | Input | Integer32 | -1 |
| @UserId | Input | Integer32 | -1 |

#### api_GroupConnect_GetGroupInfoBySchedule

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ScheduleIds | Input | Integers | -1 |

#### api_GroupConnect_GetGroupMeetings

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |
| @EventId | Input | Integer32 | -1 |
| @UserId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_GroupConnect_GetGroupMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupConnect_GetGroupRoles

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupConnect_GetGroupRsvp

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |
| @EventId | Input | Integer32 | -1 |
| @RSVP_Status_ID | Input | Integer32 | -1 |

#### api_GroupConnect_GetGroupSchedules

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |
| @ViewablePastMonths | Input | Integer32 | -1 |

#### api_GroupConnect_GetGroupSchedulesAttendance

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupConnect_GetMeetingAttendees

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MeetingId | Input | Integer32 | -1 |
| @GroupId | Input | Integer32 | -1 |

#### api_GroupConnect_GetMeetingEvent

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Group_ID | Input | Integer32 | -1 |
| @Event_ID | Input | Integer32 | -1 |

#### api_GroupConnect_GetMeetingSchedule

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Group_ID | Input | Integer32 | -1 |
| @Sequence_ID | Input | Integer32 | -1 |

#### api_GroupConnect_GetMyGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_GroupConnect_GetNotMarkedAttendanceCount

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupConnect_GetPendingMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupConnect_GetScheduleAvailableContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ScheduleIds | Input | Integers | -1 |

#### api_GroupConnect_GetScheduledMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @StartDate | Input | DateTime | -1 |
| @EndDate | Input | DateTime | -1 |

#### api_GroupConnect_GetScheduleParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ScheduleId | Input | Integer32 | -1 |

#### api_GroupConnect_GetScheduleRoles

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ScheduleId | Input | Integer32 | -1 |

#### api_GroupConnect_GetSelfSignUpAssignments

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |

#### api_GroupConnect_GetUniqueNonSequenceMeetings

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupConnect_GetUniqueSequenceMeetings

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupConnect_GetVolunteerAssignments

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |

#### api_GroupConnect_GetVolunteerTeams

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |

#### api_GroupConnect_ResetStatus

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventId | Input | Integer32 | -1 |

#### api_GroupConnect_UpdateGroupParticipantPrivacy

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |
| @UserName | Input | String | 254 |
| @GroupParticipantId | Input | Integer32 | -1 |
| @ShowBirthday | Input | Boolean | -1 |
| @ShowEmail | Input | Boolean | -1 |
| @ShowHomePhone | Input | Boolean | -1 |
| @ShowMobilePhone | Input | Boolean | -1 |
| @ShowAddress | Input | Boolean | -1 |
| @ShowPhoto | Input | Boolean | -1 |

#### api_GroupLife_GetGroupApplicants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupLife_GetGroupDetails

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ImageBaseUrl | Input | String | 255 |
| @GroupId | Input | Integer32 | -1 |
| @UserId | Input | Integer32 | -1 |

#### api_GroupLife_GetGroupMeetings

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |
| @EventId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_GroupLife_GetGroupMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupLife_GetGroupRsvp

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |
| @EventId | Input | Integer32 | -1 |
| @RSVP_Status_ID | Input | Integer32 | -1 |

#### api_GroupLife_GetMeetingAttendees

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MeetingId | Input | Integer32 | -1 |
| @GroupId | Input | Integer32 | -1 |

#### api_GroupLife_GetMyGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_GroupLife_GetPendingMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupId | Input | Integer32 | -1 |

#### api_GroupLife_UpdateGroupParticipantPrivacy

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |
| @UserName | Input | String | 254 |
| @GroupParticipantId | Input | Integer32 | -1 |
| @ShowBirthday | Input | Boolean | -1 |
| @ShowEmail | Input | Boolean | -1 |
| @ShowHomePhone | Input | Boolean | -1 |
| @ShowMobilePhone | Input | Boolean | -1 |
| @ShowAddress | Input | Boolean | -1 |
| @ShowPhoto | Input | Boolean | -1 |

#### api_ImportDonation

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @AccountNumber | Input | String | 50 |
| @RoutingNumber | Input | String | 50 |
| @EnvelopeNumber | Input | String | 15 |
| @DonationAmount | Input | Money | -1 |
| @DonationDate | Input | DateTime | -1 |
| @PaymentTypeID | Input | Integer32 | -1 |
| @ItemNumber | Input | String | 15 |
| @BatchID | Input | Integer32 | -1 |
| @DefaultProgramID | Input | Integer32 | -1 |
| @Notes | Input | String | 255 |

#### api_Integrations_GetChangedContactData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FromDateTime | Input | DateTime | -1 |
| @ToDateTime | Input | DateTime | -1 |

#### api_Integrations_GetChangedGroupParticipantData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FromDateTime | Input | DateTime | -1 |
| @ToDateTime | Input | DateTime | -1 |

#### api_Integrations_GetChangedParticipantMilestones

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FromDateTime | Input | DateTime | -1 |
| @ToDateTime | Input | DateTime | -1 |

#### api_ListSync_AddSubscriber

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @PublicationID | Input | Integer32 | -1 |
| @SyncedListName | Input | String | 255 |

#### api_ListSync_GetLists

No parameters.

#### api_ListSync_GetListSubscribers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PublicationID | Input | Integer32 | -1 |

#### api_ListSync_RemoveSubscriber

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @PublicationID | Input | Integer32 | -1 |

#### api_MatchOrCreateContact

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FirstName | Input | String | 50 |
| @LastName | Input | String | 50 |
| @EmailAddress | Input | String | 255 |
| @PhoneNumber | Input | String | 25 |
| @Address | Input | String | 75 |
| @City | Input | String | 50 |
| @State | Input | String | 2 |
| @Zip | Input | String | 15 |

#### api_MOBILE_Dashboard_Kid

No parameters.

#### api_MOBILE_GetCareCaseDetail

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @careCaseID | Input | Integer32 | -1 |

#### api_MOBILE_GetCareCases

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @showAll | Input | Boolean | -1 |

#### api_MOBILE_GetContactCustomFieldValue

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @lookUpField | Input | String | 1000 |
| @recordID | Input | Integer32 | -1 |

#### api_MOBILE_GetIncomeData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @statementHeaderID | Input | Integer32 | -1 |
| @year | Input | Integer32 | -1 |

#### api_MOBILE_GetMonthAndYearData

No parameters.

#### api_MOBILE_GetPersonFiles

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @contactID | Input | Integer32 | -1 |

#### api_MOBILE_GetYearGivingByType

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @year | Input | Integer32 | -1 |

#### api_MOBILE_PersonLookup

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @searchItem | Input | String | 50 |
| @searchItem2 | Input | String | 50 |

#### api_MPP_DeleteEventGroup

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |
| @GroupID | Input | Integer32 | -1 |

#### api_MPP_DeleteMeetingParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventParticipantID | Input | Integer32 | -1 |

#### api_MPP_DeleteRecurringDonations

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SubscriptionCode | Input | String | 50 |

#### api_MPP_DeleteSubscriptions

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_EndDateAttributes

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_FindContactsByEmail

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EmailAddress | Input | String | 150 |

#### api_MPP_FindGroupMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FirstName | Input | String | 25 |
| @LastName | Input | String | 25 |
| @EmailAddress | Input | String | 254 |
| @MobilePhone | Input | String | 50 |

#### api_MPP_FindMatchingContact

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FirstName | Input | String | 50 |
| @LastName | Input | String | 50 |
| @Suffix | Input | String | 10 |
| @EmailAddress | Input | String | 150 |
| @Phone | Input | String | 50 |
| @RequireEmail | Input | Boolean | -1 |

#### api_MPP_FindUserByContactEmail

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EmailAddress | Input | String | 150 |

#### api_MPP_FindUserByUsername

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Username | Input | String | 150 |

#### api_MPP_GetAccountingCompanies

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |

#### api_MPP_GetAttributes

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetBackgroundCheckByReferenceNumber

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ReferenceNumber | Input | String | 40 |

#### api_MPP_GetCampusesMinistriesAndPurposes

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @IsOnlineGiving | Input | Boolean | -1 |
| @CongregationID | Input | Integer32 | -1 |

#### api_MPP_GetCommunication

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CommunicationID | Input | Integer32 | -1 |

#### api_MPP_GetContactByGUID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactGUID | Input | String | 40 |

#### api_MPP_GetContactData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetContactFormData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetContactLogTypes

No parameters.

#### api_MPP_GetCountries

No parameters.

#### api_MPP_GetCurrencies

No parameters.

#### api_MPP_GetDirectory

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserContactID | Input | Integer32 | -1 |
| @SearchTerm | Input | String | 25 |
| @StartsWith | Input | String | 1 |
| @HouseholdID | Input | Integer32 | -1 |
| @PageNumber | Input | Integer32 | -1 |

#### api_MPP_GetDonationBySubscriptionCode

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TransactionID | Input | String | 50 |

#### api_MPP_GetDonationByTransactionCode

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TransactionID | Input | String | 50 |

#### api_MPP_GetDonorData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @DonorID | Input | Integer32 | -1 |

#### api_MPP_GetEncryptionKey

No parameters.

#### api_MPP_GetEventByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |

#### api_MPP_GetEventFinderData

No parameters.

#### api_MPP_GetEventProducts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ProductID | Input | Integer32 | -1 |

#### api_MPP_GetEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Year | Input | Integer32 | -1 |
| @Month | Input | Integer32 | -1 |
| @Ministry | Input | Integer32 | -1 |
| @Congregation | Input | Integer32 | -1 |
| @HasRegistrations | Input | Boolean | -1 |
| @HasVolunteerOpportunities | Input | Boolean | -1 |
| @FeaturedEvents | Input | Boolean | -1 |
| @GlobalCongregationID | Input | Integer32 | -1 |
| @ProgramID | Input | Integer32 | -1 |

#### api_MPP_GetEvents_backup

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Year | Input | Integer32 | -1 |
| @Month | Input | Integer32 | -1 |
| @Ministry | Input | Integer32 | -1 |
| @Congregation | Input | Integer32 | -1 |
| @HasRegistrations | Input | Boolean | -1 |

#### api_MPP_GetEvents2

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Year | Input | Integer32 | -1 |
| @Month | Input | Integer32 | -1 |
| @Ministry | Input | Integer32 | -1 |
| @Congregation | Input | Integer32 | -1 |
| @HasRegistrations | Input | Boolean | -1 |
| @HasVolunteerOpportunities | Input | Boolean | -1 |
| @FeaturedEvents | Input | Boolean | -1 |
| @GlobalCongregationID | Input | Integer32 | -1 |

#### api_MPP_GetFamilyMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_MPP_GetForm

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FormGUID | Input | String | 40 |

#### api_MPP_GetGroupByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupID | Input | Integer32 | -1 |

#### api_MPP_GetGroupFinderData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |

#### api_MPP_GetGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupTypeID | Input | Integer32 | -1 |
| @CongregationID | Input | Integer32 | -1 |
| @ParentGroupID | Input | Integer32 | -1 |
| @ZipCode | Input | String | 15 |
| @KeyWord | Input | String | 25 |
| @GroupFocus | Input | Integer32 | -1 |
| @LifeStage | Input | Integer32 | -1 |
| @Sun | Input | Boolean | -1 |
| @Mon | Input | Boolean | -1 |
| @Tue | Input | Boolean | -1 |
| @Wed | Input | Boolean | -1 |
| @Thu | Input | Boolean | -1 |
| @Fri | Input | Boolean | -1 |
| @Sat | Input | Boolean | -1 |
| @Morning | Input | Boolean | -1 |
| @LunchTime | Input | Boolean | -1 |
| @Afternoon | Input | Boolean | -1 |
| @Evening | Input | Boolean | -1 |
| @MinistryID | Input | Integer32 | -1 |
| @GlobalCongregationID | Input | Integer32 | -1 |

#### api_MPP_GetGroupsBySurvey

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @SurveyData | Input | Xml | -1 |

#### api_MPP_GetInvoiceDetailData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @InvoiceID | Input | Integer32 | -1 |

#### api_MPP_GetMakeAPledgeCampaigns

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PledgeCampaignTypeID | Input | Integer32 | -1 |
| @PledgeCampaignID | Input | Integer32 | -1 |

#### api_MPP_GetMeetingParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |
| @GroupID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |
| @PendingGroupRoleID | Input | Integer32 | -1 |

#### api_MPP_GetMissionTripParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CampaignID | Input | Integer32 | -1 |

#### api_MPP_GetMissionTrips

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @MissionTripCampaignTypeID | Input | Integer32 | -1 |

#### api_MPP_GetMissionTripsForRegistration

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @MissionTripCampaignTypeID | Input | Integer32 | -1 |
| @PledgeCampaignID | Input | Integer32 | -1 |
| @SearchString | Input | String | 75 |

#### api_MPP_GetMyCalls

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetMyCallsByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @ContactLogID | Input | Integer32 | -1 |

#### api_MPP_GetMyEventByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |
| @GroupID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetMyEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @FromDate | Input | DateTime | -1 |
| @ToDate | Input | DateTime | -1 |

#### api_MPP_GetMyGroupByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |
| @Year | Input | Integer32 | -1 |
| @Month | Input | Integer32 | -1 |
| @PendingGroupRoleID | Input | Integer32 | -1 |

#### api_MPP_GetMyGroupInquiries

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupID | Input | Integer32 | -1 |
| @GroupInquiryID | Input | Integer32 | -1 |

#### api_MPP_GetMyGroupMemberByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupID | Input | Integer32 | -1 |
| @GroupParticipantID | Input | Integer32 | -1 |

#### api_MPP_GetMyGroupMembers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupID | Input | Integer32 | -1 |

#### api_MPP_GetMyGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetMyMissionTripByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PledgeID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetMyMissionTripDonors

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PledgeID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetMyMissionTrips

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @MissionTripCampaignTypeID | Input | Integer32 | -1 |

#### api_MPP_GetMyPledges

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetMyPublications

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetNewMeetingData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetOnlineGivingHistory

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @Month | Input | Integer32 | -1 |
| @Year | Input | Integer32 | -1 |
| @ReturnImages | Input | Boolean | -1 |

#### api_MPP_GetOnlineGivingStatement

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @StmtYr | Input | Integer32 | -1 |
| @AccountingCompanyID | Input | Integer32 | -1 |

#### api_MPP_GetOnlineGivingYears

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_GetOpportunities

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Ministry | Input | Integer32 | -1 |
| @Congregation | Input | Integer32 | -1 |
| @SearchTerm | Input | String | 25 |
| @EventID | Input | Integer32 | -1 |
| @GroupRoleID | Input | Integer32 | -1 |
| @GlobalCongregationID | Input | Integer32 | -1 |

#### api_MPP_GetOpportunitiesBySurvey

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @SurveyData | Input | Xml | -1 |

#### api_MPP_GetOpportunityByID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @OpportunityID | Input | Integer32 | -1 |

#### api_MPP_GetOpportunityFinderLookupData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |
| @MinistryID | Input | Integer32 | -1 |
| @GroupRoleID | Input | Integer32 | -1 |
| @EventID | Input | Integer32 | -1 |

#### api_MPP_GetOpportunityFinderResults

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Ministry | Input | Integer32 | -1 |
| @Congregation | Input | Integer32 | -1 |
| @SearchTerm | Input | String | 25 |
| @EventID | Input | Integer32 | -1 |
| @GroupRoleID | Input | Integer32 | -1 |

#### api_MPP_GetParentGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |
| @GroupTypeID | Input | Integer32 | -1 |

#### api_MPP_GetPasswordResetData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EmailAddress | Input | String | 150 |

#### api_MPP_GetPaymentByTransactionCode

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TransactionID | Input | String | 50 |

#### api_MPP_GetPaymentsByPaymentDetailID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PaymentDetailID | Input | Integer32 | -1 |

#### api_MPP_GetPledgeCampaigns

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationID | Input | Integer32 | -1 |

#### api_MPP_GetProductsAndOptions

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ProductID | Input | Integer32 | -1 |
| @EventID | Input | Integer32 | -1 |
| @IgnoreQuantities | Input | Boolean | -1 |

#### api_MPP_GetPromoCode

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PromoCode | Input | String | 20 |
| @ProductID | Input | Integer32 | -1 |
| @EventID | Input | Integer32 | -1 |

#### api_MPP_GetPurchaseHistoryData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @Month | Input | Integer32 | -1 |
| @Year | Input | Integer32 | -1 |

#### api_MPP_GetRSVPContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupID | Input | Integer32 | -1 |
| @ParticipantData | Input | Xml | -1 |

#### api_MPP_GetSuffixes

No parameters.

#### api_MPP_GetTransactionByTransactionCode

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TransactionID | Input | String | 40 |

#### api_MPP_GetUserByUserName

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserName | Input | String | 50 |

#### api_MPP_GetUserData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_MPP_UpdateRSVP

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventID | Input | Integer32 | -1 |
| @ContactGUID | Input | String | 40 |
| @RSVPResponse | Input | String | 10 |
| @RSVPYesStatus | Input | Integer32 | -1 |
| @RSVPNoStatus | Input | Integer32 | -1 |
| @RSVPMaybeStatus | Input | Integer32 | -1 |

#### api_MPPW_CleanAbandonedGroupParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @GroupParticipantId | Input | Integer32 | -1 |

#### api_MPPW_GetContactInfo

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ImageBaseUrl | Input | String | 255 |
| @UserId | Input | Integer32 | -1 |

#### api_MPPW_GetDonationSubtotal

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PledgeCampaignID | Input | Integer32 | -1 |

#### api_MPPW_GetEventById

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |
| @IsStaffUser | Input | Boolean | -1 |

#### api_MPPW_GetEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ImageBaseUrl | Input | String | 255 |
| @EventIds | Input | Integers | -1 |

#### api_MPPW_GetFieldLists

No parameters.

#### api_MPPW_GetInvoice

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @InvoiceGuid | Input | String | 40 |

#### api_MPPW_GetMyContributionStatements

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |

#### api_MPPW_GetMyGivingHistory

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |
| @Year | Input | Integer32 | -1 |
| @Month | Input | Integer32 | -1 |

#### api_MPPW_GetMyGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_MPPW_GetMyInvoices

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_MPPW_GetMyMissionTripDonors

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PledgeCampaignTypeId | Input | Integer32 | -1 |
| @UserId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_MPPW_GetMyMissionTrips

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |
| @PledgeCampaignTypeId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_MPPW_GetMyMissionTripTeamProgress

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |
| @PledgeCampaignTypeId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_MPPW_GetMyPledges

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_MPPW_GetPledgeCampaign

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PledgeCampaignId | Input | Integer32 | -1 |
| @IsMissionTrip | Input | Boolean | -1 |
| @ImageBaseUrl | Input | String | 255 |

#### api_MPPW_GetPreCheckEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | Integer32 | -1 |
| @EventDate | Input | DateTime | -1 |

#### api_MPPW_GetProduct

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ProductID | Input | Integer32 | -1 |
| @EventId | Input | Integer32 | -1 |
| @EventParticipantId | Input | Integer32 | -1 |

#### api_MPPW_GetRsvpEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @EventDate | Input | DateTime | -1 |

#### api_MPPW_GetRsvpEventsSummary

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |
| @StartDate | Input | DateTime | -1 |
| @EndDate | Input | DateTime | -1 |

#### api_MPPW_GetUnpaidInvoiceDetails

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @InvoiceId | Input | Integer32 | -1 |

#### api_MPPW_SearchEvents

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @CongregationId | Input | Integer32 | -1 |
| @MinistryId | Input | Integer32 | -1 |
| @EventTypeId | Input | Integer32 | -1 |
| @ProgramId | Input | Integer32 | -1 |
| @SignupType | Input | Integer32 | -1 |
| @IsFeatured | Input | Boolean | -1 |
| @Keyword | Input | String | 50 |
| @IsStaffUser | Input | Boolean | -1 |
| @MonthId | Input | Byte | -1 |

#### api_MPPW_SearchGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ImageBaseUrl | Input | String | 255 |
| @GroupId | Input | Integer32 | -1 |
| @GroupTypeId | Input | Integer32 | -1 |
| @UserId | Input | Integer32 | -1 |
| @CongregationId | Input | Integer32 | -1 |
| @MinistryId | Input | Integer32 | -1 |
| @ParentGroupId | Input | Integer32 | -1 |
| @GroupFocusId | Input | Integer32 | -1 |
| @LifeStageId | Input | Integer32 | -1 |
| @CityPostalCode | Input | String | 25 |
| @Keyword | Input | String | 50 |
| @DaysOfWeek | Input | String | 20 |
| @Morning | Input | Boolean | -1 |
| @Lunchtime | Input | Boolean | -1 |
| @Afternoon | Input | Boolean | -1 |
| @Evening | Input | Boolean | -1 |
| @ShowFullGroups | Input | Boolean | -1 |
| @CountGroupInquiries | Input | Boolean | -1 |
| @ShowFutureGroups | Input | Boolean | -1 |
| @ShowFullAddress | Input | Boolean | -1 |
| @MeetsOnline | Input | Boolean | -1 |

#### api_MPPW_SearchMissionTrips

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PledgeCampaignTypeId | Input | Integer32 | -1 |
| @CongregationId | Input | Integer32 | -1 |
| @MinistryId | Input | Integer32 | -1 |
| @ProgramId | Input | Integer32 | -1 |
| @Keyword | Input | String | 50 |
| @ShowFullTrips | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |
| @MaxResults | Input | Integer32 | -1 |

#### api_MPPW_SearchOpportunities

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ImageBaseUrl | Input | String | 255 |
| @CongregationId | Input | Integer32 | -1 |
| @MinistryId | Input | Integer32 | -1 |
| @ProgramId | Input | Integer32 | -1 |
| @IsStaffUser | Input | Boolean | -1 |
| @EventId | Input | Integer32 | -1 |
| @GenderId | Input | Integer32 | -1 |
| @MinimumAge | Input | Integer32 | -1 |
| @Keyword | Input | String | 50 |
| @Frequency | Input | Byte | -1 |
| @AttributeIDs | Input | String | 512 |

#### api_MPPW_SearchSubscriptions

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |
| @ImageBaseUrl | Input | String | 255 |
| @SearchTerm | Input | String | 25 |
| @CongregationFilter | Input | Integer32 | -1 |

#### api_OGCC_GetAddressByUserId

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_OGCC_GetEncryptionKey

No parameters.

#### api_OGCC_GetPledgeCampainsWithPledges

No parameters.

#### api_OGCC_GetProgramsAndPaymentTypes

No parameters.

#### api_PAPP_GetContact_JSON

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @contactGUID | Input | String | 256 |

#### api_PAPP_VolunteerBirthdays_JSON

No parameters.

#### api_PocketPlatform_Device_Updater

No parameters.

#### api_PocketPlatform_Set_LatestSermonDate

No parameters.

#### api_Tools_AppendSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionID | Input | Integer32 | -1 |
| @IDs | Input | Text | -1 |

#### api_Tools_CheckExistenceOfSelectionById

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |

#### api_Tools_CheckExistenceOfSelectionByName

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Name | Input | String | 128 |
| @PageID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |

#### api_Tools_ClearSelectedRecords

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |
| @RecordId | Input | Integer32 | -1 |

#### api_Tools_CreateAuditOnBehalfOfUser

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 50 |
| @RecordID | Input | Integer32 | -1 |
| @AuditDescription | Input | String | 50 |
| @UserID | Input | Integer32 | -1 |
| @FieldName | Input | String | 50 |
| @FieldLabel | Input | String | 50 |
| @PreviousValue | Input | Text | -1 |
| @NewValue | Input | Text | -1 |
| @PreviousID | Input | Integer32 | -1 |
| @NewID | Input | Integer32 | -1 |

#### api_Tools_CreateContactIdentifierLogEntry

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @RecordIds | Input | Integers | -1 |
| @UserId | Input | Integer32 | -1 |

#### api_Tools_CreateHouseholdIdentifierLogEntry

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdID | Input | Integer32 | -1 |
| @RecordIds | Input | Integers | -1 |
| @UserId | Input | Integer32 | -1 |

#### api_Tools_CreateSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Name | Input | String | 50 |
| @IDs | Input | Text | -1 |
| @PageID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |

#### api_Tools_DeleteUsers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserIds | Input | String | 4000 |

#### api_Tools_GetAgeGroups

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ParticipantID | Input | Integer32 | -1 |
| @AgeGroupTypeID | Input | Integer32 | -1 |

#### api_Tools_GetBatchedDonationDistributions

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |
| @BatchId | Input | Integer32 | -1 |

#### api_Tools_GetContactsBackground

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactIds | Input | String | 255 |

#### api_Tools_GetDefaultEventParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventId | Input | Integer32 | -1 |

#### api_Tools_GetDepositDataToExportToRealmAccounting

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DepositID | Input | Integer32 | -1 |

#### api_Tools_GetDomainData

No parameters.

#### api_Tools_GetDonationPossibleMatches

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FirstName | Input | String | 50 |
| @LastName | Input | String | 50 |
| @Phone | Input | String | 25 |
| @Email | Input | String | 255 |
| @AddressLine1 | Input | String | 75 |
| @DateOfBirth | Input | String | 10 |

#### api_Tools_GetGroupAttendance

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventId | Input | Integer32 | -1 |
| @GroupId | Input | Integer32 | -1 |

#### api_Tools_GetHouseholdsWithHeads

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Search | Input | Text | -1 |

#### api_Tools_GetMatchingPrograms

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Program_ID | Input | Integer32 | -1 |
| @Program_Name | Input | String | 130 |
| @Account_Number | Input | String | 25 |
| @Congregation | Input | Integer32 | -1 |

#### api_Tools_GetMergeTags

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageId | Input | Integer32 | -1 |

#### api_Tools_GetOrphanedHouseholds

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DeleteContactIds | Input | String | 4000 |

#### api_Tools_GetPageData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageID | Input | Integer32 | -1 |

#### api_Tools_GetPagesDataByNamesList

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Names | Input | Text | -1 |

#### api_Tools_GetParticipantSacramentDetails

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageId | Input | Integer32 | -1 |
| @RecordId | Input | Integer32 | -1 |
| @SelectionId | Input | Integer32 | -1 |

#### api_Tools_GetProduct

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ProductId | Input | Integer32 | -1 |

#### api_Tools_GetRecordSequenceId

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 64 |
| @RecordId | Input | Integer32 | -1 |

#### api_Tools_GetRoleAccessLevelForPages

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RoleId | Input | Integer32 | -1 |

#### api_Tools_GetRoleAccessLevelForSubPages

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RoleId | Input | Integer32 | -1 |

#### api_Tools_GetRoleAPIProcedures

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RoleId | Input | Integer32 | -1 |

#### api_Tools_GetRolePages

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RoleId | Input | Integer32 | -1 |

#### api_Tools_GetSelectedBatchSummaries

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |
| @BatchId | Input | Integer32 | -1 |

#### api_Tools_GetSelectedContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |
| @SelectFields | Input | String | 4000 |

#### api_Tools_GetSelectedDonations

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |
| @DonationId | Input | Integer32 | -1 |

#### api_Tools_GetSelectedDonationsSummary

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |
| @DonationId | Input | Integer32 | -1 |

#### api_Tools_GetSelectedEventParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @EventId | Input | Integer32 | -1 |

#### api_Tools_GetSelectedPaymentsSummary

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |
| @PaymentId | Input | Integer32 | -1 |

#### api_Tools_GetSelectedRecords

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |

#### api_Tools_GetSelectionsByPageId

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |

#### api_Tools_GetSequenceRecords

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 64 |
| @SequenceId | Input | Integer32 | -1 |

#### api_Tools_GetSimilarContactCounts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |

#### api_Tools_GetSimilarContacts

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactId | Input | Integer32 | -1 |
| @SelectionId | Input | Integer32 | -1 |

#### api_Tools_GetSimilarHouseholdCounts

No parameters.

#### api_Tools_GetSimilarHouseholds

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @HouseholdId | Input | Integer32 | -1 |
| @SelectionId | Input | Integer32 | -1 |

#### api_Tools_GetSubpageByTableNames

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TargetTableName | Input | String | 255 |
| @ParentTableName | Input | String | 255 |

#### api_Tools_GetTableForeignKeys

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 64 |
| @ColumnName | Input | String | 64 |

#### api_Tools_GetTemplate

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TemplateId | Input | Integer32 | -1 |
| @UserId | Input | Integer32 | -1 |

#### api_Tools_GetUserPages

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |

#### api_Tools_GetUsers

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SearchTerm | Input | String | 50 |

#### api_Tools_GetUserSelections

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserID | Input | Integer32 | -1 |

#### api_Tools_GetUserTemplates

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |
| @CurrentTemplateId | Input | Integer32 | -1 |

#### api_Tools_GetUserTools

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |

#### api_Tools_LoadFormById

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @FormId | Input | Integer32 | -1 |

#### api_Tools_MoveFilesToAnotherRecord

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PageName | Input | String | 64 |
| @PrimaryRecordId | Input | Integer32 | -1 |
| @RecordIds | Input | String | 4000 |

#### api_Tools_NextAvailableEnvelopeNumber

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @NumberOfEnvelopes | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |
| @CongregationID | Input | Integer32 | -1 |

#### api_Tools_PostContactMergeCleanUp

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |

#### api_Tools_ReassignUserToContactId

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |
| @ContactId | Input | Integer32 | -1 |

#### api_Tools_RemoveIdenticalGlobalFilter

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RecordIds | Input | Integers | -1 |
| @UserId | Input | Integer32 | -1 |

#### api_Tools_RemoveIdenticalUserGroup

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RecordIds | Input | Integers | -1 |
| @UserId | Input | Integer32 | -1 |

#### api_Tools_RemoveIdenticalUserRole

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RecordIds | Input | Integers | -1 |
| @UserId | Input | Integer32 | -1 |

#### api_Tools_RemoveRecordsFromSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionId | Input | Integer32 | -1 |
| @RecordIds | Input | Text | -1 |

#### api_Tools_RemoveSelection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SelectionID | Input | Integer32 | -1 |

#### api_Tools_RemoveUserDuplicates

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @PrimaryUserId | Input | Integer32 | -1 |
| @UserIds | Input | String | 4000 |

#### api_Tools_ReplaceSelectionRecord

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 64 |
| @PrimaryRecordId | Input | Integer32 | -1 |
| @ReplaceRecordId | Input | Integer32 | -1 |

#### api_Tools_ResetContactGuids

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ContactID | Input | Integer32 | -1 |
| @UserID | Input | Integer32 | -1 |

#### api_Tools_SearchEventsWithDefaultParticipants

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SearchTerm | Input | Text | -1 |

#### api_Tools_UpdateCertificationGUID

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @ParticipantCertificationId | Input | Integer32 | -1 |
| @CertificationGUID | Input | String | 100 |

#### api_Tools_UpdateTableForeignKeys

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @TableName | Input | String | 75 |
| @ColumnName | Input | String | 64 |
| @PrimaryRecordId | Input | Integer32 | -1 |
| @RecordIds | Input | String | 4000 |
| @UserId | Input | Integer32 | -1 |

#### api_Tools_User_Page_Access

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UserId | Input | Integer32 | -1 |
| @TableName | Input | String | 255 |
| @PageName | Input | String | 255 |

#### api_UpdateDonationInfo

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonationID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |
| @DonorID | Input | Integer32 | -1 |
| @Amount1 | Input | Money | -1 |
| @Amount2 | Input | Money | -1 |
| @Amount3 | Input | Money | -1 |
| @Amount4 | Input | Money | -1 |
| @Program1 | Input | Integer32 | -1 |
| @Program2 | Input | Integer32 | -1 |
| @Program3 | Input | Integer32 | -1 |
| @Program4 | Input | Integer32 | -1 |
| @Event1 | Input | Integer32 | -1 |
| @Event2 | Input | Integer32 | -1 |
| @Event3 | Input | Integer32 | -1 |
| @Event4 | Input | Integer32 | -1 |
| @DonorAccountID | Input | Integer32 | -1 |

#### api_UpDateInvoiceStatus

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @Invoice_ID | Input | Integer32 | -1 |
| @Invoice_Status | Input | Integer32 | -1 |

#### api_Upgrade_GetFileList

No parameters.

#### api_XMLTool_GetBatchSummaryData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchID | Input | Integer32 | -1 |

#### api_XMLTool_GetDonationData

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonationID | Input | Integer32 | -1 |

#### api_XMLTool_ImportDonation

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @AccountNumber | Input | String | 50 |
| @RoutingNumber | Input | String | 50 |
| @EnvelopeNumber | Input | String | 15 |
| @DonationAmount | Input | Money | -1 |
| @DonationDate | Input | DateTime | -1 |
| @PaymentTypeID | Input | Integer32 | -1 |
| @ItemNumber | Input | String | 15 |
| @BatchID | Input | Integer32 | -1 |
| @DefaultProgramID | Input | Integer32 | -1 |
| @Notes | Input | String | 255 |

#### api_XMLTool_LookupDonor

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @SearchTerm | Input | String | 50 |

#### api_XMLTool_UpdateDonationInfo

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @DonationID | Input | Integer32 | -1 |
| @ContactID | Input | Integer32 | -1 |
| @DonorID | Input | Integer32 | -1 |
| @Amount1 | Input | Money | -1 |
| @Amount2 | Input | Money | -1 |
| @Amount3 | Input | Money | -1 |
| @Amount4 | Input | Money | -1 |
| @Program1 | Input | Integer32 | -1 |
| @Program2 | Input | Integer32 | -1 |
| @Program3 | Input | Integer32 | -1 |
| @Program4 | Input | Integer32 | -1 |
| @Event1 | Input | Integer32 | -1 |
| @Event2 | Input | Integer32 | -1 |
| @Event3 | Input | Integer32 | -1 |
| @Event4 | Input | Integer32 | -1 |
| @DonorAccountID | Input | Integer32 | -1 |

### service_*

#### service_data_quality_assign_pledge

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @BatchId | Input | Integer32 | -1 |

#### service_notification_attendance

No parameters.

### util_*

#### util_CreateContact

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @UpdateExisting | Input | Boolean | -1 |
| @IgnoreDupes | Input | Boolean | -1 |
| @FirstName | Input | String | 50 |
| @LastName | Input | String | 50 |
| @DateOfBirth | Input | Date | -1 |
| @EmailAddress | Input | String | 255 |
| @MobilePhone | Input | String | 25 |
| @HomePhone | Input | String | 25 |
| @AddressLine1 | Input | String | 75 |
| @AddressLine2 | Input | String | 75 |
| @City | Input | String | 50 |
| @State | Input | String | 50 |
| @Zip | Input | String | 15 |
| @CongregationID | Input | Integer32 | -1 |
| @DoNotContact | Input | Boolean | -1 |
| @InternalKey | Input | String | 24 |

#### util_MergeSecurityRoles

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @RoleID2Keep | Input | Integer32 | -1 |
| @RoleID2Combine | Input | Integer32 | -1 |

#### util_mfa_key_configured

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @hostName | Input | String | 255 |
| @secureSettingId | Input | Integer32 | -1 |

#### util_migrate_Connection

| Parameter | Direction | Data Type | Size |
|-----------|-----------|-----------|------|
| @secureSettingId | Input | Integer32 | -1 |
| @domainConnectionId | Input | Integer32 | -1 |

