'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { FieldManagementService } from '@/services/fieldManagementService';
import { getCurrentUserIdFromSession } from '@/components/shared-actions/user';
import type { ColumnMetadata } from '@/lib/providers/ministry-platform/types/provider.types';
import type { PageListItem, PageFieldData, FieldOrderPayload } from './types';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

export async function fetchPages(): Promise<PageListItem[]> {
  await getSession();
  const service = await FieldManagementService.getInstance();
  return service.getPages();
}

export async function fetchPageFieldData(pageId: number, tableName: string): Promise<PageFieldData> {
  await getSession();
  const service = await FieldManagementService.getInstance();

  const [rawFields, tableMetadata] = await Promise.all([
    service.getPageFields(pageId),
    service.getTableMetadata(tableName),
  ]);

  const columnsByName = new Map<string, ColumnMetadata>();
  if (tableMetadata?.Columns) {
    for (const col of tableMetadata.Columns) {
      columnsByName.set(col.Name, col);
    }
  }

  // Tag each loaded page field as separator or data based on table metadata
  const merged: PageFieldData['fields'] = rawFields.map((f) => ({
    ...f,
    isSeparator: columnsByName.get(f.Field_Name)?.DataType === 'Separator',
  }));

  // Merge in any table columns not yet in dp_Page_Fields (including separators)
  if (tableMetadata?.Columns) {
    const existingFieldNames = new Set(rawFields.map((f) => f.Field_Name));
    const maxViewOrder = rawFields.reduce((max, f) => Math.max(max, f.View_Order), 0);
    let nextId = -1;
    let nextOrder = maxViewOrder + 1;

    for (const col of tableMetadata.Columns) {
      if (col.IsPrimaryKey) continue;
      if (existingFieldNames.has(col.Name)) continue;

      const isSeparator = col.DataType === 'Separator';

      merged.push({
        Page_Field_ID: nextId--,
        Page_ID: pageId,
        Field_Name: col.Name,
        Group_Name: null,
        View_Order: nextOrder++,
        Required: isSeparator ? false : col.IsRequired,
        Hidden: false,
        Default_Value: null,
        Filter_Clause: null,
        Depends_On_Field: null,
        Field_Label: null,
        Writing_Assistant_Enabled: false,
        isSeparator,
      });
    }
  }

  return { fields: merged, tableMetadata };
}

export async function savePageFieldOrder(
  fields: FieldOrderPayload[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    const userId = await getCurrentUserIdFromSession(session);
    const service = await FieldManagementService.getInstance();
    await service.updatePageFieldOrder(fields, userId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save field order' };
  }
}
