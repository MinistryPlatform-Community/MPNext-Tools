import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireDevSession = vi.hoisted(() => vi.fn());
const mockResolveContactIds = vi.hoisted(() => vi.fn());

vi.mock('./require-dev-session', () => ({
  requireDevSession: mockRequireDevSession,
}));

vi.mock('@/services/toolService', () => ({
  ToolService: {
    getInstance: vi.fn().mockResolvedValue({
      resolveContactIds: mockResolveContactIds,
    }),
  },
}));

import { resolveContactRecords } from './contact-records-actions';

describe('resolveContactRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireDevSession.mockResolvedValue({
      user: { id: 'internal-id', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
    });
  });

  it('gates on requireDevSession before delegating to the service', async () => {
    const expected = {
      tableName: 'Contacts',
      primaryKey: 'Contact_ID',
      contactIdField: 'Contact_ID',
      records: [{ recordId: 1, contactId: 1 }],
    };
    mockResolveContactIds.mockResolvedValueOnce(expected);

    const result = await resolveContactRecords('Contacts', 'Contact_ID', 'Contact_ID', [1, 2, 3]);

    expect(mockRequireDevSession).toHaveBeenCalledWith('Dev panel');
    expect(mockResolveContactIds).toHaveBeenCalledWith('Contacts', 'Contact_ID', 'Contact_ID', [1, 2, 3]);
    expect(result).toEqual(expected);
  });

  it('propagates a refusal from requireDevSession without calling the service', async () => {
    mockRequireDevSession.mockRejectedValueOnce(new Error('Unauthorized - Missing user session data'));

    await expect(
      resolveContactRecords('Contacts', 'Contact_ID', 'Contact_ID', [1])
    ).rejects.toThrow('Unauthorized - Missing user session data');
    expect(mockResolveContactIds).not.toHaveBeenCalled();
  });

  it('propagates a refusal from the service-layer authorization gate', async () => {
    mockResolveContactIds.mockRejectedValueOnce(new Error('Not authorized'));

    await expect(
      resolveContactRecords('Contacts', 'Contact_ID', 'Contact_ID', [1])
    ).rejects.toThrow('Not authorized');
  });
});
