---
title: Messaging Collision component
domain: components
type: reference
applies_to:
  - src/components/messaging-collision/actions.ts
  - src/components/messaging-collision/actions.test.ts
  - src/components/messaging-collision/collision-utils.ts
  - src/components/messaging-collision/collision-utils.test.ts
  - src/components/messaging-collision/use-messaging-collisions.ts
  - src/components/messaging-collision/messaging-collision-panel.tsx
  - src/components/messaging-collision/index.ts
  - src/lib/dto/messaging-collision.ts
symbols:
  - checkMessagingCollisions
  - useMessagingCollisions
  - MessagingCollisionPanel
  - summarizeCollisions
  - partitionCollisions
  - describeTiming
  - describeDelay
  - describeOffset
  - describeWindow
  - formatCollisionTime
  - MessagingCollisionInput
  - MessagingCollision
  - MessagingCollisionResult
related:
  - ../services/messaging-collision-service.md
  - text-messaging.md
  - ../dto-constants/README.md
last_verified: 2026-09-17
---

## Purpose
Shared, tool-agnostic "who else is messaging these people right now" check. Given a recipient count, an optional planned instant, and optional recipient Contact_IDs, it lists other email or text communications starting within a few hours and shows them in a card with recipient counts, timing offsets, pending status, and overlap. Built so future tools (email composer, push) can drop it in with one hook and one component.

## Files
| File | Role |
|---|---|
| `src/components/messaging-collision/actions.ts` | `checkMessagingCollisions` server action: session check, input cleaning, `MessagingCollisionService.findCollisions` |
| `src/components/messaging-collision/use-messaging-collisions.ts` | `useMessagingCollisions` client hook: debounced (500 ms), request-ID guarded, keyed to the minute of the planned instant and to the joined recipient IDs |
| `src/components/messaging-collision/messaging-collision-panel.tsx` | `MessagingCollisionPanel` card: green "nothing nearby" line or amber headline plus a list of collisions; renders nothing until a check has started |
| `src/components/messaging-collision/collision-utils.ts` | Pure helpers: `formatHours`, `describeOffset`, `describeTiming`, `describeDelay`, `formatMinutes`, `describeWindow`, `formatCollisionTime`, `channelLabel`, `partitionCollisions`, `summarizeCollisions` |
| `src/lib/dto/messaging-collision.ts` | `MessagingCollisionInput`, `MessagingCollision`, `MessagingCollisionResult`, `MessagingChannel` |
| `src/components/messaging-collision/*.test.ts` | Vitest suites for the action and the utilities |

## Key concepts
- **Planned instant, not now.** The window is centred on when the send will start. A "right away" send passes no `sendAt` and the server uses its clock; a scheduled send passes the scheduled instant (ISO with zone). The hook keys on the minute so a ticking clock does not re-check.
- **Two triggers.** Large sends nearby are always reported. Pending sends of any size are reported only when the planned send is over the threshold (`MessagingCollisionResult.plannedIsLarge`); the panel footer says which rule applied.
- **Two groups, split on the planned time.** `partitionCollisions` puts anything starting before or with the planned send under "Before this {sendNoun}" and anything after under "After this {sendNoun}", earliest first in both.
- **Queue simulation decides what interferes.** When the tool passes `plannedChannel` (and `plannedSegments` for a text), the server estimates every nearby email and text's delivery length and simulates MP's single serial worker in scheduled order (see the service doc). Each row carries `queueDelayMinutes` and `interferes`; the result carries `plannedQueueDelayMinutes`, how late this send would start. A send under the large threshold is listed only when it interferes; large sends are always listed. Interfering rows get an amber edge and a badge: "May delay this text ~12 min" (before) or "May be delayed ~5 min" (after).
- **High impact.** `isHighImpact` marks more than `MESSAGING_COLLISION_HIGH_IMPACT_THRESHOLD` (10,000) recipients: red "High impact" badge. Interference or high impact raises the summary to `warning`; anything else present is a `notice`.
- **Facts only.** Headline: "4 other messages within 12 hours. This text may start ~7 min late. 1 to more than 10,000 people." (or "1 may be delayed by this text." when this send starts on time). Rows: channel, subject, time in the church zone, `describeTiming` ("Sent 3 hours before", "Queued 18 minutes before", "Scheduled 2 hours after"), recipient count, "N also on this text". Footer: window, large threshold, "Delays are estimates." Author and sending number are in the DTO but not shown.
- **Overlap is optional.** Pass `recipientContactIds` to get "N of them also on this send" per collision; leave it out for a cheaper check. `overlapCount` is `null` when not counted or when the read budget ran out.
- **Summary for the send button.** `summarizeCollisions(result, sendNoun)` returns `{ level: 'none' | 'notice' | 'warning', headline, total, interferingCount, highImpactCount, pendingCount, maxOverlap }`. Tools repeat `headline` in their confirm dialog (Text Messaging passes it as `ReviewSendSection.collisionWarning`).
- **Copy rules.** No em-dashes; hours read as "45 minutes" / "1.5 hours"; anything within 15 minutes is "at about the same time".

## API / Interface
```typescript
// Server action
checkMessagingCollisions(input: MessagingCollisionInput): Promise<ActionResult<{ result: MessagingCollisionResult }>>

// Hook
useMessagingCollisions({ enabled, recipientCount, recipientContactIds?, sendAt: Date | null, excludeCommunicationId?, channels?, plannedChannel?, plannedSegments?, debounceMs? })
  : { result, loading, error, refresh }

// Panel
<MessagingCollisionPanel result loading error timeZone sendNoun="text" />
```

## How it works
1. Tool resolves recipients, then calls the hook with `enabled` true and the current recipient list and planned instant.
2. After the debounce the hook posts to `checkMessagingCollisions`; a newer request invalidates any earlier response.
3. The panel shows the headline; the tool optionally threads `summarizeCollisions(result).headline` into its confirm dialog.

## Usage
```typescript
// src/components/text-messaging/text-messaging-form.tsx
const collisions = useMessagingCollisions({
  enabled: summary !== null && recipientCount > 0 && !(scheduled && scheduleProblem !== null),
  recipientCount,
  recipientContactIds: summary?.recipientContactIds,
  sendAt: scheduled && !scheduleProblem ? scheduledInstant : null,
  channels: ['email', 'sms'],
  plannedChannel: 'sms',
  plannedSegments: analysis.segments,
});
const collisionSummary = collisions.result ? summarizeCollisions(collisions.result) : null;
<MessagingCollisionPanel result={collisions.result} loading={collisions.loading} error={collisions.error} timeZone={timeZone} sendNoun="text" />
```

## Gotchas
- The hook depends on `recipientContactIds` by joined contents, not identity; a 10k-ID array is joined once per identity change, which is once per recipient resolve.
- A check failure is informational (muted text in the panel); it never blocks sending.
- Thresholds and windows are server env (`MESSAGING_COLLISION_*`) and travel back in the result so the panel never hardcodes them.

## Related docs
- `../services/messaging-collision-service.md` — MP reads behind the action
- `text-messaging.md` — first consumer
