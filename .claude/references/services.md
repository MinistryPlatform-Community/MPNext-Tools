# Services Reference

Reference guide for application services, server actions, DTOs, and Ministry Platform query patterns used in CalvaryToolsNext.

---

## Ambiguous Columns & Table Name Prefixing

Ministry Platform's REST API performs implicit joins when querying tables with foreign keys. When a column name exists in multiple joined tables (e.g., `Contact_ID` exists in both `Contacts` and `Group_Participants`), the API returns an **ambiguous column error** unless you disambiguate by prefixing the column with its table name.

### Rules

1. **Always prefix ambiguous columns** with `TableName.ColumnName` in `$select` and `$filter` strings when the column exists in more than one table in the query context.

2. **Use `_TABLE` suffix** to traverse foreign key relationships. The pattern is `{ForeignKeyColumn}_TABLE.{TargetColumn}` — this tells the API to follow the FK and select a column from the related table.

3. **Multi-level FK traversal** is supported by chaining `_TABLE_` between FK columns, with a dot (`.`) only before the **final output field**. Pattern: `{FK1}_TABLE_{FK2}_TABLE.{TargetColumn}`. Example: `Building_ID_TABLE_Location_ID_TABLE.Congregation_ID` traverses Rooms → Buildings → Locations → Congregations. **Important:** do NOT use dots between intermediate levels (`Building_ID_TABLE.Location_ID_TABLE.Column` is invalid).

4. **Direct table prefix** (`TableName.ColumnName`) disambiguates columns on the **current** table when joins create ambiguity.

5. **Non-ambiguous columns** (unique to the queried table) do not need prefixing.

### Pattern Reference

| Pattern | Meaning | Example |
|---------|---------|---------|
| `ColumnName` | Column on the queried table (no ambiguity) | `Display_Name` |
| `TableName.ColumnName` | Explicit table prefix to disambiguate | `Contacts.Contact_ID` |
| `FKColumn_TABLE.ColumnName` | Follow FK to get column from related table | `Contact_ID_TABLE.First_Name` |
| `FK1_TABLE_FK2_TABLE.ColumnName` | Multi-level FK traversal (dot only before final field) | `Building_ID_TABLE_Location_ID_TABLE.Congregation_ID` |
| `FKColumn_TABLE.Column AS Alias` | FK traversal with column alias | `Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID` |
| `*` | All columns on the queried table | `*` |
| `*, FK_TABLE.Column AS Alias` | All columns plus FK traversal | `*, Primary_Contact_TABLE.Display_Name AS Primary_Contact_Display_Name` |

### Examples From This Codebase

**Disambiguating `Contact_ID` (exists in both Contacts and Participants):**
```typescript
// groupService.ts — searchApprovedVolunteers()
select: 'Contacts.Contact_ID, Display_Name, Participant_Record_TABLE.Participant_ID'
//       ^^^^^^^^^^^^^^^^ prefixed to avoid ambiguity with Participant's Contact_ID
//                         ^^^^^^^^^^^^ unambiguous — only on Contacts
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ FK traversal
```

**Traversing FK to get related Contact fields from dp_Users:**
```typescript
// userService.ts — getUserProfile()
select: 'User_ID, User_GUID, Contact_ID_TABLE.First_Name, Contact_ID_TABLE.Nickname, Contact_ID_TABLE.Last_Name, Contact_ID_TABLE.Email_Address, Contact_ID_TABLE.Mobile_Phone, Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID'
//       ^^^^^^^^ no prefix needed — unambiguous on dp_Users
//                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^ FK traversal: dp_Users.Contact_ID → Contacts.First_Name
```

**Traversing FK to get role names from dp_User_Roles:**
```typescript
// userService.ts — getUserProfile() roles query
select: 'Role_ID_TABLE.Role_Name'
//       ^^^^^^^^^^^^^^^^^^^^^^^^ FK traversal: dp_User_Roles.Role_ID → Roles.Role_Name
```

**Traversing FK to get leader display name from Groups:**
```typescript
// groupService.ts — getGroupWithDisplayName()
select: '*, Primary_Contact_TABLE.Display_Name AS Primary_Contact_Display_Name'
//       ^^ all Group columns
//          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ FK traversal with alias
```

**Traversing FK to get Contact_ID from Group_Participants:**
```typescript
// groupService.ts — getGroupLeader()
select: 'Group_Participant_ID, Participant_ID_TABLE.Contact_ID, Group_Role_ID, Start_Date, End_Date'
//                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ FK traversal: Group_Participants.Participant_ID → Participants.Contact_ID
```

**Multi-level FK traversal (Rooms → Buildings → Locations → Congregations):**
```typescript
// groupService.ts — getRoomsByCongregation()
filter: 'Building_ID_TABLE_Location_ID_TABLE.Congregation_ID = 5'
//       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//       Chains: Rooms.Building_ID → Buildings.Location_ID → Locations.Congregation_ID
//       Note: underscores between _TABLE_ levels, dot ONLY before the final field
```

### When to Prefix

| Scenario | Prefix Needed? | Example |
|----------|---------------|---------|
| Column unique to queried table | No | `Display_Name` on Contacts |
| Column shared across joined tables | **Yes — use `Table.Column`** | `Contacts.Contact_ID` when Participants also joined |
| Column from a related (FK) table | **Yes — use `FK_TABLE.Column`** | `Contact_ID_TABLE.First_Name` |
| Column across multiple FK levels | **Yes — use `FK1_TABLE_FK2_TABLE.Column`** | `Building_ID_TABLE_Location_ID_TABLE.Congregation_ID` |
| All columns from queried table | No | `*` |
| Filtering on ambiguous column | **Yes — use `Table.Column`** | `filter: 'Contacts.Contact_ID = 123'` |

### Common Ambiguous Columns in This Project

| Column | Tables Where It Appears | Resolution |
|--------|------------------------|------------|
| `Contact_ID` | Contacts, dp_Users, Participants, Group_Participants, many more | Prefix with table name: `Contacts.Contact_ID` |
| `User_ID` | dp_Users, dp_User_Roles, dp_User_User_Groups | Prefix with table name when joining |
| `Start_Date` | Groups, Group_Participants, Participants | Prefix if querying joins |
| `End_Date` | Groups, Group_Participants, Participants | Prefix if querying joins |
| `Display_Name` | Contacts, Groups, Ministries, many more | Prefix when joining related tables |

---

## Special Column Names

Some Ministry Platform columns contain special characters that require quoting in TypeScript and careful handling in API queries.

| Column | Table | Issue | Usage |
|--------|-------|-------|-------|
| `State/Region` | Addresses | Contains `/` | Must be quoted in code: `'State/Region'` |
| `Allow_Check-in` | Events | Contains `-` | Access with bracket notation: `event["Allow_Check-in"]` |

---

## Service Layer Architecture

```
Server Action ("use server")
  → validates session via auth.api.getSession()
  → calls Service.getInstance() (singleton)
    → Service method calls MPHelper
      → MPHelper normalizes params + optional Zod validation
        → MinistryPlatformProvider delegates to specialized service
          → TableService / ProcedureService / etc.
            → HttpClient makes authenticated HTTP request
```

### Singleton Pattern

All services use lazy-initialized async singletons:

```typescript
class MyService {
  private static instance: MyService;
  private mp!: MPHelper;

  private constructor() { this.initialize(); }

  public static async getInstance(): Promise<MyService> {
    if (!MyService.instance) {
      MyService.instance = new MyService();
      await MyService.instance.initialize();
    }
    return MyService.instance;
  }

  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }
}
```

**Testing singleton reset:** `(MyService as any).instance = undefined` in `beforeEach`.

---

## UserService

**File:** `src/services/userService.ts`
**Purpose:** Fetches enriched user profiles from Ministry Platform with roles and group memberships.

### getUserProfile(id: string)

Returns `MPUserProfile | undefined`. Runs three queries (profile first, then roles + groups in parallel).

**Query 1 — User base data:**
| Parameter | Value |
|-----------|-------|
| Table | `dp_Users` |
| Filter | `User_GUID = '${id}'` |
| Select | `User_ID, User_GUID, Contact_ID_TABLE.First_Name, Contact_ID_TABLE.Nickname, Contact_ID_TABLE.Last_Name, Contact_ID_TABLE.Email_Address, Contact_ID_TABLE.Mobile_Phone, Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID` |
| Top | `1` |

- Uses `_TABLE` FK traversal to get Contact fields from the related Contacts record
- `dp_fileUniqueId` is aliased as `Image_GUID` for the profile image

**Query 2 — User roles (parallel):**
| Parameter | Value |
|-----------|-------|
| Table | `dp_User_Roles` |
| Filter | `User_ID = ${profile.User_ID}` |
| Select | `Role_ID_TABLE.Role_Name` |

- Maps result to `string[]` of role names

**Query 3 — User groups (parallel):**
| Parameter | Value |
|-----------|-------|
| Table | `dp_User_User_Groups` |
| Filter | `User_ID = ${profile.User_ID}` |
| Select | `User_Group_ID_TABLE.User_Group_Name` |

- Maps result to `string[]` of group names

**Return type — `MPUserProfile`:**
```typescript
{
  User_ID: number;
  User_GUID: string;
  Contact_ID: number;
  First_Name: string;
  Nickname: string;
  Last_Name: string;
  Email_Address: string | null;
  Mobile_Phone: string | null;
  Image_GUID: string | null;
  roles: string[];
  userGroups: string[];
}
```

---

## ToolService

**File:** `src/services/toolService.ts`
**Purpose:** Retrieves page metadata and user tool permissions via stored procedures.

### getPageData(pageID: number)

Returns `PageData | null`. Executes a stored procedure to get MP page metadata.

| Parameter | Value |
|-----------|-------|
| Procedure | `api_Tools_GetPageData` |
| Body | `{ "@PageID": pageID }` |

- DomainID is automatically injected by the MP API
- Result is nested array: `result[0][0]` extracts first record from first result set
- Returns `null` if no data found

**Return type — `PageData`:**
```typescript
{
  Page_ID: number;
  Display_Name: string;
  Table_Name: string;
  Primary_Key: string;
  // ... additional page metadata fields
}
```

### getUserTools(domainId: number, userId: number)

Returns `string[]` of tool paths the user is authorized to access.

| Parameter | Value |
|-----------|-------|
| Procedure | `api_Tools_GetUserTools` |
| Body | `{ "@DomainId": domainId, "@UserId": userId }` |

- Maps `result[0]` → extracts `Tool_Path` from each row
- Returns empty array if no tools found

---

## GroupService

**File:** `src/services/groupService.ts`
**Purpose:** Comprehensive group/team management including CRUD, lookups, participants, leaders, tags, and addresses.

### Lookup Methods

#### getMinistries()

Returns `MinistryOption[]`. Fetches active ministries.

| Parameter | Value |
|-----------|-------|
| Table | `Ministries` |
| Select | `Ministry_ID, Ministry_Name` |
| Filter | `End_Date IS NULL` |
| OrderBy | `Ministry_Name` |

#### getGroupFocuses()

Returns `GroupFocusOption[]`. Fetches hardcoded group focus options.

| Parameter | Value |
|-----------|-------|
| Table | `Group_Focuses` |
| Select | `Group_Focus_ID, Group_Focus` |
| Filter | `Group_Focus_ID IN (6, 7, 24)` |

Hardcoded IDs: `6` = Men, `7` = Women, `24` = Men and Women.

#### getGroupTags()

Returns `TagOption[]`. Fetches tags in the "Groups" tag group.

| Parameter | Value |
|-----------|-------|
| Table | `Tags` |
| Select | `Tag_ID, Tag` |
| Filter | `Tag_Group = 'Groups'` |
| OrderBy | `Tag` |

### Contact Search

#### searchApprovedVolunteers(term: string)

Returns `ContactSearchResult[]`. Fuzzy-searches active contacts by display name.

| Parameter | Value |
|-----------|-------|
| Table | `Contacts` |
| Select | `Contacts.Contact_ID, Display_Name, Participant_Record_TABLE.Participant_ID` |
| Filter | `Display_Name LIKE '%${safeTerm}%' AND Contact_Status_ID = 1` |
| OrderBy | `Last_Name, First_Name` |
| Top | `20` |

- **SQL injection protection:** `term.replace(/'/g, "''")` escapes single quotes
- **Ambiguous column:** `Contacts.Contact_ID` is prefixed because the `Participant_Record` join also has a `Contact_ID`
- **FK traversal:** `Participant_Record_TABLE.Participant_ID` follows the FK from Contacts to Participants

### Group CRUD

#### getGroup(groupId: number)

Returns `Groups | null`. Fetches a single group record.

| Parameter | Value |
|-----------|-------|
| Table | `Groups` |
| Filter | `Group_ID = ${groupId}` |
| Top | `1` |

#### getGroupWithDisplayName(groupId: number)

Returns `Groups & { Primary_Contact_Display_Name: string } | null`. Fetches group with leader's display name.

| Parameter | Value |
|-----------|-------|
| Table | `Groups` |
| Select | `*, Primary_Contact_TABLE.Display_Name AS Primary_Contact_Display_Name` |
| Filter | `Group_ID = ${groupId}` |
| Top | `1` |

- **FK traversal:** `Primary_Contact_TABLE.Display_Name` follows the `Primary_Contact` FK to get the contact's name

#### createGroup(data: Partial\<Groups\>)

Returns `{ Group_ID: number; Group_Name: string }[]`. Creates a group record.

| Parameter | Value |
|-----------|-------|
| Table | `Groups` |
| $select | `Group_ID, Group_Name` |

#### updateGroup(data: Partial\<Groups\>)

Returns `void`. Updates an existing group record. Data must include `Group_ID`.

| Parameter | Value |
|-----------|-------|
| Table | `Groups` |

### Address Management

#### createAddress(data: OffsiteAddressData)

Returns `number` (Address_ID). Creates an address for offsite meetings.

| Parameter | Value |
|-----------|-------|
| Table | `Addresses` |
| $select | `Address_ID` |

**Field mapping from DTO to MP columns:**
| DTO Field | MP Column |
|-----------|-----------|
| `addressLine1` | `Address_Line_1` |
| `addressLine2` | `Address_Line_2` |
| `city` | `City` |
| `state` | `'State/Region'` (quoted — special character) |
| `postalCode` | `Postal_Code` |

### Participant & Leader Management

#### getParticipantByContactId(contactId: number)

Returns `{ Participant_ID: number } | null`.

| Parameter | Value |
|-----------|-------|
| Table | `Participants` |
| Select | `Participant_ID` |
| Filter | `Contact_ID = ${contactId}` |
| Top | `1` |

#### createParticipant(contactId: number)

Returns `number` (Participant_ID). Creates a participant record.

| Parameter | Value |
|-----------|-------|
| Table | `Participants` |
| $select | `Participant_ID` |
| Hardcoded | `Participant_Type_ID: 4` (Member), `Participant_Start_Date: new Date().toISOString()` |

#### getGroupLeader(groupId: number)

Returns `GroupParticipants & { Contact_ID: number } | null`. Finds the active leader.

| Parameter | Value |
|-----------|-------|
| Table | `Group_Participants` |
| Select | `Group_Participant_ID, Participant_ID_TABLE.Contact_ID, Group_Role_ID, Start_Date, End_Date` |
| Filter | `Group_ID = ${groupId} AND Group_Role_ID = ${GROUP_ROLE_LEADER} AND End_Date IS NULL` |
| Top | `1` |

- `GROUP_ROLE_LEADER = 7` (imported from `@/components/team-wizard/schemas`)
- **FK traversal:** `Participant_ID_TABLE.Contact_ID` gets the Contact_ID from the Participants table

#### addGroupLeader(groupId: number, participantId: number)

Returns `void`. Creates a Group_Participants record for the leader.

| Parameter | Value |
|-----------|-------|
| Table | `Group_Participants` |
| Hardcoded | `Group_Role_ID: GROUP_ROLE_LEADER (7)`, `Start_Date: new Date().toISOString()` |

#### endGroupLeader(groupParticipantId: number)

Returns `void`. Soft-ends a leader assignment by setting End_Date.

| Parameter | Value |
|-----------|-------|
| Table | `Group_Participants` |
| Update | `End_Date: new Date().toISOString()` |

**Pattern:** Soft delete — sets `End_Date` instead of deleting the record.

### Tag Management

#### getGroupTagRecords(groupId: number)

Returns `GroupTags[]`.

| Parameter | Value |
|-----------|-------|
| Table | `Group_Tags` |
| Select | `Group_Tag_ID, Tag_ID, Group_ID` |
| Filter | `Group_ID = ${groupId}` |

#### addGroupTags(groupId: number, tagIds: number[])

Returns `void`. Batch-creates Group_Tags records.

| Parameter | Value |
|-----------|-------|
| Table | `Group_Tags` |
| Records | Maps `tagIds` → `[{ Group_ID, Tag_ID }]` |
| Guard | No-op if `tagIds.length === 0` |

#### removeGroupTags(groupTagIds: number[])

Returns `void`. Batch-deletes Group_Tags by primary key.

| Parameter | Value |
|-----------|-------|
| Table | `Group_Tags` |
| IDs | `groupTagIds` array |
| Guard | No-op if `groupTagIds.length === 0` |

---

## Server Actions

Server actions validate the session, call service singletons, and return data to components.

### Shared Actions

**File:** `src/components/shared-actions/user.ts`

#### getCurrentUserProfile(id: string)

- Calls `UserService.getInstance()` → `getUserProfile(id)`
- Returns `MPUserProfile | undefined`
- No session check (caller is responsible)

### User Menu Actions

**File:** `src/components/user-menu/actions.ts`

#### handleSignOut()

- Calls `auth.api.signOut({ headers })` to clear Better Auth session
- Redirects to MP OIDC endsession endpoint: `${MINISTRY_PLATFORM_BASE_URL}/oauth/connect/endsession?post_logout_redirect_uri=${APP_URL}`
- Throws if `MINISTRY_PLATFORM_BASE_URL` not configured

### User Tools Debug Actions

**File:** `src/components/user-tools-debug/actions.ts`

#### getUserTools()

- Validates session and extracts `userGuid`
- Queries `dp_Users` (filter: `User_GUID`, select: `User_ID`, top: 1) to get numeric User_ID
- Calls `ToolService.getInstance()` → `getUserTools(1, userId)`
- Returns `string[]` of authorized tool paths
- Throws on: missing session, missing userGuid, user not found

### Team Wizard Actions

**File:** `src/components/team-wizard/actions.ts`

#### loadWizardLookupData()

- Validates session
- Calls `GroupService.getInstance()`
- Runs in parallel: `getMinistries()`, `getGroupFocuses()`, `getGroupTags()`
- Returns `TeamWizardLookupData`

#### loadGroupData(groupId: number)

- Validates session
- Calls `getGroupWithDisplayName(groupId)` — returns null if not found
- Runs in parallel: `getGroupTagRecords(groupId)`, conditionally loads offsite address
- Maps tag records to `tagIds: number[]`
- Returns `TeamWizardGroupData | null`

#### searchContacts(term: string)

- Validates session
- Returns `[]` if `term.length < 2`
- Calls `searchApprovedVolunteers(term.trim())`
- Returns `ContactSearchResult[]`

#### saveTeamWizard(formData: TeamWizardFormData, existingGroupId?: number)

Orchestrates a multi-step save operation:

1. **Address creation** (conditional): If Quick Serve + offsite → `createAddress()`
2. **Group create/update**: `createGroup()` or `updateGroup()` based on `existingGroupId`
3. **Leader management** via `handleLeaderChange()`:
   - Gets or creates participant record
   - Compares new leader to current leader
   - Ends old leader if different, adds new leader
4. **Tag reconciliation** via `reconcileTags()`:
   - Calculates delta between existing and desired tags
   - Adds new tags and removes old tags in parallel

Returns `TeamWizardSaveResult` (`{ success, groupId?, error? }`).

**Error handling:** Top-level try-catch returns `{ success: false, error: message }`.

---

## DTOs

**Directory:** `src/lib/dto/`

Hand-written application-level data transfer objects. Separate from auto-generated MP models.

### Lookup DTOs

| Type | Fields | Used By |
|------|--------|---------|
| `MinistryOption` | `Ministry_ID: number`, `Ministry_Name: string` | `GroupService.getMinistries()` |
| `GroupFocusOption` | `Group_Focus_ID: number`, `Group_Focus: string` | `GroupService.getGroupFocuses()` |
| `TagOption` | `Tag_ID: number`, `Tag: string` | `GroupService.getGroupTags()` |
| `ContactSearchResult` | `Contact_ID: number`, `Display_Name: string`, `Participant_ID: number \| null` | `GroupService.searchApprovedVolunteers()` |

### Wizard DTOs

| Type | Purpose |
|------|---------|
| `TeamWizardLookupData` | Aggregates `ministries`, `groupFocuses`, `tags` for form initialization |
| `TeamWizardFormData` | Complete form submission (group info, campus, ministry, leader, tags, registration, address) |
| `TeamWizardGroupData` | Enriched group record for edit mode (includes `Primary_Contact_Display_Name`, `offsiteAddress`, `tagIds`) |
| `TeamWizardSaveResult` | Operation result: `{ success: boolean, groupId?: number, error?: string }` |
| `OffsiteAddressData` | Address fields: `addressLine1`, `addressLine2?`, `city?`, `state?`, `postalCode?` |

---

## Constants

**File:** `src/components/team-wizard/schemas.ts`

### Group Types

| Constant | Value | Label |
|----------|-------|-------|
| `GROUP_TYPE_MINISTRY_TEAM` | `2` | Ministry Team |
| `GROUP_TYPE_MISSION_TRIP` | `6` | Mission Trip Team |
| `GROUP_TYPE_QUICK_SERVE` | `12` | Quick Serve |
| `GROUP_TYPE_COMMUNICATION` | `13` | Communication Group |

### Group Roles

| Constant | Value |
|----------|-------|
| `GROUP_ROLE_LEADER` | `7` |

### Group Focuses

| Constant | Value | Label |
|----------|-------|-------|
| `GROUP_FOCUS_MEN` | `6` | Men |
| `GROUP_FOCUS_WOMEN` | `7` | Women |
| `GROUP_FOCUS_MEN_AND_WOMEN` | `24` | Men and Women |

### Congregations

| ID | Name |
|----|------|
| `5` | Melbourne |
| `6` | Viera |
| `7` | Sebastian |
| `15` | Espanol |

---

## MPHelper Parameter Mapping

When calling `MPHelper.getTableRecords()`, friendly parameter names are converted to `$`-prefixed OData parameters:

| MPHelper Param | API Param | Type |
|----------------|-----------|------|
| `table` | URL path: `/tables/{table}` | string |
| `select` | `$select` | string |
| `filter` | `$filter` | string |
| `orderBy` | `$orderby` | string |
| `groupBy` | `$groupby` | string |
| `having` | `$having` | string |
| `top` | `$top` | number |
| `skip` | `$skip` | number |
| `distinct` | `$distinct` | boolean |
| `userId` | `$userId` | number |
| `globalFilterId` | `$globalFilterId` | number |

For `createTableRecords()` and `updateTableRecords()`, pass raw `$`-prefixed params directly, plus an optional `schema` for Zod validation.

---

## Query Patterns Quick Reference

### Filtering

```typescript
// Exact match (numeric)
filter: 'Group_ID = 123'

// Exact match (string — wrap in single quotes)
filter: "User_GUID = 'abc-def-ghi'"

// LIKE search (wildcard)
filter: "Display_Name LIKE '%Smith%'"

// NULL check
filter: 'End_Date IS NULL'

// IN clause
filter: 'Group_Focus_ID IN (6, 7, 24)'

// Combined conditions
filter: "Group_ID = 5 AND Group_Role_ID = 7 AND End_Date IS NULL"

// String value in filter (single quotes inside double quotes)
filter: "Tag_Group = 'Groups'"
```

### SQL Injection Prevention

```typescript
// Always escape single quotes in user-provided strings
const safeTerm = term.replace(/'/g, "''");
filter: `Display_Name LIKE '%${safeTerm}%'`
```

### Selecting Related Data (FK Traversal)

```typescript
// Follow FK to get fields from related table
select: 'Contact_ID_TABLE.First_Name, Contact_ID_TABLE.Last_Name'

// All columns plus FK traversal with alias
select: '*, Primary_Contact_TABLE.Display_Name AS Primary_Contact_Display_Name'

// Disambiguate when joining creates ambiguity
select: 'Contacts.Contact_ID, Display_Name, Participant_Record_TABLE.Participant_ID'
```

### Soft Delete Pattern

```typescript
// End-date a record instead of deleting
await mp.updateTableRecords('Group_Participants', [{
  Group_Participant_ID: id,
  End_Date: new Date().toISOString()
}]);

// Filter for active records
filter: 'End_Date IS NULL'
```

### Batch Operations with Guards

```typescript
// Skip API call if nothing to do
if (tagIds.length === 0) return;
await mp.createTableRecords('Group_Tags', tagIds.map(id => ({ Group_ID: groupId, Tag_ID: id })));
```
