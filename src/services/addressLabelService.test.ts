import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MPHelper — use vi.hoisted() per project convention
const { mockGetTableRecords } = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
  },
}));

import { AddressLabelService } from './addressLabelService';

describe('AddressLabelService', () => {
  beforeEach(() => {
    // Reset singleton to prevent state leakage
    (AddressLabelService as any).instance = undefined;
    mockGetTableRecords.mockReset();
  });

  it('should be a singleton', async () => {
    const instance1 = await AddressLabelService.getInstance();
    const instance2 = await AddressLabelService.getInstance();
    expect(instance1).toBe(instance2);
  });

  describe('getAddressesForContacts', () => {
    it('should fetch contacts with household address joins', async () => {
      const mockRows = [
        {
          Contact_ID: 1,
          Display_Name: 'John Smith',
          Household_ID: 100,
          Household_Name: 'The Smith Family',
          Bulk_Mail_Opt_Out: false,
          Address_Line_1: '123 Main St',
          Address_Line_2: null,
          City: 'Springfield',
          'State/Region': 'IL',
          Postal_Code: '62701',
          Bar_Code: '0123456709498765432101234567891',
        },
      ];
      mockGetTableRecords.mockResolvedValue(mockRows);

      const service = await AddressLabelService.getInstance();
      const result = await service.getAddressesForContacts([1]);

      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'Contacts',
          filter: expect.stringContaining('Contact_ID IN (1)'),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].Contact_ID).toBe(1);
    });

    it('should batch large contact ID arrays', async () => {
      mockGetTableRecords.mockResolvedValue([]);

      const service = await AddressLabelService.getInstance();
      const ids = Array.from({ length: 250 }, (_, i) => i + 1);
      await service.getAddressesForContacts(ids);

      expect(mockGetTableRecords.mock.calls.length).toBeGreaterThan(1);
    });

    it('should return empty array for empty input', async () => {
      const service = await AddressLabelService.getInstance();
      const result = await service.getAddressesForContacts([]);
      expect(result).toEqual([]);
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });
  });

  describe('getAddressForContact', () => {
    it('should return single contact address', async () => {
      const mockRow = {
        Contact_ID: 42,
        Display_Name: 'Jane Doe',
        Household_ID: 200,
        Household_Name: 'Doe Household',
        Bulk_Mail_Opt_Out: false,
        Address_Line_1: '456 Oak Ave',
        City: 'Portland',
        'State/Region': 'OR',
        Postal_Code: '97201',
        Bar_Code: null,
      };
      mockGetTableRecords.mockResolvedValue([mockRow]);

      const service = await AddressLabelService.getInstance();
      const result = await service.getAddressForContact(42);

      expect(result).toBeDefined();
      expect(result!.Contact_ID).toBe(42);
    });

    it('should return null when contact not found', async () => {
      mockGetTableRecords.mockResolvedValue([]);

      const service = await AddressLabelService.getInstance();
      const result = await service.getAddressForContact(999);
      expect(result).toBeNull();
    });
  });
});
