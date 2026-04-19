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

  describe('listPages', () => {
    const allPages = [
      { Page_ID: 1, Display_Name: 'Contacts', Table_Name: 'Contacts' },
      { Page_ID: 2, Display_Name: 'Events', Table_Name: 'Events' },
      { Page_ID: 3, Display_Name: 'Groups', Table_Name: 'Groups' },
    ];

    it('calls api_MPNextTools_GetPages with empty params', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([allPages]);

      const service = await ToolService.getInstance();
      const result = await service.listPages();

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith('api_MPNextTools_GetPages', {});
      expect(result).toEqual(allPages);
    });

    it('filters by Display_Name (case-insensitive) when search is provided', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([allPages]);
      const service = await ToolService.getInstance();

      const result = await service.listPages('contact');

      expect(result).toEqual([{ Page_ID: 1, Display_Name: 'Contacts', Table_Name: 'Contacts' }]);
    });

    it('filters by Table_Name (case-insensitive) when Display_Name does not match', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[
        { Page_ID: 5, Display_Name: 'Primary Contacts', Table_Name: 'Households' },
        { Page_ID: 6, Display_Name: 'Something Else', Table_Name: 'Households' },
      ]]);
      const service = await ToolService.getInstance();

      const result = await service.listPages('household');

      expect(result.map((r) => r.Page_ID)).toEqual([5, 6]);
    });

    it('trims whitespace from the search term', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([allPages]);
      const service = await ToolService.getInstance();

      const result = await service.listPages('   events   ');

      expect(result).toEqual([{ Page_ID: 2, Display_Name: 'Events', Table_Name: 'Events' }]);
    });

    it('caps results at 100 rows', async () => {
      const many = Array.from({ length: 250 }, (_, i) => ({
        Page_ID: i,
        Display_Name: `Page_${i}`,
        Table_Name: 'Table',
      }));
      mockExecuteProcedureWithBody.mockResolvedValueOnce([many]);
      const service = await ToolService.getInstance();

      const result = await service.listPages();

      expect(result).toHaveLength(100);
      expect(result[0].Page_ID).toBe(0);
      expect(result[99].Page_ID).toBe(99);
    });

    it('returns an empty array when the SP returns no rows', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);
      const service = await ToolService.getInstance();

      const result = await service.listPages();

      expect(result).toEqual([]);
    });

    it('returns an empty array when the SP returns no result sets', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([]);
      const service = await ToolService.getInstance();

      const result = await service.listPages();

      expect(result).toEqual([]);
    });
  });

  describe('listRoles', () => {
    it('queries dp_Roles with no filter when search omitted', async () => {
      mockGetTableRecords.mockResolvedValueOnce([{ Role_ID: 1, Role_Name: 'Administrators' }]);

      const service = await ToolService.getInstance();
      const result = await service.listRoles();

      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'dp_Roles',
        select: 'Role_ID, Role_Name',
        filter: undefined,
        orderBy: 'Role_Name',
        top: 100,
      });
      expect(result).toEqual([{ Role_ID: 1, Role_Name: 'Administrators' }]);
    });

    it('builds a LIKE filter when search is provided', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await ToolService.getInstance();

      await service.listRoles('Admin');

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "Role_Name LIKE '%Admin%'",
        })
      );
    });

    it('escapes single quotes in search term', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);
      const service = await ToolService.getInstance();

      await service.listRoles("O'Brien");

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "Role_Name LIKE '%O''Brien%'",
        })
      );
    });
  });

  describe('deployTool', () => {
    const baseInput = {
      toolName: 'FooTool',
      launchPage: 'https://example.org/tools/foo',
      description: 'A test tool',
      launchWithCredentials: true,
      launchWithParameters: true,
      launchInNewTab: false,
      showOnMobile: false,
      pageIds: [292, 305],
      additionalData: 'extra',
      roleIds: [1, 5],
    };

    const toolRow = {
      Tool_ID: 42,
      Tool_Name: 'FooTool',
      Description: 'A test tool',
      Launch_Page: 'https://example.org/tools/foo',
      Launch_with_Credentials: true,
      Launch_with_Parameters: true,
      Launch_in_New_Tab: false,
      Show_On_Mobile: false,
    };

    it('calls api_dev_DeployTool with shaped payload', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[toolRow], [], []]);
      const service = await ToolService.getInstance();

      const result = await service.deployTool(baseInput);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith(
        'api_dev_DeployTool',
        {
          '@ToolName': 'FooTool',
          '@LaunchPage': 'https://example.org/tools/foo',
          '@Description': 'A test tool',
          '@LaunchWithCredentials': 1,
          '@LaunchWithParameters': 1,
          '@LaunchInNewTab': 0,
          '@ShowOnMobile': 0,
          '@PageIDs': '292,305',
          '@AdditionalData': 'extra',
          '@RoleIDs': '1,5',
        },
        undefined
      );
      expect(result.tool).toEqual(toolRow);
      expect(result.pages).toEqual([]);
      expect(result.roles).toEqual([]);
    });

    it('forwards $userId as query param when userId is provided', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[toolRow], [], []]);
      const service = await ToolService.getInstance();

      await service.deployTool(baseInput, 42);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith(
        'api_dev_DeployTool',
        expect.any(Object),
        { $userId: 42 }
      );
    });

    it('sends null for empty @PageIDs, @RoleIDs, @Description, @AdditionalData', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[toolRow], [], []]);
      const service = await ToolService.getInstance();

      await service.deployTool({
        ...baseInput,
        description: undefined,
        pageIds: [],
        additionalData: undefined,
        roleIds: [],
      });

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith(
        'api_dev_DeployTool',
        expect.objectContaining({
          '@Description': null,
          '@PageIDs': null,
          '@AdditionalData': null,
          '@RoleIDs': null,
        }),
        undefined
      );
    });

    it('maps booleans to 1/0 for BIT params', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[toolRow], [], []]);
      const service = await ToolService.getInstance();

      await service.deployTool({
        ...baseInput,
        launchWithCredentials: false,
        launchWithParameters: false,
        launchInNewTab: true,
        showOnMobile: true,
      });

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith(
        'api_dev_DeployTool',
        expect.objectContaining({
          '@LaunchWithCredentials': 0,
          '@LaunchWithParameters': 0,
          '@LaunchInNewTab': 1,
          '@ShowOnMobile': 1,
        }),
        undefined
      );
    });

    it('returns the three SP result sets', async () => {
      const pageRow = { Tool_Page_ID: 1, Tool_ID: 42, Page_ID: 292, Page_Name: 'Contacts', Additional_Data: 'extra' };
      const roleRow = { Role_Tool_ID: 1, Tool_ID: 42, Role_ID: 1, Role_Name: 'Administrators', Domain_ID: 1 };
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[toolRow], [pageRow], [roleRow]]);

      const service = await ToolService.getInstance();
      const result = await service.deployTool(baseInput);

      expect(result).toEqual({
        tool: toolRow,
        pages: [pageRow],
        roles: [roleRow],
      });
    });

    it('throws when the SP returns no tool row', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[], [], []]);
      const service = await ToolService.getInstance();

      await expect(service.deployTool(baseInput)).rejects.toThrow(
        /Deploy did not return a tool row/
      );
    });

    it('validates required fields before calling the SP', async () => {
      const service = await ToolService.getInstance();

      await expect(
        service.deployTool({ ...baseInput, toolName: '   ' })
      ).rejects.toThrow('Tool Name is required');

      await expect(
        service.deployTool({ ...baseInput, launchPage: '' })
      ).rejects.toThrow('Launch Page is required');

      expect(mockExecuteProcedureWithBody).not.toHaveBeenCalled();
    });

    it('validates length limits', async () => {
      const service = await ToolService.getInstance();

      await expect(
        service.deployTool({ ...baseInput, toolName: 'x'.repeat(31) })
      ).rejects.toThrow('Tool Name must be 30 characters or fewer');

      await expect(
        service.deployTool({ ...baseInput, description: 'x'.repeat(101) })
      ).rejects.toThrow('Description must be 100 characters or fewer');

      await expect(
        service.deployTool({ ...baseInput, additionalData: 'x'.repeat(66) })
      ).rejects.toThrow('Additional Data must be 65 characters or fewer');

      expect(mockExecuteProcedureWithBody).not.toHaveBeenCalled();
    });

    it('propagates SP errors', async () => {
      mockExecuteProcedureWithBody.mockRejectedValueOnce(new Error('403 Forbidden'));
      const service = await ToolService.getInstance();

      await expect(service.deployTool(baseInput)).rejects.toThrow('403 Forbidden');
    });
  });
});
