import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetadataService } from '@/lib/providers/ministry-platform/services/metadata.service';
import type { MinistryPlatformClient } from '@/lib/providers/ministry-platform/client';
import type { HttpClient } from '@/lib/providers/ministry-platform/utils/http-client';

/**
 * These tests deliberately drive failure paths, and the code under test logs
 * them on purpose. Silence the channel so a real, unexpected error still
 * stands out in the runner output instead of drowning in expected noise.
 * `mockImplementation` keeps the spy recording, so assertions on what was
 * logged still work.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('MetadataService', () => {
  let service: MetadataService;
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

    service = new MetadataService(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('refreshMetadata', () => {
    it('should call /refreshMetadata', async () => {
      (mockHttpClient.get as any).mockResolvedValueOnce(undefined);

      await service.refreshMetadata();

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/refreshMetadata');
    });

    it('should propagate errors', async () => {
      (mockHttpClient.get as any).mockRejectedValueOnce(new Error('500 Internal Server Error'));

      await expect(service.refreshMetadata()).rejects.toThrow('500 Internal Server Error');
    });
  });

  describe('getTables', () => {
    it('should call get without search param', async () => {
      const tables = [{ Name: 'Contacts' }];
      (mockHttpClient.get as any).mockResolvedValueOnce(tables);

      const result = await service.getTables();

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/tables', undefined);
      expect(result).toEqual(tables);
    });

    it('should pass search param', async () => {
      const tables = [{ Name: 'Contacts' }];
      (mockHttpClient.get as any).mockResolvedValueOnce(tables);

      const result = await service.getTables('contact');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tables', { $search: 'contact' });
      expect(result).toEqual(tables);
    });

    it('should treat empty string as no search', async () => {
      (mockHttpClient.get as any).mockResolvedValueOnce([]);

      await service.getTables('');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tables', undefined);
    });

    it('should propagate errors', async () => {
      (mockHttpClient.get as any).mockRejectedValueOnce(new Error('403 Forbidden'));

      await expect(service.getTables()).rejects.toThrow('403 Forbidden');
    });
  });

  describe('Token Validation', () => {
    it('should ensure valid token before each operation', async () => {
      (mockHttpClient.get as any).mockResolvedValue([]);

      await service.refreshMetadata();
      await service.getTables();
      await service.getTables('x');

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(3);
    });
  });
});
