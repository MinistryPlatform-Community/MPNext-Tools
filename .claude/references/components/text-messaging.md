---
title: Text Messaging component
domain: components
type: reference
applies_to:
  - src/components/text-messaging/actions.ts
  - src/components/text-messaging/actions.test.ts
  - src/components/text-messaging/text-messaging-form.tsx
  - src/components/text-messaging/recipient-section.tsx
  - src/components/text-messaging/compose-section.tsx
  - src/components/text-messaging/ai-rewrite-panel.tsx
  - src/components/text-messaging/phone-preview.tsx
  - src/components/text-messaging/cost-summary-section.tsx
  - src/components/text-messaging/review-send-section.tsx
  - src/components/text-messaging/sms-utils.ts
  - src/components/text-messaging/schedule-utils.ts
  - src/components/text-messaging/curfew-utils.ts
  - src/components/text-messaging/curfew-notice.tsx
  - src/components/text-messaging/info-hint.tsx
  - src/components/text-messaging/merge-utils.ts
  - src/components/text-messaging/image-utils.ts
  - src/components/text-messaging/index.ts
  - src/app/(web)/tools/textmessaging/page.tsx
  - src/app/(web)/tools/textmessaging/text-messaging.tsx
symbols:
  - TextMessagingForm
  - RecipientSection
  - ComposeSection
  - AiRewritePanel
  - PhonePreview
  - CostSummarySection
  - ReviewSendSection
  - getTextToolConfig
  - resolveTextRecipients
  - createTextCommunication
  - sendTextChunk
  - finalizeTextCommunication
  - rewriteTextForSms
  - analyzeSms
  - estimateCost
  - estimateCompletionSeconds
  - zonedWallClockToInstant
  - getMessageCurfew
  - evaluateCurfew
  - isInstantInCurfew
  - formatCurfewWindow
  - CurfewNotice
  - InfoHint
  - toGsmSafe
  - mergePlaceholders
  - extractPlaceholders
  - prepareAttachment
related:
  - ../services/text-message-service.md
  - ../dto-constants/README.md
  - ../ministryplatform.datetimehandling.md
  - tool-framework.md
last_verified: 2026-09-17
---

## Purpose
Compose and queue a text (SMS, or MMS with one image) to a selection of records, an audience, or publication subscribers. Writes `dp_Communications` and `dp_Communication_Messages` rows directly (never the MP `/messages` API) so the platform's communication service delivers them. Consumed by the `/tools/textmessaging` tool page.

## Files
| File | Role |
|---|---|
| `src/components/text-messaging/text-messaging-form.tsx` | `TextMessagingForm` loads config once and renders the inner `TextComposer` under a `draftKey`; the composer resolves recipients, derives counts/cost/preview, and drives the send loop. After a completed send every section is locked (`locked = sending \|\| completedMessage !== null`) and **New message** bumps the key, remounting the composer with fresh state |
| `src/components/text-messaging/recipient-section.tsx` | Two-column card: **Send to** (selection / this record / audience / publication, the **Which contacts** messaging-view picker when the page offers views, and the audience or publication picker) beside **Campuses** (all my campuses / specific with `CampusMultiSelect` from `src/components/campus-multi-select`); one-line recipient count with exclusions in muted text |
| `src/components/text-messaging/compose-section.tsx` | Message card centred on the body: from-number in the header, large textarea, toolbar (Personalize placeholder picker, Attach image, AI rewrite toggle) with a plain "N characters, N texts per person" counter; emoji / special-character line with **Use plain characters**; attachment chip; "attaching an image would lower the cost" line. Technical detail lives behind `InfoHint` icons |
| `src/components/text-messaging/info-hint.tsx` | Small "i" icon (Popover) that opens on hover or click; holds the segment / encoding / rate detail that used to be inline |
| `src/components/text-messaging/schedule-utils.ts` | Client-side zone math for the scheduler: wall-clock in the MP zone to instant and back, zone abbreviation, zoned formatting |
| `src/components/text-messaging/curfew-utils.ts` | Pure quiet-hours helpers: parse the curfew "HH:MM", read an instant's minutes-of-day in the domain zone, `isInstantInCurfew` (handles overnight wrap), `evaluateCurfew` (start + estimated completion), and window formatting |
| `src/components/text-messaging/curfew-notice.tsx` | Amber quiet-hours warning with the override checkbox that must be checked before a curfew send is allowed |
| `src/components/text-messaging/ai-rewrite-panel.tsx` | AI rewrite for brevity, clarity, and cost: optional guidance, before/after stats, apply or dismiss. Shown only when a provider is wired in `src/lib/providers/ai-text` |
| `src/components/text-messaging/phone-preview.tsx` | Phone wireframe rendering the merged body and attachment for the sample recipient |
| `src/components/text-messaging/cost-summary-section.tsx` | **When to send** (right away / schedule for later with a `datetime-local` picker in church time), two stat tiles (estimated total, delivery time with "starts X, done around Y" when scheduled), and a **Show details** disclosure with the per-recipient / rate / segment table |
| `src/components/text-messaging/review-send-section.tsx` | To / From / When / Cost summary, approval note with role detail behind an `InfoHint`, confirm dialog, progress bar, retry failed, completion message; once complete the send button is replaced by **New message** (`onNewMessage`) |
| `src/components/text-messaging/actions.ts` | Server actions (below) |
| `src/components/text-messaging/sms-utils.ts` | GSM-7 / UCS-2 detection, segment math, cost and completion estimates |
| `src/components/text-messaging/merge-utils.ts` | `[Token]` placeholder extraction and merging, standard merge field list, phone dedupe key |
| `src/components/text-messaging/image-utils.ts` | Client canvas pipeline: validate type, resize to max width, re-encode, enforce 5 MB |
| `src/components/text-messaging/*.test.ts` | Vitest suites for actions and the three utility modules |

## Key concepts
- **Launch modes.** `selection` (launched with `s` + `pageID`) and `record` (launched from one open record: `recordID` + `pageID`, labelled with `recordDescription`). Both share `resolveLaunchContacts`; the only difference is where the record IDs come from (`api_Common_GetSelection` vs. the single `recordID`).
- **Messaging views.** On a non-Contacts page, `getTextToolConfig` lists the page's messaging views (`TextMessageService.listMessagingViews`) into `TextToolConfig.messagingViews`, and the Recipients card shows a **Which contacts** picker ("Participants: Registered"). Picking one is required before recipients resolve (`needsMessagingView` blocks the send). The use case: open an Event, launch the tool, choose "Participants: Registered", text the registered participants. A read failure logs a warning and offers no views, so the fallbacks below still work.
- **Recipient resolution order (selection / record).** 1) The chosen `messagingViewId`: `getMessagingViewContacts(view, recordIds, domainNow)` runs the view against its target table scoped to the launching records. 2) Contacts page: the record IDs are Contact_IDs. 3) Selection on another page: MP's stock `api_Tools_GetSelectedContacts` applies the page's Contact_ID mapping and returns page merge-tag columns. 4) `pageData.Contact_ID_Field` via `ToolService.resolveContactIds` (for Events that is `Events.Primary_Contact`, which is why the messaging view matters).
- **Exclusions.** Applied in `resolveTextRecipients` from one Contacts read: outside the campus scope (household `Congregation_ID`), no mobile number, not opted in, and duplicate normalized mobile numbers. Counts are shown separately.
- **Opt-in compliance.** `Contacts.Do_Not_Text` is deprecated; consent is `Contacts.Texting_Opt_In_Type_ID` (1 Opted Out, 2 No Response, 3 Single Opt-In, 4 Double Opt-In) compared against the sending number's `dp_SMS_Numbers.Texting_Compliance_Level` (1 None, 2 Single Opt-in, 3 Double Opt-in). None or Single Opt-in numbers reach contacts with type 3 or 4; Double Opt-in numbers reach only type 4. Rule lives in `opt-in-utils.ts` (`meetsTextingCompliance`), constants in `TEXTING_OPT_IN_TYPE` / `TEXTING_COMPLIANCE_LEVEL`. The preview re-resolves when the sending number changes and `sendTextChunk` re-checks against the real number.
- **Campus scope follows the sender's MP global filter.** `dp_User_Global_Filters` rows for the user are Congregation_IDs they may see; no rows means every campus. The form offers **All my campuses** (empty `congregationIds`, expanded server-side to the allowed set or to no filter) or **Specific campuses** (a multi-select limited to live `Available_Online` congregations inside the allowed set). The server always intersects a specific pick with the allowed set and rejects a pick entirely outside it.
- **Placeholders** use MP's bracket convention (`[Nickname]`, `[First_Name]`). Standard contact fields always work; page merge tags from `api_Tools_GetMergeTags` are added for selections and resolved per chunk through `getSelectedContacts`. Unknown tokens merge as blank and are flagged in the form.
- **Counts are estimates when placeholders exist.** The form merges sample values (or the first resolved recipient) before running `analyzeSms`.
- **Auto-replace on input.** `ComposeSection` runs `normalizeLookalikes` on every change: curly quotes, dashes, ellipsis, odd spaces, bullets, and a few symbols become their plain equivalents, the caret is preserved, and a dismissible notice ("Replaced 3 smart quotes and 1 dash...") shows for a few seconds. Emoji and other characters with no plain equivalent are left in place.
- **Encoding hint.** Any character outside GSM 03.38 forces UCS-2 (70/67 per segment). After auto-replace this is effectively emoji and unmappable symbols; `findNonGsmCharacters` lists them and **Remove them** applies `toGsmSafe`.
- **Send-time normalization.** `sendTextChunk` (and the preview in `resolveTextRecipients`) runs `normalizeLookalikes` over every merge value and over the merged body, so a contact name with a curly apostrophe cannot silently double one recipient's segment cost.
- **AI rewrite.** Shown when `AiWritingService.isEnabled()`, which is true only when `createAiTextProvider()` in `src/lib/providers/ai-text/index.ts` returns a provider (this repo ships none). `rewriteTextForSms` sends the draft, its stats, and its placeholders to `AiWritingService.rewriteTextMessage`, then enforces what the prompt can only request: the output is normalized with `toGsmSafe` and any placeholder the model dropped is reported. The sender sees before/after characters, segments, encoding, and per-recipient saving, and applies the text explicitly.
- **MMS hint.** `estimateCost().mmsWouldBeCheaper` is true when `segments x costPerSegment > mmsCostPerMessage`; the form shows one line ("Attaching an image would lower the cost") with the numbers behind an `InfoHint`.
- **Scheduling.** `TextToolConfig.timeZone` carries the domain's IANA zone (from `DomainTimezoneService.getMpTimezone()`). The picker is a `datetime-local` whose value is treated as wall-clock time in that zone, never the browser's; `schedule-utils.zonedWallClockToInstant` converts it only for the past check and the "done around" estimate (`scheduledInstant + completionSeconds`). The raw value is posted as `CreateTextCommunicationInput.scheduledLocal`; `createTextCommunication` runs it through `toMpSqlDatetime` into `dp_Communications.Start_Date`, rejects values more than a minute in the past, and returns the written `startDate`. Nothing scheduled means `Start_Date` = now. The platform's communication service honours `Start_Date` for Ready to Send communications, so an In Review send released after the scheduled time goes out immediately.
- **Messaging curfew (quiet hours).** `getTextToolConfig` reads the domain's curfew from the stock proc `api_CORE_GetDomainData` (`Message_Curfew_Start_Time` / `Message_Curfew_End_Time`, "HH:MM:SS" wall-clock in the domain zone, usually wrapping overnight) via `TextMessageService.getMessageCurfew`, normalized to `TextToolConfig.curfew` (`{ start, end }` as "HH:MM", or null when unset or the proc is unavailable). The form runs `evaluateCurfew` over the send's start instant (the scheduled time, or now for "right away") and its estimated completion (`start + completionSeconds`); if either falls inside the window it renders `CurfewNotice`, an amber panel whose override checkbox must be checked. The gate lives in `blockedReason` ("Confirm sending during quiet hours") and the acknowledgement resets whenever the recipients or schedule change; `curfewWarning` repeats the reason in the confirm dialog. Informational plus a required override, never a hard block.
- **Plain-language surface.** User-facing copy avoids "segment", "GSM-7", "UCS-2", and rates. Segments are "texts per person" / "pieces"; encodings, per-segment prices, and throughput appear only inside `InfoHint` popovers or the cost card's details disclosure.
- **Attachment.** Resized client-side to `TEXT_IMAGE_MAX_WIDTH`, hard-blocked over `TEXT_MMS_MAX_ATTACHMENT_BYTES` (5 MB), warned over 1 MB. When the warning shows and the prepared image is wider than `TEXT_IMAGE_COMPACT_WIDTH` (640 px, `limits.compactImageWidth`), the chip offers **Shrink to 640px wide**, which re-runs `prepareAttachment` on the kept `source` file at that width (`canShrinkAttachment` decides; already-narrow images get no offer). Uploaded to the `dp_Communications` record via `MPHelper.uploadFiles`, which is how the platform sends MMS media.
- **Send sequence.** `createTextCommunication` (Draft, with attachment) -> `sendTextChunk` x N (`TEXT_SEND_CHUNK_SIZE` = 200 contacts) -> `finalizeTextCommunication`. A failed chunk leaves the communication as a Draft until **Retry** succeeds, so the platform never sends a partial batch.
- **Collision check.** Once recipients resolve, the form runs `useMessagingCollisions` (shared module, see `messaging-collision.md`) with the recipient Contact_IDs and the scheduled instant (or none for "right away"), and renders `MessagingCollisionPanel` between the cost card and Review and send. Other large sends (more than 1,000 people by default) within 12 hours either side are listed in two groups (before this text, after this text), earliest first, with time, "Sent / Queued / Scheduled N hours before/after", recipient count, and "N also on this text". The form passes `plannedChannel: 'sms'` and the draft's segment count so the server can simulate MP's single serial messaging worker (email and text alike) and estimate which nearby sends would queue against this one; those (even under 1,000 people) are kept and badged "May delay this text ~N min" / "May be delayed ~N min", and sends to more than 10,000 people are badged "High impact". The headline is repeated in the confirm dialog through `ReviewSendSection.collisionWarning`. Informational only: it never blocks sending.
- **Pricing and throughput are church settings.** `getTextToolConfig` fills `TextToolConfig.pricing` from `getMessagingSettings()`: `dp_Configuration_Settings` rows `MessagingSmsCostPerSegment`, `MessagingMmsCostPerMessage`, `MessagingTextSegmentsPerSecond` (Application_Code MPNEXT), then the `TEXT_*` env vars, then the constants. See `../services/configuration-settings-service.md`.
- **Pre-approved quota gate.** `finalizeTextCommunication` counts the message rows on the server and compares them with the sender's `TextQuota` (highest `dp_Roles.Mass_Text_Quota` across `dp_User_Roles`). Within the quota: status Ready to Send (3), delivered immediately. Over it, or no quota on any role: status In Review (2) until an approver releases it. The form mirrors the decision in its copy and button label (**Send text** vs **Submit for approval**) but the server decides.
- **Approval-process toggle.** `getDomainMessagingData` reads `Messaging_Approval_Process_ID` from `api_CORE_GetDomainData` (the same proc call as the curfew) into `TextToolConfig.approvalProcessConfigured`. When the domain has no approval process (ID is NULL), there is no review path: an over-quota (or no-quota) send is **not permitted** rather than placed In Review. The form blocks it (red notice, disabled button, `blockedReason`) and `finalizeTextCommunication` refuses to release it (error, communication stays a Draft) so a bypassed client cannot send it. A proc that is unavailable or missing the column defaults to configured (review stays open), preserving the prior behavior.

## API / Interface
Server actions (`actions.ts`), all `ActionResult<T>` = `{ success: true, ...T } | { success: false, error }`:

```typescript
getTextToolConfig(params: ToolParams): Promise<ActionResult<{ config: TextToolConfig }>>
resolveTextRecipients(params: ToolParams, target: TextRecipientTarget, placeholderTokens?: string[]): Promise<ActionResult<{ summary: TextRecipientSummary }>>
createTextCommunication(formData: FormData): Promise<ActionResult<CreateTextCommunicationResult>>  // 'payload' JSON (incl. optional scheduledLocal "YYYY-MM-DDTHH:MM" in MP zone) + optional 'attachment' File; returns startDate
sendTextChunk(input: SendTextChunkInput): Promise<ActionResult<SendTextChunkResult>>
finalizeTextCommunication(communicationId: number): Promise<ActionResult<FinalizeTextCommunicationResult>>  // outcome: 'ready_to_send' | 'in_review'
rewriteTextForSms(input: { body: string; guidance?: string; isMms: boolean }): Promise<ActionResult<SmsRewriteResult>>
```

Utilities:

```typescript
analyzeSms(text: string): SmsAnalysis            // encoding, characterCount, unitCount, segments, nonGsmCharacters, segmentsIfGsm, overMaxLength
toGsmSafe(text: string): string                  // replace lookalikes AND strip unmappable characters
normalizeLookalikes(text: string): NormalizeResult // replace lookalikes only; { text, replacements, total }
estimateCost(input: CostEstimateInput): CostEstimate
estimateCompletionSeconds(totalSegments: number, segmentsPerSecond: number): number
mergePlaceholders(body: string, values: Record<string, string | number | null | undefined>): string
extractPlaceholders(body: string): string[]
prepareAttachment(file: File, options?: { maxWidth?: number; maxBytes?: number }): Promise<PreparedAttachment>
zonedWallClockToInstant(wallClock: string, timeZone: string): Date | null   // "YYYY-MM-DDTHH:MM" in the MP zone -> instant
formatZonedDateTime(instant: Date, timeZone: string): string                 // "Thu, Sep 17 at 9:04 AM"
timeZoneAbbreviation(timeZone: string, at?: Date): string                    // "MST"
```

DTOs live in `src/lib/dto/text-messaging.ts`; constants in the "Text Messaging tool" block of `src/lib/constants.ts`.

## How it works
- Form mounts -> `getTextToolConfig` (sender context, allowed SMS numbers, audiences, publications, congregations, merge fields, pricing, limits). Default from-number = `dp_SMS_Numbers.Default`, else first allowed.
- Target, campus scope, or the set of page-specific placeholder tokens changes -> `resolveTextRecipients` (request ID guards stale responses). A "specific" scope with nothing picked skips resolving and blocks sending.
- Every keystroke -> merge preview values -> `analyzeSms` -> `estimateCost` -> `estimateCompletionSeconds`; the phone preview re-renders the merged text.
- Send -> FormData to `createTextCommunication`; chunks of Contact_IDs to `sendTextChunk`, each re-reading Contacts so late opt-outs are skipped; then `finalizeTextCommunication`, which picks Ready to Send or In Review from the quota.

## Usage
```typescript
// src/app/(web)/tools/textmessaging/text-messaging.tsx
<ToolContainer params={params} title="Text Messaging" onClose={handleClose} hideFooter>
  <TextMessagingForm params={params} />
</ToolContainer>
```

## Gotchas
- `dp_Communications.Start_Date` and `dp_Communication_Messages.Action_Status_Time` must be MP SQL wall-clock strings from `DomainTimezoneService.toMpSqlDatetime`; the hand-written insert schemas reject ISO strings on purpose.
- Status IDs are instance configuration (`MP_COMMUNICATION_STATUS_DRAFT_ID` = 1, `MP_COMMUNICATION_STATUS_IN_REVIEW_ID` = 2, `MP_COMMUNICATION_STATUS_READY_ID` = 3, `MP_COMMUNICATION_STATUS_SENT_ID` = 4 (collision check only), `MP_MESSAGE_ACTION_STATUS_READY_ID` = 2 for `dp_Communication_Action_Statuses` Ready to Send); `dp_Communication_Statuses` and `dp_Communication_Action_Statuses` are not API-readable directly, so the write path cannot resolve them by name; a status *name* can still be read through FK traversal (`Communication_Status_ID_TABLE.Status` from `dp_Communications`), which the collision check uses for display.
- `dp_Roles.Texting_Override` and `Texting_Character_Limit` exist but are not consulted; only `Mass_Text_Quota` drives the review gate.
- `api_Tools_GetSelectedContacts` and `api_Tools_GetMergeTags` are stock MP procs whose result shapes are undocumented; both parsers are tolerant and degrade (null / `[]`) rather than throw. Grant them to the API user's role for messaging-view support.
- `sendTextChunk` calls `getSelectedContacts` once per chunk when the body uses page tags; very large selections with page tags cost one proc call per 200 recipients.

## Related docs
- `../../../TEXT_MESSAGING.md` — human-facing setup guide (MP prerequisites, `MPNEXT` settings records, approvals, quiet hours, wiring an AI provider)
- `../services/text-message-service.md` — the MP reads and writes behind these actions
- `messaging-collision.md` — the shared "other messages around this time" panel the form embeds
- `../../../src/components/campus-multi-select/` — the shared campus picker the Recipients card uses
