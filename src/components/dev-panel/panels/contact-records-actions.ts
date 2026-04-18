'use server';

import { requireDevSession } from './require-dev-session';
import { ToolService } from '@/services/toolService';
import type { ContactRecordResult } from '@/services/toolService';

export async function resolveContactRecords(
  tableName: string,
  primaryKey: string,
  contactIdField: string,
  recordIds: number[]
): Promise<ContactRecordResult> {
  await requireDevSession('Dev panel');

  const toolService = await ToolService.getInstance();
  return toolService.resolveContactIds(tableName, primaryKey, contactIdField, recordIds);
}
