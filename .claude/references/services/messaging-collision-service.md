---
title: MessagingCollisionService
domain: services
type: reference
applies_to: [src/services/messagingCollisionService.ts, src/services/messagingCollisionService.test.ts]
symbols: [MessagingCollisionService, CollisionSearchOptions, RecipientCountRow, CommunicationDetailRow, channelForType]
related: [../components/messaging-collision.md, text-message-service.md, query-patterns.md, ../ministryplatform.datetimehandling.md]
last_verified: 2026-09-17
---

## Purpose
Read-only singleton that finds other `dp_Communications` rows (email or text) starting within a few hours of a planned send, with recipient counts and optional overlap against the planned recipients. Tool-agnostic: the Text Messaging tool is the first consumer; any tool that writes communications can call it.

## Files
- `src/services/messagingCollisionService.ts` — service
- `src/services/messagingCollisionService.test.ts` — Vitest suite (MPHelper class mock, `DomainTimezoneService` mock, singleton reset)

## Key concepts
- **Church-tunable defaults.** Every threshold, window, and rate comes from `getMessagingSettings()` (`dp_Configuration_Settings` under `MPNEXT`, then env, then the constant; see `configuration-settings-service.md`). `CollisionSearchOptions` values override them for one call.
- **Window around the planned instant.** `findCollisions` builds `[sendAt - lookbackHours, sendAt + lookaheadHours]` (12 hours each by default) and converts both bounds with `DomainTimezoneService.toMpSqlDatetime`, because `Start_Date` is domain wall-clock.
- **Two kinds of collision.** Large sends (message rows > `MESSAGING_COLLISION_LARGE_SEND_THRESHOLD`, default 1,000) anywhere in the window, sent or not; and, only when the planned send is itself large, every communication committed but not yet sent (In Review / Ready to Send via the `TEXT_COMMUNICATION_STATUS_*` IDs) with at least one message row. Drafts (`TEXT_COMMUNICATION_STATUS_DRAFT_ID`) are excluded from both: the large-send query filters them through the FK and the mapping loop drops any that arrive another way.
- **Grouped counts, one call per window.** Recipient counts come from `dp_Communication_Messages` with `$groupby` + `$having` (`COUNT(*) > threshold`), filtered through the FK (`Communication_ID_TABLE.Start_Date`, `Communication_ID_TABLE.Template = 0`). Measured on one production instance: about 0.5 s for a 7-day window, about 0.1 s for an hour-scale one.
- **Status name via traversal.** `dp_Communication_Statuses` is not readable directly, but `Communication_Status_ID_TABLE.Status` resolves through the FK from `dp_Communications` (the column is `Status`, not `Communication_Status`). Type names come from `Communication_Type_ID_TABLE.Communication_Type`; `channelForType` maps "Email" to `email` and anything containing "text" or "sms" to `sms`.
- **Overlap has two read plans.** `countRecipientOverlap` compares `ceil(recipients / MP_FETCH_BATCH_SIZE)` grouped `COUNT(DISTINCT Contact_ID)` calls (cheap for small planned sends) with `sum(ceil(rows / MP_MAX_PAGE_SIZE))` per-candidate pages (cheap for large planned sends against smaller candidates) and runs the cheaper one. Over `MESSAGING_COLLISION_MAX_OVERLAP_READS` (40) it counts candidates nearest the planned time first and leaves the rest `null`.
- **One serial worker for email and text.** MP's messaging worker processes every communication in scheduled order, email or text, so a large email ahead of a text holds the text until it finishes. With `plannedChannel` set (`sms` or `email`), each nearby message gets a delivery estimate: texts = recipients x segments (from `analyzeSms` over the stored `Body`, read by `getCommunicationBodies`) / `segmentsPerSecond` (`MessagingTextSegmentsPerSecond`, default 5); emails = recipients / `emailsPerSecond` (`MessagingEmailsPerSecond`, default 5). `simulateSerialQueue` then walks the queue twice, with and without the planned send: earlier messages report how long they are still processing after the planned start (the last one sets `plannedQueueDelayMinutes`), later ones report only the extra wait the planned send adds. `interferes` is true from 1 minute. A send under the large threshold is kept only when it interferes. A **Sent email** (`TEXT_COMMUNICATION_STATUS_SENT_ID`, 4) is left out of the simulation because the worker has handed it to the mail server; a **Sent text stays in**, since the carrier drains its own queue after the worker finishes. Such an email still appears in the list when large, with `queueDelayMinutes: null`.
- **Flags.** `isCritical` when `|Start_Date - sendAt| <= criticalHours` (`MESSAGING_COLLISION_CRITICAL_HOURS`, 2); `isHighImpact` when rows > `highImpactThreshold` (`MESSAGING_COLLISION_HIGH_IMPACT_THRESHOLD`, 10,000). Both thresholds travel back in the result.
- **Capping keeps the nearest.** When more than `maxResults` collisions are found, the ones closest to the planned time are kept and the rest counted in `truncatedCount`; the kept rows are then returned in start order.
- **Templates and deleted rows are skipped.** Every read filters `Template = 0` and `Deleted = 0`.

## API / Interface
```typescript
channelForType(typeName: string | null | undefined): MessagingChannel                       // 'email' | 'sms' | 'other'
findLargeCommunications(windowStartSql, windowEndSql, threshold, excludeCommunicationId?): Promise<Map<number, number>>  // id -> rows, COUNT(*) > threshold
findPendingCommunicationIds(windowStartSql, windowEndSql, excludeCommunicationId?): Promise<number[]>                    // Draft/In Review/Ready in window, paged
countRecipients(communicationIds: number[]): Promise<Map<number, number>>                    // grouped, batched by MP_FETCH_BATCH_SIZE; absent = 0 rows
getCommunicationDetails(communicationIds: number[]): Promise<CommunicationDetailRow[]>       // subject, Start_Date, type, status, author, SMS number title
countRecipientOverlap(candidates, contactIds, maxReads?): Promise<Map<number, number | null>>
getCommunicationBodies(communicationIds: number[]): Promise<Map<number, string>>              // dp_Communications.Body for segment estimates
simulateSerialQueue({ sendAtMs, plannedDurationMinutes, others: QueuedMessage[] }): SerialQueueEstimate   // { plannedDelayMinutes, delays: Map<id, minutes> }
findCollisions(options: CollisionSearchOptions): Promise<MessagingCollisionResult>           // orchestration; sorted by start, capped at maxResults
```
Window bounds must already be MP SQL datetimes (`YYYY-MM-DD HH:MM:SS`); anything else throws.

## How it works
1. `findLargeCommunications` and (if `recipientCount > threshold`) `findPendingCommunicationIds` run in parallel.
2. Pending IDs not already counted go through `countRecipients`; zero-row communications drop out.
3. `getCommunicationDetails` hydrates the union and filters to the requested channels (default email + sms); with the queue model on, `getCommunicationBodies` reads the texts' bodies. Rows are mapped to `MessagingCollision` (`Start_Date` via `parseMpDatetime`, `hoursFromSendAt` to a tenth, queue estimate for texts) and small sends that would not queue are dropped.
4. Sort by start, cap at `maxResults` (`MESSAGING_COLLISION_MAX_RESULTS`, 10), report the remainder as `truncatedCount`.
5. With `recipientContactIds`, overlap is counted for the kept rows only.

## Usage
```typescript
const service = await MessagingCollisionService.getInstance();
const result = await service.findCollisions({
  sendAt: scheduledInstant ?? new Date(),
  recipientCount: recipientContactIds.length,
  recipientContactIds,
});
```

## Gotchas
- `../GOTCHAS.md#gotcha-012` — every `dp_Communications` / `dp_Communication_Messages` column in a traversal query is table-prefixed.
- `$having` compares with `>` (strictly more than the threshold), matching the "more than 1,000 recipients" rule.
- Pending communications of any size are *scanned* when the planned send is large, but only kept when the queue estimate says they would interfere (or they are large themselves), so one-recipient automations no longer appear.
- The module's `Communication_Status_ID` filter reuses the Text Messaging status constants; an instance with different IDs sets `MP_COMMUNICATION_STATUS_*_ID` once for both.

## Related docs
- `../components/messaging-collision.md` — server action, hook, and panel that consume this service
- `text-message-service.md` — the writes whose timing this check protects
