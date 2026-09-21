---
title: TextMessageService
domain: services
type: reference
applies_to: [src/services/textMessageService.ts, src/services/textMessageService.test.ts]
symbols: [TextMessageService, TextCommunicationInsert, TextMessageInsert, TextableContactRow, SenderContext, textCommunicationInsertSchema, textMessageInsertSchema]
related: [../components/text-messaging.md, query-patterns.md, ../mp-schema/stored-procs.md, ../ministryplatform.datetimehandling.md]
last_verified: 2026-09-16
---

## Purpose
Singleton wrapping `MPHelper` for the Text Messaging tool: reads sender context, the sender's global-filter campuses, allowed SMS numbers, targeting sources, and contact texting eligibility; resolves selections through MP's stock messaging-view proc; writes `dp_Communications` and `dp_Communication_Messages` rows and uploads MMS attachments.

## Files
- `src/services/textMessageService.ts` — service
- `src/services/textMessageService.test.ts` — Vitest suite (MPHelper class mock, singleton reset)

## Key concepts
- **Hand-written insert schemas.** `textCommunicationInsertSchema` / `textMessageInsertSchema` replace the generated Zod schemas, which require identity PKs and ISO datetimes. Both accept only the MP SQL datetime format (`YYYY-MM-DD HH:MM:SS`).
- **Number access.** `listSmsNumbersForUser` keeps active `dp_SMS_Numbers` rows with no `User_Group_ID` plus rows whose group the user belongs to (`dp_User_User_Groups`). `getSmsNumber` re-fetches by ID at send time so the client never supplies the From text.
- **Text type by name.** `getTextCommunicationTypeId` reads `dp_Communication_Types` (`LIKE 'Text%' OR LIKE 'SMS%'`), caches the result, and falls back to `TEXT_COMMUNICATION_TYPE_FALLBACK_ID`.
- **Global filter = campus access.** MP's global filter table is Congregations, so `dp_User_Global_Filters.Global_Filter_ID` is a Congregation_ID. The generated model types it `unknown`; the service coerces numeric strings and drops nulls.
- **Tolerant proc parsing.** `getSelectedContacts` returns the first result set containing `Contact_ID`, `[]` for an empty set, `null` on failure or unrecognized shape. `getMergeTagsForPage` collects column-like strings from any result set, `[]` on failure.
- **Messaging views without dp_Sub_Pages access.** The API user cannot read `dp_Pages` or `dp_Sub_Pages` directly, but FK traversal from `dp_Sub_Page_Views` works: `Sub_Page_ID_TABLE.Display_Name`, `Sub_Page_ID_TABLE_Target_Page_ID_TABLE.{Table_Name,Primary_Key,Contact_ID_Field}` and `Sub_Page_ID_TABLE_Parent_Page_ID_TABLE.Primary_Key`. `dp_Sub_Pages` has no link-column field; MP infers the child FK from the parent page's primary key (Events.Event_ID -> Event_Participants.Event_ID) and `listMessagingViews` does the same (`parentKey`).
- **Running a view through the table API.** `getMessagingViewContacts` queries the view's target table with `$filter = <table>.<parentKey> IN (...) AND (<View_Clause>)` and `$select = <Contact_ID_Field> AS Contact_ID`, distinct, batched by `MP_FETCH_BATCH_SIZE`. MP's alias syntax in clauses (`Participation_Status_ID_Table.[...]`, subqueries) is resolved by the API exactly as MP's UI does. The one token the API rejects is `dp_DomainTime`, so callers pass the domain's current wall-clock (`DomainTimezoneService.toMpSqlDatetime(new Date())`) and the service substitutes it as a quoted literal.

## API / Interface
```typescript
getSenderContext(userId: number): Promise<SenderContext>                 // Contact_ID for From/Reply_to
getUserGlobalFilterCongregationIds(userId: number): Promise<number[]>    // dp_User_Global_Filters; [] = unrestricted
getUserTextQuota(userId: number): Promise<TextQuota>                     // max dp_Roles.Mass_Text_Quota over dp_User_Roles; limit null = none
countMessages(communicationId: number): Promise<number>                  // non-deleted dp_Communication_Messages rows, paged
listSmsNumbersForUser(userId: number): Promise<SmsNumberOption[]>
getSmsNumber(id: number): Promise<SmsNumberOption | null>
listCongregations(): Promise<SelectOption[]>                             // End_Date IS NULL AND Available_Online = 1
listAudiences(): Promise<SelectOption[]>
listPublications(): Promise<SelectOption[]>
getTextCommunicationTypeId(): Promise<number>
getContactIdsForAudience(audienceId: number): Promise<number[]>          // Audience_Members, active, not ended
getContactIdsForPublication(publicationId: number): Promise<number[]>    // dp_Contact_Publications, Unsubscribed = 0
getSelectedContacts(selectionId: number, selectFields?: string[]): Promise<Array<Record<string, unknown> & { Contact_ID: number }> | null>
listMessagingViews(pageId: number, userId: number): Promise<MessagingViewDefinition[]>   // Messaging_View = 1 sub-page views on the page (shared or the user's own), ordered by sub page then title
getMessagingViewContacts(view: MessagingViewDefinition, parentRecordIds: number[], domainNowSql: string): Promise<number[]>  // distinct Contact_IDs the view yields for those records
getMergeTagsForPage(pageId: number): Promise<string[]>
getTextableContacts(contactIds: number[]): Promise<TextableContactRow[]> // batched by MP_FETCH_BATCH_SIZE
createCommunication(row: TextCommunicationInsert, userId: number): Promise<number>
attachFile(communicationId: number, file: File, userId: number): Promise<number | null>
createMessages(rows: TextMessageInsert[], userId: number): Promise<number>   // throws over MP_MAX_PAGE_SIZE
setCommunicationStatus(communicationId: number, statusId: number, userId: number): Promise<void>
```

## How it works
- `getTextableContacts` selects `STANDARD_MERGE_CONTACT_SELECT` (Contacts columns plus `Household_ID_TABLE.Congregation_ID` and `Household_ID_TABLE_Congregation_ID_TABLE.Congregation_Name`) with `Contacts.Contact_ID IN (...)`, so campus filtering and merge values need no second read.
- `createCommunication` passes `$select: 'Communication_ID'` and throws if MP returns no ID.
- `attachFile` uploads to `dp_Communications/{id}` with `$userId` for audit (see GOTCHA-015).
- All list reads that can exceed 1000 rows page via `getAllRecords` with a stable `orderBy`.

## Usage
```typescript
const service = await TextMessageService.getInstance();
const id = await service.createCommunication(row, mpUserId);   // Draft
await service.createMessages(rows, mpUserId);                   // per recipient
const withinQuota = quota.limit !== null && (await service.countMessages(id)) <= quota.limit;
await service.setCommunicationStatus(
  id,
  withinQuota ? TEXT_COMMUNICATION_STATUS_READY_ID : TEXT_COMMUNICATION_STATUS_IN_REVIEW_ID,
  mpUserId
);
```

## Gotchas
- `../GOTCHAS.md#gotcha-012` — every Contacts read prefixes `Contacts.Contact_ID`.
- `../GOTCHAS.md#gotcha-013` — never pass `@DomainID` to `api_Tools_GetSelectedContacts` / `api_Tools_GetMergeTags`.
- `../GOTCHAS.md#gotcha-015` — `attachFile` must carry `userId`.
- The stock procs must be granted to the API user's role in `dp_Role_API_Procedures`; without that, selection sends from non-Contacts pages fall back to `Contact_ID_Field` only.

## Related docs
- `../components/text-messaging.md` — server actions and UI that call this service
- `query-patterns.md` — FK traversal and batching rules used here
