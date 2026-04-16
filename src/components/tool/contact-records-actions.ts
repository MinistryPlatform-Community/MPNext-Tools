'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ToolService } from '@/services/toolService';
import type { ContactRecordResult } from '@/services/toolService';

export type { ContactRecordResult };

export async function resolveContactRecords(
  tableName: string,
  primaryKey: string,
  contactIdField: string,
  recordIds: number[]
): Promise<ContactRecordResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');

  const toolService = await ToolService.getInstance();
  return toolService.resolveContactIds(tableName, primaryKey, contactIdField, recordIds);
}
