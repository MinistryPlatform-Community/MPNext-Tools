import { MPHelper } from '@/lib/providers/ministry-platform';
import type { TrainingOption } from '@/lib/dto/training-tool';

/**
 * TrainingService - Singleton service for volunteer training operations.
 * Used by Training Tool server actions.
 */
export class TrainingService {
  private static instance: TrainingService;
  private mp: MPHelper | null = null;

  private constructor() {
    this.initialize();
  }

  public static async getInstance(): Promise<TrainingService> {
    if (!TrainingService.instance) {
      TrainingService.instance = new TrainingService();
      await TrainingService.instance.initialize();
    }
    return TrainingService.instance;
  }

  private async initialize(): Promise<void> {
    this.mp = new MPHelper();
  }

  // ----------------------------------------------------------------
  // Lookup data
  // ----------------------------------------------------------------

  /**
   * Gets all available volunteer trainings for the dropdown.
   */
  public async getTrainings(): Promise<TrainingOption[]> {
    return await this.mp!.getTableRecords<TrainingOption>({
      table: 'Volunteer_Training',
      select: 'Training_ID, Training_Name',
      orderBy: 'Training_Name',
    });
  }

  // ----------------------------------------------------------------
  // Volunteer App resolution
  // ----------------------------------------------------------------

  /**
   * Given a list of Volunteer_App_Program record IDs, returns the unique
   * Volunteer_App_IDs they belong to.
   */
  public async getVolunteerAppIds(programRecordIds: number[]): Promise<number[]> {
    if (programRecordIds.length === 0) return [];

    const idList = programRecordIds.join(',');
    const records = await this.mp!.getTableRecords<{ Volunteer_App_ID: number }>({
      table: 'Volunteer_App_Programs',
      select: 'Volunteer_App_ID',
      filter: `Volunteer_App_Program_ID IN (${idList})`,
      distinct: true,
    });

    return records.map((r) => r.Volunteer_App_ID);
  }

  /**
   * Gets the Volunteer_App_ID for a single Volunteer_App_Program record.
   */
  public async getVolunteerAppIdByProgramId(programId: number): Promise<number | null> {
    const records = await this.mp!.getTableRecords<{ Volunteer_App_ID: number }>({
      table: 'Volunteer_App_Programs',
      select: 'Volunteer_App_ID',
      filter: `Volunteer_App_Program_ID = ${programId}`,
      top: 1,
    });

    return records.length > 0 ? records[0].Volunteer_App_ID : null;
  }

  // ----------------------------------------------------------------
  // Training assignment
  // ----------------------------------------------------------------

  /**
   * Assigns a training to multiple volunteer apps.
   * Skips any that already have the training assigned.
   * Returns counts of assigned and skipped records.
   */
  public async assignTraining(
    appIds: number[],
    trainingId: number
  ): Promise<{ assigned: number; skipped: number }> {
    if (appIds.length === 0) return { assigned: 0, skipped: 0 };

    // Check which apps already have this training
    const idList = appIds.join(',');
    const existing = await this.mp!.getTableRecords<{ Volunteer_App_ID: number }>({
      table: 'Volunteer_App_Trainings',
      select: 'Volunteer_App_ID',
      filter: `Volunteer_App_ID IN (${idList}) AND Training_ID = ${trainingId}`,
    });

    const existingAppIds = new Set(existing.map((r) => r.Volunteer_App_ID));
    const toCreate = appIds.filter((id) => !existingAppIds.has(id));

    if (toCreate.length > 0) {
      const now = new Date().toISOString();
      const records = toCreate.map((appId) => ({
        Volunteer_App_ID: appId,
        Training_ID: trainingId,
        Start_Date: now,
      }));

      await this.mp!.createTableRecords('Volunteer_App_Trainings', records);
    }

    return {
      assigned: toCreate.length,
      skipped: existingAppIds.size,
    };
  }
}
