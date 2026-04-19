import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DomainService } from '@/lib/providers/ministry-platform/services/domain.service';
import type { MinistryPlatformClient } from '@/lib/providers/ministry-platform/client';
import type { HttpClient } from '@/lib/providers/ministry-platform/utils/http-client';
import type { DomainInfo } from '@/lib/providers/ministry-platform/types';

describe('DomainService', () => {
  let service: DomainService;
  let mockClient: MinistryPlatformClient;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      buildUrl: vi.fn(),
      postFormData: vi.fn(),
      putFormData: vi.fn(),
    } as unknown as HttpClient;

    mockClient = {
      ensureValidToken: vi.fn().mockResolvedValue(undefined),
      getHttpClient: vi.fn().mockReturnValue(mockHttpClient),
    } as unknown as MinistryPlatformClient;

    service = new DomainService(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDomainInfo', () => {
    it('should return domain information', async () => {
      const mockDomain: DomainInfo = {
        DisplayName: 'Test',
        TimeZoneName: 'America/New_York',
        CultureName: 'en-US',
        IsSimpleSignOnEnabled: false,
        IsUserTimeZoneEnabled: false,
        IsSmsMfaEnabled: false,
      };
      (mockHttpClient.get as any).mockResolvedValueOnce(mockDomain);

      const result = await service.getDomainInfo();

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/domain');
      expect(result).toEqual(mockDomain);
    });

    it('should propagate errors', async () => {
      (mockHttpClient.get as any).mockRejectedValueOnce(new Error('500 Internal Server Error'));

      await expect(service.getDomainInfo()).rejects.toThrow('500 Internal Server Error');
    });
  });

  describe('getGlobalFilters', () => {
    it('should call get without params', async () => {
      (mockHttpClient.get as any).mockResolvedValueOnce([]);

      const result = await service.getGlobalFilters();

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/domain/filters', undefined);
      expect(result).toEqual([]);
    });

    it('should pass query params', async () => {
      const filters = [{ Key: 1, Value: 'Global' }];
      (mockHttpClient.get as any).mockResolvedValueOnce(filters);

      const result = await service.getGlobalFilters({ $userId: 123 } as any);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/domain/filters', { $userId: 123 });
      expect(result).toEqual(filters);
    });

    it('should propagate errors', async () => {
      (mockHttpClient.get as any).mockRejectedValueOnce(new Error('403 Forbidden'));

      await expect(service.getGlobalFilters()).rejects.toThrow('403 Forbidden');
    });
  });

  describe('Token Validation', () => {
    it('should ensure valid token before each operation', async () => {
      (mockHttpClient.get as any).mockResolvedValue([]);

      await service.getDomainInfo();
      await service.getGlobalFilters();

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(2);
    });
  });
});
