'use server';

import { requireDevSession } from './require-dev-session';
import { ToolService } from '@/services/toolService';
import type { ContactRecordResult } from '@/services/toolService';

/**
 * Takes the page ID, not table/column names: the service resolves the page's
 * metadata server-side, so the caller never chooses what the service account
 * reads.
 */
export async function resolveContactRecords(
  pageId: number,
  recordIds: number[]
): Promise<ContactRecordResult | null> {
  await requireDevSession('Dev panel');

  const toolService = await ToolService.getInstance();
  return toolService.resolveContactIds(pageId, recordIds);
}
