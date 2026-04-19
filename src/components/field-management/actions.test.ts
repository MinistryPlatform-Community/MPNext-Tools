import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetSession,
  mockGetPages,
  mockGetPageFields,
  mockGetTableMetadata,
  mockUpdatePageFieldOrder,
  mockGetInstance,
  mockGetUserIdByGuid,
  mockUserGetInstance,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetPages: vi.fn(),
  mockGetPageFields: vi.fn(),
  mockGetTableMetadata: vi.fn(),
  mockUpdatePageFieldOrder: vi.fn(),
  mockGetInstance: vi.fn(),
  mockGetUserIdByGuid: vi.fn(),
  mockUserGetInstance: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/services/fieldManagementService', () => ({
  FieldManagementService: {
    getInstance: mockGetInstance,
  },
}));

vi.mock('@/services/userService', () => ({
  UserService: { getInstance: mockUserGetInstance },
}));

import { fetchPages, fetchPageFieldData, savePageFieldOrder } from './actions';

const authedSession = {
  user: { id: 'internal-id', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
};

describe('field-management actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInstance.mockResolvedValue({
      getPages: mockGetPages,
      getPageFields: mockGetPageFields,
      getTableMetadata: mockGetTableMetadata,
      updatePageFieldOrder: mockUpdatePageFieldOrder,
    });
    mockUserGetInstance.mockResolvedValue({
      getUserIdByGuid: mockGetUserIdByGuid,
    });
    mockGetUserIdByGuid.mockResolvedValue(42);
  });

  describe('fetchPages', () => {
    it('should throw Unauthorized when session is null', async () => {
      mockGetSession.mockResolvedValueOnce(null);

      await expect(fetchPages()).rejects.toThrow('Unauthorized');
    });

    it('should throw Unauthorized when session has no user.id', async () => {
      mockGetSession.mockResolvedValueOnce({ user: {} });

      await expect(fetchPages()).rejects.toThrow('Unauthorized');
    });

    it('should return pages when authorized', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      const pages = [
        { Page_ID: 292, Display_Name: 'Contacts', Table_Name: 'Contacts' },
      ];
      mockGetPages.mockResolvedValueOnce(pages);

      const result = await fetchPages();

      expect(result).toEqual(pages);
      expect(mockGetPages).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchPageFieldData', () => {
    it('should throw Unauthorized when no session', async () => {
      mockGetSession.mockResolvedValueOnce(null);

      await expect(fetchPageFieldData(292, 'Contacts')).rejects.toThrow('Unauthorized');
    });

    it('should tag fields with isSeparator:false when tableMetadata is null', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
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
      mockGetPageFields.mockResolvedValueOnce(fields);
      mockGetTableMetadata.mockResolvedValueOnce(null);

      const result = await fetchPageFieldData(292, 'Contacts');

      expect(result.tableMetadata).toBeNull();
      expect(result.fields).toEqual([{ ...fields[0], isSeparator: false }]);
    });

    it('should merge unmapped columns from tableMetadata.Columns (skipping IsPrimaryKey)', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      mockGetPageFields.mockResolvedValueOnce([
        {
          Page_Field_ID: 1,
          Page_ID: 5,
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
      ]);
      mockGetTableMetadata.mockResolvedValueOnce({
        Table_Name: 'Contacts',
        Columns: [
          { Name: 'Contact_ID', IsPrimaryKey: true, IsRequired: true },
          { Name: 'First_Name', IsPrimaryKey: false, IsRequired: true },
          { Name: 'Last_Name', IsPrimaryKey: false, IsRequired: false },
        ],
      });

      const result = await fetchPageFieldData(5, 'Contacts');

      expect(result.fields).toHaveLength(3);
      expect(result.fields[0].Field_Name).toBe('Contact_ID');
      expect(result.fields[1].Field_Name).toBe('First_Name');
      expect(result.fields[2].Field_Name).toBe('Last_Name');
    });

    it('should assign negative IDs starting at -1 and decrementing for new fields', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      mockGetPageFields.mockResolvedValueOnce([]);
      mockGetTableMetadata.mockResolvedValueOnce({
        Table_Name: 'Contacts',
        Columns: [
          { Name: 'First_Name', IsPrimaryKey: false, IsRequired: true },
          { Name: 'Last_Name', IsPrimaryKey: false, IsRequired: false },
        ],
      });

      const result = await fetchPageFieldData(5, 'Contacts');

      expect(result.fields[0].Page_Field_ID).toBe(-1);
      expect(result.fields[1].Page_Field_ID).toBe(-2);
    });

    it('should assign sequential View_Order starting at maxViewOrder + 1', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      mockGetPageFields.mockResolvedValueOnce([
        {
          Page_Field_ID: 1,
          Page_ID: 5,
          Field_Name: 'Existing_Field',
          Group_Name: null,
          View_Order: 20,
          Required: false,
          Hidden: false,
          Default_Value: null,
          Filter_Clause: null,
          Depends_On_Field: null,
          Field_Label: null,
          Writing_Assistant_Enabled: false,
        },
      ]);
      mockGetTableMetadata.mockResolvedValueOnce({
        Table_Name: 'Contacts',
        Columns: [
          { Name: 'First_Name', IsPrimaryKey: false, IsRequired: true },
          { Name: 'Last_Name', IsPrimaryKey: false, IsRequired: false },
        ],
      });

      const result = await fetchPageFieldData(5, 'Contacts');

      expect(result.fields[1].View_Order).toBe(21);
      expect(result.fields[2].View_Order).toBe(22);
    });

    it('should skip primary key columns', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      mockGetPageFields.mockResolvedValueOnce([]);
      mockGetTableMetadata.mockResolvedValueOnce({
        Table_Name: 'Contacts',
        Columns: [
          { Name: 'Contact_ID', IsPrimaryKey: true, IsRequired: true },
          { Name: 'First_Name', IsPrimaryKey: false, IsRequired: true },
        ],
      });

      const result = await fetchPageFieldData(5, 'Contacts');

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].Field_Name).toBe('First_Name');
    });

    it('should tag existing page field as isSeparator when matching column DataType is Separator', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      mockGetPageFields.mockResolvedValueOnce([
        {
          Page_Field_ID: 1,
          Page_ID: 5,
          Field_Name: 'General_Section',
          Group_Name: 'Basic',
          View_Order: 5,
          Required: false,
          Hidden: false,
          Default_Value: null,
          Filter_Clause: null,
          Depends_On_Field: null,
          Field_Label: 'General',
          Writing_Assistant_Enabled: false,
        },
        {
          Page_Field_ID: 2,
          Page_ID: 5,
          Field_Name: 'First_Name',
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
      ]);
      mockGetTableMetadata.mockResolvedValueOnce({
        Table_Name: 'Contacts',
        Columns: [
          { Name: 'General_Section', DataType: 'Separator', IsPrimaryKey: false, IsRequired: false },
          { Name: 'First_Name', DataType: 'String', IsPrimaryKey: false, IsRequired: true },
        ],
      });

      const result = await fetchPageFieldData(5, 'Contacts');

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0].Field_Name).toBe('General_Section');
      expect(result.fields[0].isSeparator).toBe(true);
      expect(result.fields[1].Field_Name).toBe('First_Name');
      expect(result.fields[1].isSeparator).toBe(false);
    });

    it('should auto-add Separator columns missing from dp_Page_Fields with isSeparator:true', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      mockGetPageFields.mockResolvedValueOnce([
        {
          Page_Field_ID: 1,
          Page_ID: 5,
          Field_Name: 'First_Name',
          Group_Name: null,
          View_Order: 1,
          Required: false,
          Hidden: false,
          Default_Value: null,
          Filter_Clause: null,
          Depends_On_Field: null,
          Field_Label: null,
          Writing_Assistant_Enabled: false,
        },
      ]);
      mockGetTableMetadata.mockResolvedValueOnce({
        Table_Name: 'Contacts',
        Columns: [
          { Name: 'First_Name', DataType: 'String', IsPrimaryKey: false, IsRequired: false },
          { Name: 'Address_Section', DataType: 'Separator', IsPrimaryKey: false, IsRequired: false },
          { Name: 'City', DataType: 'String', IsPrimaryKey: false, IsRequired: false },
        ],
      });

      const result = await fetchPageFieldData(5, 'Contacts');

      expect(result.fields).toHaveLength(3);

      const sep = result.fields.find((f) => f.Field_Name === 'Address_Section');
      expect(sep).toBeDefined();
      expect(sep!.isSeparator).toBe(true);
      expect(sep!.Required).toBe(false);
      expect(sep!.Page_Field_ID).toBeLessThan(0);

      const city = result.fields.find((f) => f.Field_Name === 'City');
      expect(city!.isSeparator).toBe(false);
    });

    it('should force Separator auto-add to Required:false even when IsRequired is true in metadata', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      mockGetPageFields.mockResolvedValueOnce([]);
      mockGetTableMetadata.mockResolvedValueOnce({
        Table_Name: 'Contacts',
        Columns: [
          { Name: 'Weird_Separator', DataType: 'Separator', IsPrimaryKey: false, IsRequired: true },
        ],
      });

      const result = await fetchPageFieldData(5, 'Contacts');

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].isSeparator).toBe(true);
      expect(result.fields[0].Required).toBe(false);
    });

    it('should leave page fields not in metadata tagged isSeparator:false', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      mockGetPageFields.mockResolvedValueOnce([
        {
          Page_Field_ID: 1,
          Page_ID: 5,
          Field_Name: 'Orphan_Field',
          Group_Name: null,
          View_Order: 1,
          Required: false,
          Hidden: false,
          Default_Value: null,
          Filter_Clause: null,
          Depends_On_Field: null,
          Field_Label: null,
          Writing_Assistant_Enabled: false,
        },
      ]);
      mockGetTableMetadata.mockResolvedValueOnce({
        Table_Name: 'Contacts',
        Columns: [],
      });

      const result = await fetchPageFieldData(5, 'Contacts');

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].isSeparator).toBe(false);
    });

    it('should skip columns with names already in fields', async () => {
      mockGetSession.mockResolvedValueOnce({ user: { id: 'internal-id' } });
      mockGetPageFields.mockResolvedValueOnce([
        {
          Page_Field_ID: 1,
          Page_ID: 5,
          Field_Name: 'First_Name',
          Group_Name: null,
          View_Order: 1,
          Required: false,
          Hidden: false,
          Default_Value: null,
          Filter_Clause: null,
          Depends_On_Field: null,
          Field_Label: null,
          Writing_Assistant_Enabled: false,
        },
      ]);
      mockGetTableMetadata.mockResolvedValueOnce({
        Table_Name: 'Contacts',
        Columns: [
          { Name: 'First_Name', IsPrimaryKey: false, IsRequired: true },
          { Name: 'Last_Name', IsPrimaryKey: false, IsRequired: false },
        ],
      });

      const result = await fetchPageFieldData(5, 'Contacts');

      expect(result.fields).toHaveLength(2);
      expect(result.fields.map((f) => f.Field_Name)).toEqual(['First_Name', 'Last_Name']);
    });
  });

  describe('savePageFieldOrder', () => {
    const samplePayload = [
      {
        Page_ID: 292,
        Field_Name: 'First_Name',
        Group_Name: 'Basic',
        View_Order: 1,
        Required: true,
        Hidden: false,
        Default_Value: null,
        Filter_Clause: null,
        Depends_On_Field: null,
        Field_Label: null,
        Writing_Assistant_Enabled: false,
      },
    ];

    it('should return success:true when service succeeds and forward userId', async () => {
      mockGetSession.mockResolvedValueOnce(authedSession);
      mockUpdatePageFieldOrder.mockResolvedValueOnce(undefined);

      const result = await savePageFieldOrder(samplePayload);

      expect(result).toEqual({ success: true });
      expect(mockUpdatePageFieldOrder).toHaveBeenCalledWith(samplePayload, 42);
    });

    it('should return success:false with error message when service throws an Error', async () => {
      mockGetSession.mockResolvedValueOnce(authedSession);
      mockUpdatePageFieldOrder.mockRejectedValueOnce(new Error('Database error'));

      const result = await savePageFieldOrder(samplePayload);

      expect(result).toEqual({ success: false, error: 'Database error' });
    });

    it('should return generic error when a non-Error is thrown', async () => {
      mockGetSession.mockResolvedValueOnce(authedSession);
      mockUpdatePageFieldOrder.mockRejectedValueOnce('string error');

      const result = await savePageFieldOrder(samplePayload);

      expect(result).toEqual({ success: false, error: 'Failed to save field order' });
    });

    it('should return success:false with Unauthorized error when no session', async () => {
      mockGetSession.mockResolvedValueOnce(null);

      const result = await savePageFieldOrder(samplePayload);

      expect(result).toEqual({ success: false, error: 'Unauthorized' });
      expect(mockUpdatePageFieldOrder).not.toHaveBeenCalled();
    });
  });
});
