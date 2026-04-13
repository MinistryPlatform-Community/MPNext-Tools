import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrainingService } from './trainingService';

const mockGetTableRecords = vi.hoisted(() => vi.fn());
const mockCreateTableRecords = vi.hoisted(() => vi.fn());

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
    createTableRecords = mockCreateTableRecords;
  },
}));

describe('TrainingService', () => {
  beforeEach(() => {
    (TrainingService as any).instance = undefined;
    vi.clearAllMocks();
  });

  describe('getTrainings', () => {
    it('returns all trainings ordered by name', async () => {
      const trainings = [
        { Training_ID: 1, Training_Name: 'Child Safety' },
        { Training_ID: 2, Training_Name: 'First Aid' },
      ];
      mockGetTableRecords.mockResolvedValue(trainings);

      const service = await TrainingService.getInstance();
      const result = await service.getTrainings();

      expect(result).toEqual(trainings);
      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'Volunteer_Training',
        select: 'Training_ID, Training_Name',
        orderBy: 'Training_Name',
      });
    });
  });

  describe('getVolunteerAppIds', () => {
    it('returns unique app IDs for given program record IDs', async () => {
      mockGetTableRecords.mockResolvedValue([
        { Volunteer_App_ID: 10 },
        { Volunteer_App_ID: 20 },
      ]);

      const service = await TrainingService.getInstance();
      const result = await service.getVolunteerAppIds([100, 200, 300]);

      expect(result).toEqual([10, 20]);
      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'Volunteer_App_Programs',
        select: 'Volunteer_App_ID',
        filter: 'Volunteer_App_Program_ID IN (100,200,300)',
        distinct: true,
      });
    });

    it('returns empty array for empty input', async () => {
      const service = await TrainingService.getInstance();
      const result = await service.getVolunteerAppIds([]);

      expect(result).toEqual([]);
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });
  });

  describe('getVolunteerAppIdByProgramId', () => {
    it('returns the app ID for a single program record', async () => {
      mockGetTableRecords.mockResolvedValue([{ Volunteer_App_ID: 42 }]);

      const service = await TrainingService.getInstance();
      const result = await service.getVolunteerAppIdByProgramId(100);

      expect(result).toBe(42);
    });

    it('returns null when program not found', async () => {
      mockGetTableRecords.mockResolvedValue([]);

      const service = await TrainingService.getInstance();
      const result = await service.getVolunteerAppIdByProgramId(999);

      expect(result).toBeNull();
    });
  });

  describe('assignTraining', () => {
    it('creates records for apps that do not already have the training', async () => {
      // First call: check existing — app 10 already has it
      mockGetTableRecords.mockResolvedValueOnce([{ Volunteer_App_ID: 10 }]);
      mockCreateTableRecords.mockResolvedValue([]);

      const service = await TrainingService.getInstance();
      const result = await service.assignTraining([10, 20, 30], 5);

      expect(result).toEqual({ assigned: 2, skipped: 1 });
      expect(mockCreateTableRecords).toHaveBeenCalledWith(
        'Volunteer_App_Trainings',
        expect.arrayContaining([
          expect.objectContaining({ Volunteer_App_ID: 20, Training_ID: 5 }),
          expect.objectContaining({ Volunteer_App_ID: 30, Training_ID: 5 }),
        ])
      );
    });

    it('skips all when all already assigned', async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        { Volunteer_App_ID: 10 },
        { Volunteer_App_ID: 20 },
      ]);

      const service = await TrainingService.getInstance();
      const result = await service.assignTraining([10, 20], 5);

      expect(result).toEqual({ assigned: 0, skipped: 2 });
      expect(mockCreateTableRecords).not.toHaveBeenCalled();
    });

    it('returns zeros for empty app list', async () => {
      const service = await TrainingService.getInstance();
      const result = await service.assignTraining([], 5);

      expect(result).toEqual({ assigned: 0, skipped: 0 });
    });
  });
});
