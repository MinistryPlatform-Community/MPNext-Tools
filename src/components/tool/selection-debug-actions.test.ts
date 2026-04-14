import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetSelectionRecordIds = vi.hoisted(() => vi.fn());
const mockMPGetTableRecords = vi.hoisted(() => vi.fn());

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
  ToolService: {
    getInstance: vi.fn().mockResolvedValue({
      getSelectionRecordIds: mockGetSelectionRecordIds,
    }),
  },
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockMPGetTableRecords;
  },
}));

import { resolveSelection } from './selection-debug-actions';

const validSession = {
  user: { id: 'ba-1', userGuid: 'guid-abc' },
  session: { id: 'sess-1' },
};

describe('resolveSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(validSession);
    mockMPGetTableRecords.mockResolvedValue([{ User_ID: 42 }]);
  });

  it('should resolve selection record IDs', async () => {
    mockGetSelectionRecordIds.mockResolvedValue([100, 200, 300]);

    const result = await resolveSelection(5, 292);

    expect(result).toEqual({ recordIds: [100, 200, 300], count: 3 });
    expect(mockGetSelectionRecordIds).toHaveBeenCalledWith(5, 42, 292);
  });

  it('should return empty array when selection has no records', async () => {
    mockGetSelectionRecordIds.mockResolvedValue([]);

    const result = await resolveSelection(5, 292);

    expect(result).toEqual({ recordIds: [], count: 0 });
  });

  it('should throw when user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(resolveSelection(5, 292)).rejects.toThrow('Unauthorized');
  });

  it('should throw when userGuid is missing from session', async () => {
    mockGetSession.mockResolvedValue({ user: { id: 'ba-1' } });

    await expect(resolveSelection(5, 292)).rejects.toThrow('User GUID not found in session');
  });

  it('should throw when MP user not found', async () => {
    mockMPGetTableRecords.mockResolvedValue([]);

    await expect(resolveSelection(5, 292)).rejects.toThrow('MP user not found');
  });
});
