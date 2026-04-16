'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ToolService } from '@/services/toolService';
import { UserService } from '@/services/userService';

export interface SelectionResult {
  recordIds: number[];
  count: number;
}

export async function resolveSelection(
  selectionId: number,
  pageId: number
): Promise<SelectionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');

  const userGuid = (session.user as Record<string, unknown>).userGuid as string | undefined;
  if (!userGuid) throw new Error('User GUID not found in session');

  const userService = await UserService.getInstance();
  const userId = await userService.getUserIdByGuid(userGuid);

  const toolService = await ToolService.getInstance();
  const recordIds = await toolService.getSelectionRecordIds(selectionId, userId, pageId);

  return { recordIds, count: recordIds.length };
}
