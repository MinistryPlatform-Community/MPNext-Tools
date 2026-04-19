'use server';

import { requireDevSession } from './require-dev-session';
import { ToolService } from '@/services/toolService';
import { getCurrentUserIdFromSession } from '@/components/shared-actions/user';

export interface SelectionResult {
  recordIds: number[];
  count: number;
}

export async function resolveSelection(
  selectionId: number,
  pageId: number
): Promise<SelectionResult> {
  const session = await requireDevSession('Dev panel');

  const userId = await getCurrentUserIdFromSession(session);

  const toolService = await ToolService.getInstance();
  const recordIds = await toolService.getSelectionRecordIds(selectionId, userId, pageId);

  return { recordIds, count: recordIds.length };
}
