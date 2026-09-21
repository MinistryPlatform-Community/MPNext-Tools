'use server';

import { AuthorizationService } from '@/services/authorizationService';
import { MessagingCollisionService } from '@/services/messagingCollisionService';
import type { MessagingChannel, MessagingCollisionInput, MessagingCollisionResult } from '@/lib/dto';

type ActionResult<T> = ({ success: true } & T) | { success: false; error: string };

const CHANNELS: ReadonlySet<MessagingChannel> = new Set(['email', 'sms', 'other']);

/**
 * Authorization gate (CLAUDE.md rule 12): the collision check reads other people's
 * communications (subjects, recipient counts, overlap), so a session alone is not
 * enough; the caller must hold an MP security role. The service gates again.
 */
async function requireAccess(): Promise<void> {
  await AuthorizationService.getInstance().requireSecurityRole({ table: 'dp_Communications', operation: 'read' });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Parses the optional planned instant; anything unparseable is rejected rather than treated as now. */
function resolveSendAt(value: string | undefined): Date {
  if (value === undefined || value === null || value.trim() === '') return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('The planned send time is not valid.');
  return parsed;
}

function cleanIds(ids: number[] | undefined): number[] {
  return [...new Set((ids ?? []).map((id) => Math.trunc(Number(id))).filter((id) => Number.isFinite(id) && id > 0))];
}

/**
 * Finds other email or text communications starting within a few hours of the
 * planned send. Read-only; callers need an MP security role. Tools call this once
 * recipients are known and again whenever the planned time changes.
 */
export async function checkMessagingCollisions(
  input: MessagingCollisionInput
): Promise<ActionResult<{ result: MessagingCollisionResult }>> {
  try {
    await requireAccess();
    const recipientCount = Math.trunc(Number(input.recipientCount));
    if (!Number.isFinite(recipientCount) || recipientCount < 0) throw new Error('Recipient count is not valid.');
    const channels = (input.channels ?? []).filter((c) => CHANNELS.has(c));
    const excludeCommunicationId =
      input.excludeCommunicationId && input.excludeCommunicationId > 0
        ? Math.trunc(input.excludeCommunicationId)
        : undefined;

    const service = await MessagingCollisionService.getInstance();
    const result = await service.findCollisions({
      sendAt: resolveSendAt(input.sendAt),
      recipientCount,
      recipientContactIds: cleanIds(input.recipientContactIds),
      excludeCommunicationId,
      channels: channels.length > 0 ? channels : undefined,
      plannedChannel: input.plannedChannel && CHANNELS.has(input.plannedChannel) ? input.plannedChannel : undefined,
      plannedSegments:
        Number.isFinite(input.plannedSegments) && (input.plannedSegments as number) > 0
          ? Math.trunc(input.plannedSegments as number)
          : undefined,
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: errorMessage(error, 'Failed to check for other messages near this send time') };
  }
}
