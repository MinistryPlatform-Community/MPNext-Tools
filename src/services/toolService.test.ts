import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolService } from '@/services/toolService';

const { mockExecuteProcedureWithBody, mockGetTableRecords } = vi.hoisted(() => ({
  mockExecuteProcedureWithBody: vi.fn(),
  mockGetTableRecords: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => {
  return {
    MPHelper: class {
      executeProcedureWithBody = mockExecuteProcedureWithBody;
      getTableRecords = mockGetTableRecords;
    },
  };
});

describe('ToolService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ToolService as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', async () => {
      const instance1 = await ToolService.getInstance();
      const instance2 = await ToolService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getPageData', () => {
    it('should call executeProcedureWithBody with correct params', async () => {
      const mockPageData = {
        Page_ID: 292,
        Display_Name: 'Contacts',
        Table_Name: 'Contacts',
        Primary_Key: 'Contact_ID',
      };
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[mockPageData]]);

      const service = await ToolService.getInstance();
      const result = await service.getPageData(292);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith('api_Tools_GetPageData', {
        '@PageID': 292,
      });
      expect(result).toEqual(mockPageData);
    });

    it('should return null when no data found', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);

      const service = await ToolService.getInstance();
      const result = await service.getPageData(999);

      expect(result).toBeNull();
    });

    it('should return null when result is empty', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([]);

      const service = await ToolService.getInstance();
      const result = await service.getPageData(999);

      expect(result).toBeNull();
    });

    it('should propagate errors', async () => {
      mockExecuteProcedureWithBody.mockRejectedValueOnce(new Error('Procedure not found'));

      const service = await ToolService.getInstance();
      await expect(service.getPageData(292)).rejects.toThrow('Procedure not found');
    });
  });

  describe('getSelectionRecordIds', () => {
    it('should call api_Common_GetSelection with correct params', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([
        [{ Record_ID: 101 }, { Record_ID: 102 }, { Record_ID: 103 }],
      ]);

      const service = await ToolService.getInstance();
      const result = await service.getSelectionRecordIds(270, 42, 292);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith('api_Common_GetSelection', {
        '@SelectionID': 270,
        '@UserID': 42,
        '@PageID': 292,
      });
      expect(result).toEqual([101, 102, 103]);
    });

    it('should return empty array when no records found', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);

      const service = await ToolService.getInstance();
      const result = await service.getSelectionRecordIds(270, 42, 292);

      expect(result).toEqual([]);
    });

    it('should find Record_ID in any result set', async () => {
      // Some procs return metadata in first result set, records in second
      mockExecuteProcedureWithBody.mockResolvedValueOnce([
        [{ SomeMetadata: 'value' }],
        [{ Record_ID: 201 }, { Record_ID: 202 }],
      ]);

      const service = await ToolService.getInstance();
      const result = await service.getSelectionRecordIds(270, 42, 292);

      expect(result).toEqual([201, 202]);
    });
  });

  describe('getUserTools', () => {
    it('should return tool paths array', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([
        [
          { Tool_Path: '/contacts' },
          { Tool_Path: '/events' },
          { Tool_Path: '/groups' },
        ],
      ]);

      const service = await ToolService.getInstance();
      const result = await service.getUserTools(42);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith('api_Tools_GetUserTools', {
        '@UserId': 42,
      });
      expect(result).toEqual(['/contacts', '/events', '/groups']);
    });

    it('should return empty array when no tools found', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);

      const service = await ToolService.getInstance();
      const result = await service.getUserTools(42);

      expect(result).toEqual([]);
    });

    it('should propagate errors', async () => {
      mockExecuteProcedureWithBody.mockRejectedValueOnce(new Error('Access denied'));

      const service = await ToolService.getInstance();
      await expect(service.getUserTools(42)).rejects.toThrow('Access denied');
    });
  });

  describe('resolveContactIds', () => {
    it('should return empty records when recordIds is empty', async () => {
      const service = await ToolService.getInstance();
      const result = await service.resolveContactIds(
        'Group_Participants', 'Group_Participant_ID',
        'Participant_ID_Table.Contact_ID', []
      );

      expect(mockGetTableRecords).not.toHaveBeenCalled();
      expect(result).toEqual({
        tableName: 'Group_Participants',
        primaryKey: 'Group_Participant_ID',
        contactIdField: 'Participant_ID_Table.Contact_ID',
        records: [],
      });
    });

    it('should short-circuit when contactIdField equals primaryKey', async () => {
      const service = await ToolService.getInstance();
      const result = await service.resolveContactIds(
        'Contacts', 'Contact_ID', 'Contact_ID', [10, 20, 30]
      );

      expect(mockGetTableRecords).not.toHaveBeenCalled();
      expect(result).toEqual({
        tableName: 'Contacts',
        primaryKey: 'Contact_ID',
        contactIdField: 'Contact_ID',
        records: [
          { recordId: 10, contactId: 10 },
          { recordId: 20, contactId: 20 },
          { recordId: 30, contactId: 30 },
        ],
      });
    });

    it('should resolve contact IDs with a direct column', async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        { Donation_ID: 1, Contact_ID: 100 },
        { Donation_ID: 2, Contact_ID: 200 },
      ]);

      const service = await ToolService.getInstance();
      const result = await service.resolveContactIds(
        'Donations', 'Donation_ID', 'Contact_ID', [1, 2]
      );

      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'Donations',
        select: 'Donation_ID, Contact_ID',
        filter: 'Donation_ID IN (1,2)',
      });
      expect(result.records).toEqual([
        { recordId: 1, contactId: 100 },
        { recordId: 2, contactId: 200 },
      ]);
    });

    it('should resolve contact IDs with FK traversal path', async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        { Group_Participant_ID: 10, Contact_ID: 500 },
        { Group_Participant_ID: 11, Contact_ID: 501 },
      ]);

      const service = await ToolService.getInstance();
      const result = await service.resolveContactIds(
        'Group_Participants', 'Group_Participant_ID',
        'Participant_ID_Table.Contact_ID', [10, 11]
      );

      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'Group_Participants',
        select: 'Group_Participant_ID, Participant_ID_Table.Contact_ID',
        filter: 'Group_Participant_ID IN (10,11)',
      });
      expect(result.records).toEqual([
        { recordId: 10, contactId: 500 },
        { recordId: 11, contactId: 501 },
      ]);
    });

    it('should batch record IDs in groups of 100', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => i + 1);
      mockGetTableRecords.mockResolvedValueOnce(
        ids.slice(0, 100).map(id => ({ Event_ID: id, Contact_ID: id + 1000 }))
      );
      mockGetTableRecords.mockResolvedValueOnce(
        ids.slice(100).map(id => ({ Event_ID: id, Contact_ID: id + 1000 }))
      );

      const service = await ToolService.getInstance();
      const result = await service.resolveContactIds(
        'Events', 'Event_ID', 'Contact_ID', ids
      );

      expect(mockGetTableRecords).toHaveBeenCalledTimes(2);
      expect(result.records).toHaveLength(150);
      expect(result.records[0]).toEqual({ recordId: 1, contactId: 1001 });
      expect(result.records[149]).toEqual({ recordId: 150, contactId: 1150 });
    });

    it('should propagate errors', async () => {
      mockGetTableRecords.mockRejectedValueOnce(new Error('Table not found'));

      const service = await ToolService.getInstance();
      await expect(
        service.resolveContactIds('Bad_Table', 'ID', 'Contact_ID', [1])
      ).rejects.toThrow('Table not found');
    });
  });
});
