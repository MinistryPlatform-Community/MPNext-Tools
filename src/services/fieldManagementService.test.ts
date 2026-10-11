import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecuteProcedureWithBody, mockGetTables } = vi.hoisted(() => ({
  mockExecuteProcedureWithBody: vi.fn(),
  mockGetTables: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    executeProcedureWithBody = mockExecuteProcedureWithBody;
    getTables = mockGetTables;
  },
}));

/**
 * The service layer now gates every MP-touching method through
 * AuthorizationService. Mock it so these tests exercise the service logic
 * rather than the gate; the gate has its own tests in
 * `authorizationService.test.ts`, and refusal behaviour is asserted there.
 *
 * The stub returns 42 as the acting MP User_ID, which is also the only source
 * of `$userId` write attribution — so assertions on `$userId` below are
 * asserting that the service takes it from the gate.
 */
const { mockRequireSecurityRole, mockHasSecurityRole } = vi.hoisted(() => ({
  mockRequireSecurityRole: vi.fn(async () => 42),
  mockHasSecurityRole: vi.fn(async () => true),
}));

vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: {
    getInstance: () => ({
      requireSecurityRole: mockRequireSecurityRole,
      hasSecurityRole: mockHasSecurityRole,
    }),
  },
  UnauthorizedError: class UnauthorizedError extends Error {},
}));


import { FieldManagementService } from './fieldManagementService';

describe('FieldManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
     
    (FieldManagementService as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', async () => {
      const instance1 = await FieldManagementService.getInstance();
      const instance2 = await FieldManagementService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize MPHelper so service methods do not throw', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([]);
      const service = await FieldManagementService.getInstance();
      await expect(service.getPages()).resolves.toEqual([]);
    });
  });

  describe('getPages', () => {
    it('should return array from result[0] when result has data', async () => {
      const pages = [
        { Page_ID: 292, Display_Name: 'Contacts', Table_Name: 'Contacts' },
        { Page_ID: 293, Display_Name: 'Events', Table_Name: 'Events' },
      ];
      mockExecuteProcedureWithBody.mockResolvedValueOnce([pages]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getPages();

      expect(result).toEqual(pages);
    });

    it('should return empty array when result is empty array', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getPages();

      expect(result).toEqual([]);
    });

    it('should return empty array when result[0] is empty array', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getPages();

      expect(result).toEqual([]);
    });

    it('should return empty array when result is null', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce(null);

      const service = await FieldManagementService.getInstance();
      const result = await service.getPages();

      expect(result).toEqual([]);
    });

    it('should return empty array when result is undefined', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce(undefined);

      const service = await FieldManagementService.getInstance();
      const result = await service.getPages();

      expect(result).toEqual([]);
    });

    it('should call executeProcedureWithBody with api_MPNextTools_GetPages and empty params', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);

      const service = await FieldManagementService.getInstance();
      await service.getPages();

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith('api_MPNextTools_GetPages', {});
    });
  });

  describe('getPageFields', () => {
    it('should pass pageId as @PageID parameter', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);

      const service = await FieldManagementService.getInstance();
      await service.getPageFields(292);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith('api_MPNextTools_GetPageFields', {
        '@PageID': 292,
      });
    });

    it('should return empty array when result has no data', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[]]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getPageFields(292);

      expect(result).toEqual([]);
    });

    it('should return the first result set', async () => {
      const fields = [
        {
          Page_Field_ID: 1,
          Page_ID: 292,
          Field_Name: 'Contact_ID',
          Group_Name: 'Basic',
          View_Order: 10,
          Required: true,
          Hidden: false,
          Default_Value: null,
          Filter_Clause: null,
          Depends_On_Field: null,
          Field_Label: null,
          Writing_Assistant_Enabled: false,
        },
      ];
      mockExecuteProcedureWithBody.mockResolvedValueOnce([fields]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getPageFields(292);

      expect(result).toEqual(fields);
    });
  });

  describe('getTableMetadata', () => {
    it('should return null when getTables returns empty array', async () => {
      mockGetTables.mockResolvedValueOnce([]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getTableMetadata('Contacts');

      expect(result).toBeNull();
    });

    it('returns the exact Name match when it is not the first search result', async () => {
      const contactLog = { Name: 'Contact_Log', Columns: [] };
      const contacts = { Name: 'Contacts', Columns: [] };
      const contactAttributes = { Name: 'Contact_Attributes', Columns: [] };
      mockGetTables.mockResolvedValueOnce([contactLog, contacts, contactAttributes]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getTableMetadata('Contacts');

      expect(mockGetTables).toHaveBeenCalledWith('Contacts');
      expect(result).toBe(contacts);
    });

    it('returns null (no fallback to the first result) when nothing matches exactly', async () => {
      mockGetTables.mockResolvedValueOnce([
        { Name: 'Contact_Log', Columns: [] },
        { Name: 'Contact_Attributes', Columns: [] },
      ]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getTableMetadata('Contacts');

      expect(result).toBeNull();
    });

    it('does not match on a legacy Table_Name key (the API returns Name)', async () => {
      mockGetTables.mockResolvedValueOnce([{ Name: 'Contacts_Backup', Table_Name: 'Contacts' }]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getTableMetadata('Contacts');

      expect(result).toBeNull();
    });

    it('matches case-sensitively', async () => {
      mockGetTables.mockResolvedValueOnce([{ Name: 'Contacts', Columns: [] }]);

      const service = await FieldManagementService.getInstance();
      const result = await service.getTableMetadata('contacts');

      expect(result).toBeNull();
    });
  });

  describe('updatePageFieldOrder', () => {
    const makeField = (i: number) => ({
      Page_ID: 292,
      Field_Name: `Field_${i}`,
      Group_Name: 'Basic',
      View_Order: i,
      Required: false,
      Hidden: false,
      Default_Value: null,
      Filter_Clause: null,
      Depends_On_Field: null,
      Field_Label: null,
      Writing_Assistant_Enabled: false,
    });

    it('should batch 10 fields as 2 batches of 5 (10 total calls)', async () => {
      mockExecuteProcedureWithBody.mockResolvedValue(undefined);
      const fields = Array.from({ length: 10 }, (_, i) => makeField(i + 1));

      const service = await FieldManagementService.getInstance();
      await service.updatePageFieldOrder(fields);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledTimes(10);
    });

    it('should map each field to correctly-named @ParamName keys', async () => {
      mockExecuteProcedureWithBody.mockResolvedValue(undefined);
      const field = {
        Page_ID: 292,
        Field_Name: 'First_Name',
        Group_Name: 'Basic',
        View_Order: 5,
        Required: true,
        Hidden: false,
        Default_Value: 'default',
        Filter_Clause: 'Filter',
        Depends_On_Field: 'Depends',
        Field_Label: 'Label',
        Writing_Assistant_Enabled: true,
      };

      const service = await FieldManagementService.getInstance();
      await service.updatePageFieldOrder([field]);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith(
        'api_MPNextTools_UpdatePageFieldOrder',
        {
          '@PageID': 292,
          '@FieldName': 'First_Name',
          '@GroupName': 'Basic',
          '@ViewOrder': 5,
          '@Required': true,
          '@Hidden': false,
          '@DefaultValue': 'default',
          '@FilterClause': 'Filter',
          '@DependsOnField': 'Depends',
          '@FieldLabel': 'Label',
          '@WritingAssistantEnabled': true,
        },
        { $userId: 42 }
      );
    });

    it('takes $userId from the authorization gate, not from the caller', async () => {
      mockExecuteProcedureWithBody.mockResolvedValue(undefined);
      const field = makeField(1);

      const service = await FieldManagementService.getInstance();
      await service.updatePageFieldOrder([field]);

      expect(mockRequireSecurityRole).toHaveBeenCalledWith({
        table: 'dp_Page_Fields',
        operation: 'update',
      });

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith(
        'api_MPNextTools_UpdatePageFieldOrder',
        expect.any(Object),
        { $userId: 42 }
      );
    });

    it('should make no calls when given an empty array', async () => {
      const service = await FieldManagementService.getInstance();
      await service.updatePageFieldOrder([]);

      expect(mockExecuteProcedureWithBody).not.toHaveBeenCalled();
    });

    it('should work with fewer than CONCURRENCY fields (3 fields = 1 batch)', async () => {
      mockExecuteProcedureWithBody.mockResolvedValue(undefined);
      const fields = Array.from({ length: 3 }, (_, i) => makeField(i + 1));

      const service = await FieldManagementService.getInstance();
      await service.updatePageFieldOrder(fields);

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledTimes(3);
    });
  });
});
