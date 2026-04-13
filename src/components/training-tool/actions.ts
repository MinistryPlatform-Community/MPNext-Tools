'use server';

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { ToolService } from '@/services/toolService';
import { TrainingService } from '@/services/trainingService';
import type { TrainingToolData, TrainingAssignResult } from '@/lib/dto';

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session;
}

/**
 * Loads the training tool data: available trainings and resolved volunteer app IDs.
 *
 * @param pageId - The MP page ID (used for selection lookup)
 * @param recordId - Single record ID (if launched for one record)
 * @param selectionId - Selection ID (if launched for a batch)
 */
export async function loadTrainingToolData(
  pageId: number,
  recordId?: number,
  selectionId?: number
): Promise<TrainingToolData> {
  await getSession();

  const trainingService = await TrainingService.getInstance();
  const toolService = await ToolService.getInstance();

  let volunteerAppIds: number[] = [];

  if (recordId && recordId > 0) {
    // Single record mode
    const appId = await trainingService.getVolunteerAppIdByProgramId(recordId);
    if (appId !== null) {
      volunteerAppIds = [appId];
    }
  } else if (selectionId && selectionId > 0 && pageId > 0) {
    // Selection mode — get all record IDs from the selection, then resolve to app IDs
    const recordIds = await toolService.getSelectionRecordIds(pageId, selectionId);
    volunteerAppIds = await trainingService.getVolunteerAppIds(recordIds);
  }

  const trainings = await trainingService.getTrainings();

  return {
    trainings,
    volunteerAppIds,
    volunteerCount: volunteerAppIds.length,
  };
}

/**
 * Assigns a training to the given volunteer app IDs.
 */
export async function assignTraining(
  appIds: number[],
  trainingId: number
): Promise<TrainingAssignResult> {
  try {
    await getSession();
    const service = await TrainingService.getInstance();

    const { assigned, skipped } = await service.assignTraining(appIds, trainingId);

    return { success: true, assigned, skipped };
  } catch (error) {
    console.error('assignTraining error:', error);
    return {
      success: false,
      assigned: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
