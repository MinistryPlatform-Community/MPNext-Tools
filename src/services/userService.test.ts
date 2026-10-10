import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from '@/services/userService';

const mockGetTableRecords = vi.fn();

vi.mock('@/lib/providers/ministry-platform', () => {
  return {
    MPHelper: class {
      getTableRecords = mockGetTableRecords;
    },
  };
});

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance between tests
     
    (UserService as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', async () => {
      const instance1 = await UserService.getInstance();
      const instance2 = await UserService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getUserProfile', () => {
    const row = {
      First_Name: 'John',
      Nickname: 'Johnny',
      Last_Name: 'Doe',
      Email_Address: 'john@example.com',
    };

    it('fetches only the display fields, in a single query', async () => {
      mockGetTableRecords.mockResolvedValueOnce([row]);

      const service = await UserService.getInstance();
      const result = await service.getUserProfile('550e8400-e29b-41d4-a716-446655440000');

      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
      expect(mockGetTableRecords).toHaveBeenCalledWith({
        table: 'dp_Users',
        filter: "User_GUID = '550e8400-e29b-41d4-a716-446655440000'",
        select: 'Contact_ID_TABLE.First_Name,Contact_ID_TABLE.Nickname,Contact_ID_TABLE.Last_Name,Contact_ID_TABLE.Email_Address',
        top: 1,
      });
      expect(result).toEqual(row);
    });

    it('never passes through fields beyond the profile DTO', async () => {
      mockGetTableRecords.mockResolvedValueOnce([
        { ...row, User_ID: 1, Mobile_Phone: '555-1234', roles: ['Administrators'] },
      ]);

      const service = await UserService.getInstance();
      const result = await service.getUserProfile('550e8400-e29b-41d4-a716-446655440000');

      expect(Object.keys(result!).sort()).toEqual(['Email_Address', 'First_Name', 'Last_Name', 'Nickname']);
    });

    it('normalizes a missing email to null', async () => {
      const { Email_Address: _omit, ...noEmail } = row;
      mockGetTableRecords.mockResolvedValueOnce([noEmail]);

      const service = await UserService.getInstance();
      const result = await service.getUserProfile('550e8400-e29b-41d4-a716-446655440000');

      expect(result!.Email_Address).toBeNull();
    });

    it('should return undefined when user not found', async () => {
      mockGetTableRecords.mockResolvedValueOnce([]);

      const service = await UserService.getInstance();
      const result = await service.getUserProfile('a0000000-0000-0000-0000-000000000000');

      expect(result).toBeUndefined();
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
    });

    it('rejects a malformed GUID before querying', async () => {
      const service = await UserService.getInstance();
      await expect(service.getUserProfile("x' OR 1=1 --")).rejects.toThrow();
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });

    it('should propagate errors from MPHelper', async () => {
      mockGetTableRecords.mockRejectedValueOnce(new Error('API error'));

      const service = await UserService.getInstance();
      await expect(service.getUserProfile('b0000000-0000-0000-0000-000000000000')).rejects.toThrow('API error');
    });
  });
});
