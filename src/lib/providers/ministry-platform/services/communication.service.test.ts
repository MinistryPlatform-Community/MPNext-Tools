import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommunicationService } from '@/lib/providers/ministry-platform/services/communication.service';
import type { MinistryPlatformClient } from '@/lib/providers/ministry-platform/client';
import type { HttpClient } from '@/lib/providers/ministry-platform/utils/http-client';
import type { CommunicationInfo, MessageInfo } from '@/lib/providers/ministry-platform/types';

describe('CommunicationService', () => {
  let service: CommunicationService;
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

    service = new CommunicationService(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const communicationInfo: CommunicationInfo = {
    AuthorUserId: 1,
    Subject: 'Test',
    Body: '<p>Body</p>',
    StartDate: '2024-01-01',
    FromContactId: 123,
    ReplyToContactId: 123,
    Contacts: [456],
    CommunicationType: 'Email',
    IsBulkEmail: false,
    SendToContactParents: false,
  };

  const messageInfo: MessageInfo = {
    FromAddress: { Address: 'sender@example.com', DisplayName: 'Sender' },
    ReplyToAddress: { Address: 'sender@example.com', DisplayName: 'Sender' },
    ToAddresses: [{ Address: 'recipient@example.com', DisplayName: 'Recipient' }],
    Subject: 'Hello',
    Body: '<p>Body</p>',
  };

  describe('createCommunication', () => {
    it('should call post without attachments', async () => {
      const mockResult = { Communication_ID: 1 };
      (mockHttpClient.post as any).mockResolvedValueOnce(mockResult);

      const result = await service.createCommunication(communicationInfo);

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/communications',
        { ...communicationInfo },
        undefined
      );
      expect(mockHttpClient.postFormData).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should forward $userId as query param when provided (no attachments)', async () => {
      (mockHttpClient.post as any).mockResolvedValueOnce({ Communication_ID: 5 });

      await service.createCommunication(communicationInfo, undefined, { $userId: 42 });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/communications',
        { ...communicationInfo },
        { $userId: 42 }
      );
    });

    it('should forward $userId as query param when provided (with attachments)', async () => {
      (mockHttpClient.postFormData as any).mockResolvedValueOnce({ Communication_ID: 6 });

      const file = new File(['x'], 'x.pdf', { type: 'application/pdf' });
      await service.createCommunication(communicationInfo, [file], { $userId: 42 });

      const call = (mockHttpClient.postFormData as any).mock.calls[0];
      expect(call[0]).toBe('/communications');
      expect(call[2]).toEqual({ $userId: 42 });
    });

    it('should call postFormData with single attachment', async () => {
      const mockResult = { Communication_ID: 1 };
      (mockHttpClient.postFormData as any).mockResolvedValueOnce(mockResult);

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = await service.createCommunication(communicationInfo, [file]);

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.postFormData).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).not.toHaveBeenCalled();

      const call = (mockHttpClient.postFormData as any).mock.calls[0];
      expect(call[0]).toBe('/communications');
      const formData = call[1] as FormData;
      expect(formData.get('communication')).toBe(JSON.stringify(communicationInfo));
      const file0 = formData.get('file-0') as File;
      expect(file0.name).toBe('test.pdf');
      expect(result).toEqual(mockResult);
    });

    it('should call postFormData with multiple attachments', async () => {
      (mockHttpClient.postFormData as any).mockResolvedValueOnce({ Communication_ID: 2 });

      const file1 = new File(['a'], 'one.pdf', { type: 'application/pdf' });
      const file2 = new File(['b'], 'two.pdf', { type: 'application/pdf' });
      await service.createCommunication(communicationInfo, [file1, file2]);

      const call = (mockHttpClient.postFormData as any).mock.calls[0];
      const formData = call[1] as FormData;
      expect(formData.get('communication')).toBe(JSON.stringify(communicationInfo));
      expect((formData.get('file-0') as File).name).toBe('one.pdf');
      expect((formData.get('file-1') as File).name).toBe('two.pdf');
    });

    it('should propagate errors from post', async () => {
      (mockHttpClient.post as any).mockRejectedValueOnce(new Error('POST failed'));

      await expect(service.createCommunication(communicationInfo)).rejects.toThrow('POST failed');
    });

    it('should take non-attachment branch for empty attachments array', async () => {
      (mockHttpClient.post as any).mockResolvedValueOnce({ Communication_ID: 3 });

      await service.createCommunication(communicationInfo, []);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/communications',
        { ...communicationInfo },
        undefined
      );
      expect(mockHttpClient.postFormData).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should call post without attachments', async () => {
      const mockResult = { Communication_ID: 10 };
      (mockHttpClient.post as any).mockResolvedValueOnce(mockResult);

      const result = await service.sendMessage(messageInfo);

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/messages',
        { ...messageInfo },
        undefined
      );
      expect(mockHttpClient.postFormData).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should forward $userId as query param when provided', async () => {
      (mockHttpClient.post as any).mockResolvedValueOnce({ Communication_ID: 12 });

      await service.sendMessage(messageInfo, undefined, { $userId: 42 });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/messages',
        { ...messageInfo },
        { $userId: 42 }
      );
    });

    it('should call postFormData with attachments', async () => {
      (mockHttpClient.postFormData as any).mockResolvedValueOnce({ Communication_ID: 11 });

      const file1 = new File(['a'], 'a.txt', { type: 'text/plain' });
      const file2 = new File(['b'], 'b.txt', { type: 'text/plain' });
      await service.sendMessage(messageInfo, [file1, file2]);

      const call = (mockHttpClient.postFormData as any).mock.calls[0];
      expect(call[0]).toBe('/messages');
      const formData = call[1] as FormData;
      expect(formData.get('message')).toBe(JSON.stringify(messageInfo));
      expect((formData.get('file-0') as File).name).toBe('a.txt');
      expect((formData.get('file-1') as File).name).toBe('b.txt');
    });

    it('should propagate errors from post', async () => {
      (mockHttpClient.post as any).mockRejectedValueOnce(new Error('Send failed'));

      await expect(service.sendMessage(messageInfo)).rejects.toThrow('Send failed');
    });
  });

  describe('Token Validation', () => {
    it('should ensure valid token before each operation', async () => {
      (mockHttpClient.post as any).mockResolvedValue({ Communication_ID: 1 });

      await service.createCommunication(communicationInfo);
      await service.sendMessage(messageInfo);

      expect(mockClient.ensureValidToken).toHaveBeenCalledTimes(2);
    });
  });
});
