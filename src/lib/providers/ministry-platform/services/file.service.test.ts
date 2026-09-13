import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileService } from '@/lib/providers/ministry-platform/services/file.service';
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

describe('FileService', () => {
  let service: FileService;
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

    service = new FileService(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getFilesByRecord', () => {
    it('should pass empty queryParams when defaultOnly is undefined', async () => {
      (mockHttpClient.get as any).mockResolvedValueOnce([]);

      await service.getFilesByRecord('Contacts', 42);

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/files/Contacts/42', {});
    });

    it('should pass $default=true when defaultOnly=true', async () => {
      (mockHttpClient.get as any).mockResolvedValueOnce([]);

      await service.getFilesByRecord('Contacts', 42, true);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/files/Contacts/42', { $default: 'true' });
    });

    it('should pass $default=false when defaultOnly=false', async () => {
      (mockHttpClient.get as any).mockResolvedValueOnce([]);

      await service.getFilesByRecord('Contacts', 42, false);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/files/Contacts/42', { $default: 'false' });
    });

    it('should propagate errors', async () => {
      (mockHttpClient.get as any).mockRejectedValueOnce(new Error('404 Not Found'));

      await expect(service.getFilesByRecord('Contacts', 1)).rejects.toThrow('404 Not Found');
    });
  });

  describe('uploadFiles', () => {
    it('should upload single file with no params', async () => {
      (mockHttpClient.postFormData as any).mockResolvedValueOnce([{ FileId: 1 }]);

      const file = new File(['a'], 'one.png', { type: 'image/png' });
      await service.uploadFiles('Contacts', 10, [file]);

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      const call = (mockHttpClient.postFormData as any).mock.calls[0];
      expect(call[0]).toBe('/files/Contacts/10');
      const formData = call[1] as FormData;
      expect((formData.get('file-0') as File).name).toBe('one.png');
      expect(call[2]).toEqual({});
    });

    it('should upload multiple files', async () => {
      (mockHttpClient.postFormData as any).mockResolvedValueOnce([]);

      const f1 = new File(['a'], 'a.png', { type: 'image/png' });
      const f2 = new File(['b'], 'b.png', { type: 'image/png' });
      await service.uploadFiles('Contacts', 10, [f1, f2]);

      const formData = (mockHttpClient.postFormData as any).mock.calls[0][1] as FormData;
      expect((formData.get('file-0') as File).name).toBe('a.png');
      expect((formData.get('file-1') as File).name).toBe('b.png');
    });

    it('should populate both form data and query params', async () => {
      (mockHttpClient.postFormData as any).mockResolvedValueOnce([]);

      const file = new File(['a'], 'doc.pdf', { type: 'application/pdf' });
      await service.uploadFiles('Contacts', 10, [file], {
        description: 'desc',
        isDefaultImage: true,
        longestDimension: 800,
        userId: 123,
      });

      const call = (mockHttpClient.postFormData as any).mock.calls[0];
      const formData = call[1] as FormData;
      expect(formData.get('description')).toBe('desc');
      expect(formData.get('isDefaultImage')).toBe('true');
      expect(formData.get('longestDimension')).toBe('800');

      expect(call[2]).toEqual({
        $description: 'desc',
        $default: 'true',
        $longestDimension: '800',
        $userId: '123',
      });
    });

    it('should include isDefaultImage=false in form data and query', async () => {
      (mockHttpClient.postFormData as any).mockResolvedValueOnce([]);

      const file = new File(['a'], 'doc.pdf', { type: 'application/pdf' });
      await service.uploadFiles('Contacts', 10, [file], { isDefaultImage: false });

      const call = (mockHttpClient.postFormData as any).mock.calls[0];
      const formData = call[1] as FormData;
      expect(formData.get('isDefaultImage')).toBe('false');
      expect(call[2]).toEqual({ $default: 'false' });
    });

    it('should propagate errors', async () => {
      (mockHttpClient.postFormData as any).mockRejectedValueOnce(new Error('413 Payload Too Large'));

      const file = new File(['a'], 'x.pdf', { type: 'application/pdf' });
      await expect(service.uploadFiles('Contacts', 1, [file])).rejects.toThrow(
        '413 Payload Too Large'
      );
    });
  });

  describe('updateFile', () => {
    it('should call putFormData with empty FormData and queryParams when no args', async () => {
      (mockHttpClient.putFormData as any).mockResolvedValueOnce({ FileId: 1 });

      await service.updateFile(5);

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      const call = (mockHttpClient.putFormData as any).mock.calls[0];
      expect(call[0]).toBe('/files/5');
      const formData = call[1] as FormData;
      expect(formData.get('file')).toBeNull();
      expect(call[2]).toEqual({});
    });

    it('should include file when provided', async () => {
      (mockHttpClient.putFormData as any).mockResolvedValueOnce({ FileId: 5 });

      const file = new File(['x'], 'updated.png', { type: 'image/png' });
      await service.updateFile(5, file);

      const call = (mockHttpClient.putFormData as any).mock.calls[0];
      const formData = call[1] as FormData;
      expect((formData.get('file') as File).name).toBe('updated.png');
      expect(call[2]).toEqual({});
    });

    it('should populate form data and query params with all options', async () => {
      (mockHttpClient.putFormData as any).mockResolvedValueOnce({ FileId: 5 });

      const file = new File(['x'], 'updated.png', { type: 'image/png' });
      await service.updateFile(5, file, {
        fileName: 'new.png',
        description: 'updated',
        isDefaultImage: true,
        longestDimension: 1024,
        userId: 99,
      });

      const call = (mockHttpClient.putFormData as any).mock.calls[0];
      const formData = call[1] as FormData;
      expect(formData.get('fileName')).toBe('new.png');
      expect(formData.get('description')).toBe('updated');
      expect(formData.get('isDefaultImage')).toBe('true');
      expect(formData.get('longestDimension')).toBe('1024');

      expect(call[2]).toEqual({
        $fileName: 'new.png',
        $description: 'updated',
        $default: 'true',
        $longestDimension: '1024',
        $userId: '99',
      });
    });

    it('should propagate errors', async () => {
      (mockHttpClient.putFormData as any).mockRejectedValueOnce(new Error('500 Internal Server Error'));

      await expect(service.updateFile(5)).rejects.toThrow('500 Internal Server Error');
    });
  });

  describe('deleteFile', () => {
    it('should pass empty query params when no userId', async () => {
      (mockHttpClient.delete as any).mockResolvedValueOnce(undefined);

      await service.deleteFile(7);

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.delete).toHaveBeenCalledWith('/files/7', {});
    });

    it('should include $userId when provided', async () => {
      (mockHttpClient.delete as any).mockResolvedValueOnce(undefined);

      await service.deleteFile(7, 123);

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/files/7', { $userId: '123' });
    });

    it('should propagate errors', async () => {
      (mockHttpClient.delete as any).mockRejectedValueOnce(new Error('403 Forbidden'));

      await expect(service.deleteFile(7)).rejects.toThrow('403 Forbidden');
    });
  });

  describe('getFileContentByUniqueId', () => {
    it('should fetch blob without thumbnail', async () => {
      (mockHttpClient.buildUrl as any).mockReturnValue('https://example.com/files/abc');
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => blob,
      }) as any;

      const result = await service.getFileContentByUniqueId('abc');

      expect(mockHttpClient.buildUrl).toHaveBeenCalledWith('/files/abc', {});
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/files/abc', { method: 'GET' });
      expect(result).toBe(blob);
    });

    it('should pass $thumbnail=true', async () => {
      (mockHttpClient.buildUrl as any).mockReturnValue('https://example.com/files/abc');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(),
      }) as any;

      await service.getFileContentByUniqueId('abc', true);

      expect(mockHttpClient.buildUrl).toHaveBeenCalledWith('/files/abc', { $thumbnail: 'true' });
    });

    it('should pass $thumbnail=false', async () => {
      (mockHttpClient.buildUrl as any).mockReturnValue('https://example.com/files/abc');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(),
      }) as any;

      await service.getFileContentByUniqueId('abc', false);

      expect(mockHttpClient.buildUrl).toHaveBeenCalledWith('/files/abc', { $thumbnail: 'false' });
    });

    it('should not call ensureValidToken', async () => {
      (mockHttpClient.buildUrl as any).mockReturnValue('https://example.com/files/abc');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(),
      }) as any;

      await service.getFileContentByUniqueId('abc');

      expect(mockClient.ensureValidToken).not.toHaveBeenCalled();
    });

    it('should throw when response.ok is false', async () => {
      (mockHttpClient.buildUrl as any).mockReturnValue('https://example.com/files/abc');
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }) as any;

      await expect(service.getFileContentByUniqueId('abc')).rejects.toThrow(
        'GET /files/abc failed: 404 Not Found'
      );
    });
  });

  describe('getFileMetadata', () => {
    it('should call get on /files/:id/metadata', async () => {
      const meta = { FileId: 1, FileName: 'doc.pdf' };
      (mockHttpClient.get as any).mockResolvedValueOnce(meta);

      const result = await service.getFileMetadata(1);

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/files/1/metadata');
      expect(result).toEqual(meta);
    });

    it('should propagate errors', async () => {
      (mockHttpClient.get as any).mockRejectedValueOnce(new Error('404 Not Found'));

      await expect(service.getFileMetadata(1)).rejects.toThrow('404 Not Found');
    });
  });

  describe('getFileMetadataByUniqueId', () => {
    it('should call get on /files/:uniqueId/metadata', async () => {
      const meta = { FileId: 1, FileName: 'doc.pdf' };
      (mockHttpClient.get as any).mockResolvedValueOnce(meta);

      const result = await service.getFileMetadataByUniqueId('abc-123');

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/files/abc-123/metadata');
      expect(result).toEqual(meta);
    });

    it('should propagate errors', async () => {
      (mockHttpClient.get as any).mockRejectedValueOnce(new Error('404 Not Found'));

      await expect(service.getFileMetadataByUniqueId('abc')).rejects.toThrow('404 Not Found');
    });
  });
});
