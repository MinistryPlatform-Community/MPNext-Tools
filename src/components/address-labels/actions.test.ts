import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSession = vi.hoisted(() => vi.fn());
const mockGetSelectionRecordIds = vi.hoisted(() => vi.fn());
const mockGetAddressesForContacts = vi.hoisted(() => vi.fn());
const mockGetAddressForContact = vi.hoisted(() => vi.fn());
const mockToBlob = vi.hoisted(() => vi.fn());
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

vi.mock('@/services/addressLabelService', () => ({
  AddressLabelService: {
    getInstance: vi.fn().mockResolvedValue({
      getAddressesForContacts: mockGetAddressesForContacts,
      getAddressForContact: mockGetAddressForContact,
    }),
  },
}));

vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn().mockReturnValue({ toBlob: mockToBlob }),
  Document: 'Document',
  Page: 'Page',
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

vi.mock('./label-document', () => ({
  LabelDocument: 'LabelDocument',
}));

import { fetchAddressLabels, generateLabelPdf } from './actions';
import type { LabelConfig, LabelData } from '@/lib/dto';
import type { ToolParams } from '@/lib/tool-params';

describe('fetchAddressLabels', () => {
  const defaultConfig: LabelConfig = {
    stockId: '5160',
    addressMode: 'household',
    startPosition: 1,
    includeMissingBarcodes: true,
  };

  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1', userGuid: 'test-guid' } });
    // getMPUserId lookup — return a User_ID for the test guid
    mockMPGetTableRecords.mockResolvedValue([{ User_ID: 42 }]);
    mockGetSelectionRecordIds.mockReset();
    mockGetAddressesForContacts.mockReset();
    mockGetAddressForContact.mockReset();
  });

  it('should throw if not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    const params: ToolParams = { recordID: 1 };
    await expect(fetchAddressLabels(params, defaultConfig)).rejects.toThrow('Unauthorized');
  });

  it('should fetch single contact for recordID mode', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 1, Display_Name: 'John Smith', Household_ID: 100,
      Household_Name: 'Smith Family', Bulk_Mail_Opt_Out: false,
      Address_Line_1: '123 Main St', Address_Line_2: null,
      City: 'Springfield', 'State/Region': 'IL',
      Postal_Code: '62701', Bar_Code: '01234567094987654321',
    });

    const params: ToolParams = { recordID: 1 };
    const result = await fetchAddressLabels(params, defaultConfig);

    expect(result.printable).toHaveLength(1);
    expect(result.printable[0].name).toBe('Smith Family');
    expect(result.skipped).toHaveLength(0);
  });

  it('should skip contacts with no address', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 2, Display_Name: 'No Address Person', Household_ID: 200,
      Household_Name: 'No Address Family', Bulk_Mail_Opt_Out: false,
      Address_Line_1: null, City: null, 'State/Region': null,
      Postal_Code: null, Bar_Code: null,
    });

    const params: ToolParams = { recordID: 2 };
    const result = await fetchAddressLabels(params, defaultConfig);

    expect(result.printable).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('no_address');
  });

  it('should skip contacts with missing postal code', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 4, Display_Name: 'No Zip Person', Household_ID: 400,
      Household_Name: 'No Zip Family', Bulk_Mail_Opt_Out: false,
      Address_Line_1: '456 Oak Ave', City: 'Portland', 'State/Region': 'OR',
      Postal_Code: null, Bar_Code: null,
    });

    const params: ToolParams = { recordID: 4 };
    const result = await fetchAddressLabels(params, defaultConfig);

    expect(result.printable).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('no_postal_code');
  });

  it('should skip contacts that opted out of bulk mail', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 3, Display_Name: 'Opted Out', Household_ID: 300,
      Household_Name: 'Opted Out Family', Bulk_Mail_Opt_Out: true,
      Address_Line_1: '789 Pine Rd', City: 'Austin', 'State/Region': 'TX',
      Postal_Code: '73301', Bar_Code: '01234567094987654321',
    });

    const params: ToolParams = { recordID: 3 };
    const result = await fetchAddressLabels(params, defaultConfig);

    expect(result.printable).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('opted_out');
  });

  it('should deduplicate by household in household mode', async () => {
    mockGetSelectionRecordIds.mockResolvedValue([1, 2]);
    mockGetAddressesForContacts.mockResolvedValue([
      {
        Contact_ID: 1, Display_Name: 'John Smith', Household_ID: 100,
        Household_Name: 'Smith Family', Bulk_Mail_Opt_Out: false,
        Address_Line_1: '123 Main', City: 'Test', 'State/Region': 'IL',
        Postal_Code: '62701', Bar_Code: '01234567094987654321',
      },
      {
        Contact_ID: 2, Display_Name: 'Jane Smith', Household_ID: 100,
        Household_Name: 'Smith Family', Bulk_Mail_Opt_Out: false,
        Address_Line_1: '123 Main', City: 'Test', 'State/Region': 'IL',
        Postal_Code: '62701', Bar_Code: '01234567094987654321',
      },
    ]);

    const params: ToolParams = { pageID: 292, s: 1, sc: 2 };
    const result = await fetchAddressLabels(params, defaultConfig);

    expect(result.printable).toHaveLength(1);
    expect(result.printable[0].name).toBe('Smith Family');
  });

  it('should use Display_Name in individual mode', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 1, Display_Name: 'John Smith', Household_ID: 100,
      Household_Name: 'Smith Family', Bulk_Mail_Opt_Out: false,
      Address_Line_1: '123 Main', City: 'Test', 'State/Region': 'IL',
      Postal_Code: '62701', Bar_Code: '01234567094987654321',
    });

    const params: ToolParams = { recordID: 1 };
    const config: LabelConfig = { ...defaultConfig, addressMode: 'individual' };
    const result = await fetchAddressLabels(params, config);

    expect(result.printable[0].name).toBe('John Smith');
  });

  it('should exclude missing barcodes when toggle is off', async () => {
    mockGetAddressForContact.mockResolvedValue({
      Contact_ID: 1, Display_Name: 'John Smith', Household_ID: 100,
      Household_Name: 'Smith Family', Bulk_Mail_Opt_Out: false,
      Address_Line_1: '123 Main', City: 'Test', 'State/Region': 'IL',
      Postal_Code: '62701', Bar_Code: null,
    });

    const params: ToolParams = { recordID: 1 };
    const config: LabelConfig = { ...defaultConfig, includeMissingBarcodes: false };
    const result = await fetchAddressLabels(params, config);

    expect(result.printable).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('no_barcode');
  });
});

describe('generateLabelPdf', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ user: { id: 'user-1' } });
    mockToBlob.mockReset();
  });

  it('should generate PDF and return base64', async () => {
    const fakeContent = 'fake-pdf-content';
    const fakeArrayBuffer = new TextEncoder().encode(fakeContent).buffer;
    const fakeBlob = new Blob([fakeArrayBuffer]);
    mockToBlob.mockResolvedValue(fakeBlob);

    const labels: LabelData[] = [{
      name: 'Test', addressLine1: '123 Main',
      city: 'Test', state: 'TX', postalCode: '75001',
    }];

    const result = await generateLabelPdf(labels, '5160', 1);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(Buffer.from(fakeArrayBuffer).toString('base64'));
    }
  });

  it('should return error for unknown stock', async () => {
    const labels: LabelData[] = [{
      name: 'Test', addressLine1: '123 Main',
      city: 'Test', state: 'TX', postalCode: '75001',
    }];
    const result = await generateLabelPdf(labels, '9999', 1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unknown label stock');
    }
  });

  it('should return error for empty labels', async () => {
    const result = await generateLabelPdf([], '5160', 1);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No labels to print');
    }
  });
});
