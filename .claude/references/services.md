# Services Reference

Reference guide for application services, server actions, DTOs, and Ministry Platform query patterns used in MPNext Tools.

---

## Ambiguous Columns & Table Name Prefixing

Ministry Platform's REST API performs implicit joins when querying tables with foreign keys. When a column name exists in multiple joined tables (e.g., `Contact_ID` exists in both `Contacts` and `Group_Participants`), the API returns an **ambiguous column error** unless you disambiguate by prefixing the column with its table name.

### Rules

1. **Always prefix ambiguous columns** with `TableName.ColumnName` in `$select` and `$filter` strings when the column exists in more than one table in the query context.

2. **Use `_TABLE` suffix** to traverse foreign key relationships. The pattern is `{ForeignKeyColumn}_TABLE.{TargetColumn}` — this tells the API to follow the FK and select a column from the related table.

3. **Multi-level FK traversal** is supported by chaining `_TABLE_` between FK columns, with a dot (`.`) only before the **final output field**. Pattern: `{FK1}_TABLE_{FK2}_TABLE.{TargetColumn}`. Example: `Building_ID_TABLE_Location_ID_TABLE.Congregation_ID` traverses Rooms -> Buildings -> Locations -> Congregations. **Important:** do NOT use dots between intermediate levels (`Building_ID_TABLE.Location_ID_TABLE.Column` is invalid).

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

**Traversing FK to get related Contact fields from dp_Users:**
```typescript
// userService.ts — getUserProfile()
select: 'User_ID, User_GUID, Contact_ID_TABLE.First_Name, Contact_ID_TABLE.Nickname, Contact_ID_TABLE.Last_Name, Contact_ID_TABLE.Email_Address, Contact_ID_TABLE.Mobile_Phone, Contact_ID_TABLE.dp_fileUniqueId AS Image_GUID'
//       ^^^^^^^^ no prefix needed — unambiguous on dp_Users
//                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^ FK traversal: dp_Users.Contact_ID -> Contacts.First_Name
```

**Traversing FK to get role names from dp_User_Roles:**
```typescript
// userService.ts — getUserProfile() roles query
select: 'Role_ID_TABLE.Role_Name'
//       ^^^^^^^^^^^^^^^^^^^^^^^^ FK traversal: dp_User_Roles.Role_ID -> Roles.Role_Name
```

**Multi-level FK traversal (Contacts -> Households -> Addresses):**
```typescript
// addressLabelService.ts — getAddressesForContacts()
select: 'Contact_ID, Display_Name, Contacts.Household_ID, Household_ID_TABLE.Household_Name, Household_ID_TABLE_Address_ID_TABLE.Address_Line_1, Household_ID_TABLE_Address_ID_TABLE.City, Household_ID_TABLE_Address_ID_TABLE.[State/Region], Household_ID_TABLE_Address_ID_TABLE.Postal_Code'
//       Chains: Contacts.Household_ID -> Households.Address_ID -> Addresses.City
//       Note: underscores between _TABLE_ levels, dot ONLY before the final field
//       [State/Region] uses bracket notation for the special character in the column name
```

### When to Prefix

| Scenario | Prefix Needed? | Example |
|----------|---------------|---------|
| Column unique to queried table | No | `Display_Name` on Contacts |
| Column shared across joined tables | **Yes — use `Table.Column`** | `Contacts.Contact_ID` when Participants also joined |
| Column from a related (FK) table | **Yes — use `FK_TABLE.Column`** | `Contact_ID_TABLE.First_Name` |
| Column across multiple FK levels | **Yes — use `FK1_TABLE_FK2_TABLE.Column`** | `Household_ID_TABLE_Address_ID_TABLE.Postal_Code` |
| All columns from queried table | No | `*` |
| Filtering on ambiguous column | **Yes — use `Table.Column`** | `filter: 'Contacts.Contact_ID = 123'` |

### Common Ambiguous Columns in This Project

| Column | Tables Where It Appears | Resolution |
|--------|------------------------|------------|
| `Contact_ID` | Contacts, dp_Users, Participants, Group_Participants, many more | Prefix with table name: `Contacts.Contact_ID` |
| `User_ID` | dp_Users, dp_User_Roles, dp_User_User_Groups | Prefix with table name when joining |
| `Household_ID` | Contacts, Households | Prefix: `Contacts.Household_ID` |
| `Display_Name` | Contacts, Groups, Ministries, many more | Prefix when joining related tables |

---

## Special Column Names

Some Ministry Platform columns contain special characters that require quoting in TypeScript and careful handling in API queries.

| Column | Table | Issue | Usage |
|--------|-------|-------|-------|
| `State/Region` | Addresses | Contains `/` | Must be quoted in code: `'State/Region'` or bracket notation `[State/Region]` in select |
| `Allow_Check-in` | Events | Contains `-` | Access with bracket notation: `event["Allow_Check-in"]` |

---

## Service Layer Architecture

```
Server Action ("use server")
  -> validates session via auth.api.getSession()
  -> calls Service.getInstance() (singleton)
    -> Service method calls MPHelper
      -> MPHelper normalizes params + optional Zod validation
        -> MinistryPlatformProvider delegates to specialized service
          -> TableService / ProcedureService / etc.
            -> HttpClient makes authenticated HTTP request
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

### getUserTools(userId: number)

Returns `string[]` of tool paths the user is authorized to access.

| Parameter | Value |
|-----------|-------|
| Procedure | `api_Tools_GetUserTools` |
| Body | `{ "@UserId": userId }` |

- DomainID is automatically injected by the MP API
- Maps `result[0]` -> extracts `Tool_Path` from each row
- Returns empty array if no tools found

### getSelectionRecordIds(selectionId: number, userId: number, pageId: number)

Returns `number[]` of record IDs from a Ministry Platform selection.

| Parameter | Value |
|-----------|-------|
| Procedure | `api_Common_GetSelection` |
| Body | `{ "@SelectionID": selectionId, "@UserID": userId, "@PageID": pageId }` |

- Searches all result sets for one containing `Record_ID` column
- Extracts `Record_ID` from each row
- Returns empty array if no records found

### resolveContactIds(tableName, primaryKey, contactIdField, recordIds)

Returns `ContactRecordResult` mapping record IDs to their associated Contact IDs.

| Parameter | Value |
|-----------|-------|
| Table | `{tableName}` (from PageData) |
| Select | `{primaryKey}, {contactIdField}` |
| Filter | `{primaryKey} IN ({batch})` |

- Supports FK traversal paths (e.g., `Participant_ID_Table.Contact_ID`)
- Short-circuits when `contactIdField === primaryKey` (e.g., Contacts table)
- Batches queries in groups of 100

**Return type — `ContactRecordResult`:**
```typescript
{
  tableName: string;
  primaryKey: string;
  contactIdField: string;
  records: { recordId: number; contactId: number; }[];
}
```

---

## GroupService

**File:** `src/services/groupService.ts`
**Purpose:** Manages group-related operations including lookup data, searching, and CRUD.

### fetchAllLookups()

Returns `GroupWizardLookups` with 13 lookup tables fetched in parallel via `Promise.all()`. Queries: Group_Types, Ministries, Congregations, Meeting_Days, Meeting_Frequencies, Meeting_Durations, Life_Stages, Group_Focuses, Priorities, Rooms, Books, dp_SMS_Numbers, Group_Ended_Reasons. Each normalized to `{ id: number, name: string }[]`.

### searchContacts(term: string)

Returns `ContactSearchResult[]` (max 20). Searches `Contacts` table with `Display_Name LIKE '{escaped}%'`. Escapes single quotes.

### searchGroups(term: string)

Returns `GroupSearchResult[]` (max 20). Searches `Groups` table with `Group_Name LIKE '{escaped}%' AND End_Date IS NULL`. Includes `Group_Type_ID_TABLE.Group_Type` via FK traversal.

### getGroup(groupId: number)

Returns `GroupWizardFormData | null`. Fetches a single group by `Group_ID` and maps 48+ fields from the raw DB record to typed form data. Converts ISO datetime dates to `YYYY-MM-DD` format.

### createGroup(data: GroupWizardFormData, userId: number)

Returns `{ Group_ID: number; Group_Name: string }`. Converts date fields to datetime format via `prepareForApi()`, then calls `mp.createTableRecords('Groups', ...)` with `$userId` for audit trail.

### updateGroup(groupId: number, data: Partial\<GroupWizardFormData\>, userId: number)

Returns `{ Group_ID: number; Group_Name: string }`. Same date conversion as createGroup. Uses `partial: true` for updates.

---

## AddressLabelService

**File:** `src/services/addressLabelService.ts`
**Purpose:** Fetches contact addresses from Ministry Platform via multi-level FK joins (Contacts -> Households -> Addresses) for address label generation.

### getAddressesForContacts(contactIds: number[])

Returns `ContactAddressRow[]`. Fetches addresses for multiple contacts, batching large arrays (100 per batch) to avoid oversized filter clauses.

| Parameter | Value |
|-----------|-------|
| Table | `Contacts` |
| Select | `Contact_ID, Display_Name, First_Name, Last_Name, Contacts.Household_ID, Household_ID_TABLE.Household_Name, Household_ID_TABLE.Bulk_Mail_Opt_Out, Household_ID_TABLE_Address_ID_TABLE.Address_Line_1, Household_ID_TABLE_Address_ID_TABLE.Address_Line_2, Household_ID_TABLE_Address_ID_TABLE.City, Household_ID_TABLE_Address_ID_TABLE.[State/Region], Household_ID_TABLE_Address_ID_TABLE.Postal_Code, Household_ID_TABLE_Address_ID_TABLE.Bar_Code, Household_ID_TABLE_Address_ID_TABLE.Delivery_Point_Code` |
| Filter | `Contact_ID IN (${batch})` |
| OrderBy | `Household_ID_TABLE_Address_ID_TABLE.Postal_Code` |

- **Multi-level FK traversal:** `Household_ID_TABLE_Address_ID_TABLE.City` chains Contacts -> Households -> Addresses
- **Bracket notation:** `[State/Region]` for the special character in the column name
- **Batching:** Splits large contact ID lists into batches of 100 to avoid API limits
- **Ambiguous column:** `Contacts.Household_ID` is prefixed because the Households join also has it

### getAddressForContact(contactId: number)

Returns `ContactAddressRow | null`. Fetches the address for a single contact. Same select/query as above with `top: 1`.

**Return type — `ContactAddressRow`:**
```typescript
{
  Contact_ID: number;
  Display_Name: string;
  First_Name: string;
  Last_Name: string;
  Household_ID: number | null;
  Household_Name: string | null;
  Bulk_Mail_Opt_Out: boolean;
  Address_Line_1: string | null;
  Address_Line_2: string | null;
  City: string | null;
  'State/Region': string | null;
  Postal_Code: string | null;
  Bar_Code: string | null;
  Delivery_Point_Code: string | null;
}
```

---

## FieldManagementService

**File:** `src/services/fieldManagementService.ts`
**Purpose:** Fetches Ministry Platform pages and their field configurations, and persists field-order changes. Backs the drag-and-drop field editor at `/tools/fieldmanagement`.

### getPages()

Calls `executeProcedureWithBody('api_MPNextTools_GetPages', {})`. Returns `PageListItem[]` (`Page_ID`, `Display_Name`, `Table_Name`). Returns `[]` on empty or missing result.

### getPageFields(pageId: number)

Calls `executeProcedureWithBody('api_MPNextTools_GetPageFields', { "@PageID": pageId })`. Returns `PageField[]` with field configuration including `View_Order`, `Group_Name`, `Required`, `Hidden`, `Default_Value`, `Filter_Clause`, `Depends_On_Field`, `Field_Label`, and `Writing_Assistant_Enabled`.

### getTableMetadata(tableName: string)

Calls `mp.getTables(tableName)`. Returns the exact-match `TableMetadata` (matched by `Table_Name`) or the first result if no exact match, or `null` when no tables are returned.

### updatePageFieldOrder(fields)

Persists an array of field config entries by calling `api_MPNextTools_UpdatePageFieldOrder` for each field. Uses a concurrency of **5** (`Promise.all` batches of 5) to avoid overwhelming the API.

**Required stored procedures (defined in `src/lib/providers/ministry-platform/db/`):**
- `api_MPNextTools_GetPages.sql`
- `api_MPNextTools_GetPageFields.sql`
- `api_MPNextTools_UpdatePageFieldOrder.sql`

Each accepts `@DomainID INT` as the first parameter (MP API convention).

---

## Server Actions

Server actions validate the session, call service singletons, and return data to components.

### Shared Actions

**File:** `src/components/shared-actions/user.ts`

#### getCurrentUserProfile(id: string)

- Calls `UserService.getInstance()` -> `getUserProfile(id)`
- Returns `MPUserProfile | undefined`
- No session check (caller is responsible)

### User Menu Actions

**File:** `src/components/user-menu/actions.ts`

#### handleSignOut()

- Calls `auth.api.signOut({ headers })` to clear Better Auth session
- Redirects to MP OIDC endsession endpoint: `${MINISTRY_PLATFORM_BASE_URL}/oauth/connect/endsession?post_logout_redirect_uri=${APP_URL}`
- Throws if `MINISTRY_PLATFORM_BASE_URL` not configured

### User Tools Actions

**File:** `src/components/dev-panel/panels/user-tools-actions.ts`

#### getUserTools()

- Validates session and extracts `userGuid`
- Queries `dp_Users` (filter: `User_GUID`, select: `User_ID`, top: 1) to get numeric User_ID
- Calls `ToolService.getInstance()` -> `getUserTools(userId)`
- Returns `string[]` of authorized tool paths
- Throws on: missing session, missing userGuid, user not found

### Group Wizard Actions

**File:** `src/components/group-wizard/actions.ts`

#### fetchGroupWizardLookups()

- Validates session, calls `GroupService.getInstance()` -> `fetchAllLookups()`
- Returns `GroupWizardLookups` with 13 lookup tables

#### searchContacts(term: string) / searchGroups(term: string)

- Validates session, minimum 2 characters
- Calls `GroupService.searchContacts()` / `searchGroups()`
- Returns `ContactSearchResult[]` / `GroupSearchResult[]`

#### fetchGroupRecord(groupId: number)

- Validates session, calls `GroupService.getGroup(groupId)`
- Returns `{ success: true; data: GroupWizardFormData } | ActionError`

#### createGroup(data) / updateGroup(groupId, data)

- Validates session, resolves MP User_ID from userGuid
- Calls `GroupService.createGroup()` / `updateGroup()` with userId for audit
- Returns `CreateGroupResult | ActionError`

### Address Label Actions

**File:** `src/components/address-labels/actions.ts`

#### fetchAddressLabels(params, config)

- Validates session, resolves MP User_ID
- Selection mode: calls `ToolService.getSelectionRecordIds()` then `AddressLabelService.getAddressesForContacts()`
- Single record mode: calls `AddressLabelService.getAddressForContact()`
- Filters and transforms results (household dedup, opt-out, missing data)
- Returns `FetchAddressLabelsResult`

#### generateLabelPdf(labels, config) / generateLabelDocx(labels, config)

- Pre-encodes barcodes, validates label stock
- PDF: Uses `@react-pdf/renderer`, returns base64
- DOCX: Uses `docx` library, returns base64

#### mergeTemplate(templateBase64, labels, config)

- Uses `docxtemplater` + image module for barcode embedding
- Max template size: 5MB
- Returns merged DOCX as base64

### Field Management Actions

**File:** `src/components/field-management/actions.ts`

#### fetchPages()

- Validates session
- Calls `FieldManagementService.getInstance()` -> `getPages()`
- Returns `PageListItem[]`

#### fetchPageFieldData(pageId, tableName)

- Validates session
- Calls `getPageFields(pageId)` and `getTableMetadata(tableName)` in parallel via `Promise.all`
- Merges any table columns not yet represented in `dp_Page_Fields` (skipping primary keys), assigning sequential `View_Order` values above the current max and **negative `Page_Field_ID`** values starting at `-1` (indicating "unsaved" rows)
- Returns `PageFieldData` = `{ fields: PageField[]; tableMetadata: TableMetadata | null }`

#### savePageFieldOrder(fields)

- Wraps everything in try/catch — returns `{ success: false, error }` for any failure (including unauthorized)
- Calls `FieldManagementService.updatePageFieldOrder(fields)` which batches 5-at-a-time
- Returns `{ success: true }` on completion

### Template Editor Actions

**File:** `src/components/template-editor/actions.ts`

#### compileMjml(mjmlSource: string)

- Validates session, enforces 512KB max size
- Compiles MJML to HTML via `mjml` library
- Returns `MjmlCompileResult` with HTML + errors

---

## DTOs

**Directory:** `src/lib/dto/`

Hand-written application-level data transfer objects. Separate from auto-generated MP models.

### Address Label DTOs (`address-label.dto.ts`)

| Type | Fields | Used By |
|------|--------|---------|
| `LabelData` | Contact info, address fields, barcode data | Label rendering components |
| `SkipRecord` | `Contact_ID`, `Display_Name`, `reason` | Skip reporting in summary |
| `SkipReason` | Union type: `'no_address'`, `'opted_out'`, `'no_postal_code'`, `'no_barcode'` | Skip classification |
| `AddressMode` | `'household'` or `'individual'` | Address grouping mode |
| `BarcodeFormat` | `'imb'`, `'postnet'`, or `'none'` | Barcode rendering choice |
| `LabelConfig` | Label stock, barcode format, mailer ID, service type | Configuration for label generation |
| `FetchAddressLabelsResult` | `labels`, `skipped`, `totalFetched` | Result of address fetch operation |

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

// Multi-level traversal (Contacts -> Households -> Addresses)
select: 'Household_ID_TABLE_Address_ID_TABLE.City, Household_ID_TABLE_Address_ID_TABLE.[State/Region]'
```

### Batch Operations with Guards

```typescript
// Skip API call if nothing to do
if (tagIds.length === 0) return;
await mp.createTableRecords('Group_Tags', tagIds.map(id => ({ Group_ID: groupId, Tag_ID: id })));

// Batch large arrays to avoid oversized filters
for (let i = 0; i < ids.length; i += BATCH_SIZE) {
  const batch = ids.slice(i, i + BATCH_SIZE);
  const rows = await mp.getTableRecords({ filter: `Contact_ID IN (${batch.join(', ')})` });
}
```
