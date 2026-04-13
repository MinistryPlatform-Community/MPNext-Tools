import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetSelectionRecordIds = vi.hoisted(() => vi.fn());
const mockGetTrainings = vi.hoisted(() => vi.fn());
const mockGetVolunteerAppIds = vi.hoisted(() => vi.fn());
const mockGetVolunteerAppIdByProgramId = vi.hoisted(() => vi.fn());
const mockAssignTraining = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/services/toolService', () => ({
  ToolService: class {
    static async getInstance() {
      return {
        getSelectionRecordIds: mockGetSelectionRecordIds,
      };
    }
  },
}));

vi.mock('@/services/trainingService', () => ({
  TrainingService: class {
    static async getInstance() {
      return {
        getTrainings: mockGetTrainings,
        getVolunteerAppIds: mockGetVolunteerAppIds,
        getVolunteerAppIdByProgramId: mockGetVolunteerAppIdByProgramId,
        assignTraining: mockAssignTraining,
      };
    }
  },
}));

const { loadTrainingToolData, assignTraining } = await import('./actions');

describe('Training Tool Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: { id: 'u1' } });
  });

  describe('loadTrainingToolData', () => {
    it('loads data for a single record', async () => {
      mockGetVolunteerAppIdByProgramId.mockResolvedValue(42);
      mockGetTrainings.mockResolvedValue([
        { Training_ID: 1, Training_Name: 'Safety' },
      ]);

      const result = await loadTrainingToolData(100, 500);

      expect(result.volunteerAppIds).toEqual([42]);
      expect(result.volunteerCount).toBe(1);
      expect(result.trainings).toHaveLength(1);
      expect(mockGetVolunteerAppIdByProgramId).toHaveBeenCalledWith(500);
    });

    it('loads data for a selection', async () => {
      mockGetSelectionRecordIds.mockResolvedValue([100, 200, 300]);
      mockGetVolunteerAppIds.mockResolvedValue([10, 20]);
      mockGetTrainings.mockResolvedValue([]);

      const result = await loadTrainingToolData(5, undefined, 99);

      expect(result.volunteerAppIds).toEqual([10, 20]);
      expect(result.volunteerCount).toBe(2);
      expect(mockGetSelectionRecordIds).toHaveBeenCalledWith(5, 99);
      expect(mockGetVolunteerAppIds).toHaveBeenCalledWith([100, 200, 300]);
    });

    it('returns empty when no record or selection provided', async () => {
      mockGetTrainings.mockResolvedValue([]);

      const result = await loadTrainingToolData(5);

      expect(result.volunteerAppIds).toEqual([]);
      expect(result.volunteerCount).toBe(0);
    });

    it('throws when not authenticated', async () => {
      mockGetSession.mockResolvedValue(null);

      await expect(loadTrainingToolData(5, 100)).rejects.toThrow('Unauthorized');
    });
  });

  describe('assignTraining', () => {
    it('returns success result', async () => {
      mockAssignTraining.mockResolvedValue({ assigned: 3, skipped: 1 });

      const result = await assignTraining([10, 20, 30, 40], 5);

      expect(result).toEqual({ success: true, assigned: 3, skipped: 1 });
    });

    it('returns error on failure', async () => {
      mockAssignTraining.mockRejectedValue(new Error('API down'));

      const result = await assignTraining([10], 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API down');
    });
  });
});
