import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetTableRecords,
  mockCreateTableRecords,
  mockUpdateTableRecords,
  mockDeleteTableRecords,
  mockCopyRecord,
  mockCopyRecordWithSubpages,
  mockGetDomainInfo,
  mockGetGlobalFilters,
  mockRefreshMetadata,
  mockGetTables,
  mockGetProcedures,
  mockExecuteProcedure,
  mockExecuteProcedureWithBody,
  mockCreateCommunication,
  mockSendMessage,
  mockGetFilesByRecord,
  mockUploadFiles,
  mockUpdateFile,
  mockDeleteFile,
  mockGetFileContentByUniqueId,
  mockGetFileMetadata,
  mockGetFileMetadataByUniqueId,
  mockEnsureValidToken,
  mockHttpGet,
  mockGetHttpClient,
} = vi.hoisted(() => {
  const mockHttpGet = vi.fn();
  return {
    mockGetTableRecords: vi.fn(),
    mockCreateTableRecords: vi.fn(),
    mockUpdateTableRecords: vi.fn(),
    mockDeleteTableRecords: vi.fn(),
    mockCopyRecord: vi.fn(),
    mockCopyRecordWithSubpages: vi.fn(),
    mockGetDomainInfo: vi.fn(),
    mockGetGlobalFilters: vi.fn(),
    mockRefreshMetadata: vi.fn(),
    mockGetTables: vi.fn(),
    mockGetProcedures: vi.fn(),
    mockExecuteProcedure: vi.fn(),
    mockExecuteProcedureWithBody: vi.fn(),
    mockCreateCommunication: vi.fn(),
    mockSendMessage: vi.fn(),
    mockGetFilesByRecord: vi.fn(),
    mockUploadFiles: vi.fn(),
    mockUpdateFile: vi.fn(),
    mockDeleteFile: vi.fn(),
    mockGetFileContentByUniqueId: vi.fn(),
    mockGetFileMetadata: vi.fn(),
    mockGetFileMetadataByUniqueId: vi.fn(),
    mockEnsureValidToken: vi.fn(),
    mockHttpGet,
    mockGetHttpClient: vi.fn(() => ({ get: mockHttpGet })),
  };
});

vi.mock('./client', () => ({
  MinistryPlatformClient: class {
    ensureValidToken = mockEnsureValidToken;
    getHttpClient = mockGetHttpClient;
  },
}));

vi.mock('./services', () => ({
  TableService: class {
    getTableRecords = mockGetTableRecords;
    createTableRecords = mockCreateTableRecords;
    updateTableRecords = mockUpdateTableRecords;
    deleteTableRecords = mockDeleteTableRecords;
    copyRecord = mockCopyRecord;
    copyRecordWithSubpages = mockCopyRecordWithSubpages;
  },
  ProcedureService: class {
    getProcedures = mockGetProcedures;
    executeProcedure = mockExecuteProcedure;
    executeProcedureWithBody = mockExecuteProcedureWithBody;
  },
  CommunicationService: class {
    createCommunication = mockCreateCommunication;
    sendMessage = mockSendMessage;
  },
  MetadataService: class {
    refreshMetadata = mockRefreshMetadata;
    getTables = mockGetTables;
  },
  DomainService: class {
    getDomainInfo = mockGetDomainInfo;
    getGlobalFilters = mockGetGlobalFilters;
  },
  FileService: class {
    getFilesByRecord = mockGetFilesByRecord;
    uploadFiles = mockUploadFiles;
    updateFile = mockUpdateFile;
    deleteFile = mockDeleteFile;
    getFileContentByUniqueId = mockGetFileContentByUniqueId;
    getFileMetadata = mockGetFileMetadata;
    getFileMetadataByUniqueId = mockGetFileMetadataByUniqueId;
  },
}));

import { MinistryPlatformProvider } from './provider';

describe('MinistryPlatformProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (MinistryPlatformProvider as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = MinistryPlatformProvider.getInstance();
      const instance2 = MinistryPlatformProvider.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Table operations', () => {
    it('should delegate getTableRecords to TableService', async () => {
      const mockRecords = [{ id: 1, name: 'Test' }];
      mockGetTableRecords.mockResolvedValueOnce(mockRecords);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.getTableRecords('Contacts', { $filter: 'Active=1' });

      expect(mockGetTableRecords).toHaveBeenCalledWith('Contacts', { $filter: 'Active=1' });
      expect(result).toEqual(mockRecords);
    });

    it('should delegate createTableRecords to TableService', async () => {
      const records = [{ First_Name: 'John' }];
      mockCreateTableRecords.mockResolvedValueOnce(records);

      const provider = MinistryPlatformProvider.getInstance();
      await provider.createTableRecords('Contacts', records);

      expect(mockCreateTableRecords).toHaveBeenCalledWith('Contacts', records, undefined);
    });

    it('should delegate updateTableRecords to TableService', async () => {
      const records = [{ Contact_ID: 1, First_Name: 'Jane' }];
      mockUpdateTableRecords.mockResolvedValueOnce(records);

      const provider = MinistryPlatformProvider.getInstance();
      await provider.updateTableRecords('Contacts', records);

      expect(mockUpdateTableRecords).toHaveBeenCalledWith('Contacts', records, undefined);
    });

    it('should delegate deleteTableRecords to TableService', async () => {
      mockDeleteTableRecords.mockResolvedValueOnce([]);

      const provider = MinistryPlatformProvider.getInstance();
      await provider.deleteTableRecords('Contacts', [1, 2]);

      expect(mockDeleteTableRecords).toHaveBeenCalledWith('Contacts', [1, 2], undefined);
    });
  });

  describe('Procedure operations', () => {
    it('should delegate executeProcedure to ProcedureService', async () => {
      mockExecuteProcedure.mockResolvedValueOnce([[{ result: 1 }]]);

      const provider = MinistryPlatformProvider.getInstance();
      await provider.executeProcedure('sp_test', { '@Param1': 'value' });

      expect(mockExecuteProcedure).toHaveBeenCalledWith('sp_test', { '@Param1': 'value' });
    });

    it('should delegate executeProcedureWithBody to ProcedureService', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[{ result: 1 }]]);

      const provider = MinistryPlatformProvider.getInstance();
      await provider.executeProcedureWithBody('sp_test', { '@Param1': 'value' });

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith(
        'sp_test',
        { '@Param1': 'value' },
        undefined
      );
    });

    it('should forward queryParams ($userId) to ProcedureService', async () => {
      mockExecuteProcedureWithBody.mockResolvedValueOnce([[{ result: 1 }]]);

      const provider = MinistryPlatformProvider.getInstance();
      await provider.executeProcedureWithBody('sp_test', { '@Param1': 'value' }, { $userId: 7 });

      expect(mockExecuteProcedureWithBody).toHaveBeenCalledWith(
        'sp_test',
        { '@Param1': 'value' },
        { $userId: 7 }
      );
    });

    it('should delegate getProcedures to ProcedureService', async () => {
      const procs = [{ Procedure_Name: 'api_Test' }];
      mockGetProcedures.mockResolvedValueOnce(procs);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.getProcedures('api');

      expect(mockGetProcedures).toHaveBeenCalledWith('api');
      expect(result).toEqual(procs);
    });
  });

  describe('Domain operations', () => {
    it('should delegate getDomainInfo to DomainService', async () => {
      const mockDomain = { DomainId: 1, DomainName: 'Test' };
      mockGetDomainInfo.mockResolvedValueOnce(mockDomain);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.getDomainInfo();

      expect(result).toEqual(mockDomain);
    });

    it('should delegate getGlobalFilters to DomainService', async () => {
      const filters = [{ Key: 1, Value: 'Filter' }];
      mockGetGlobalFilters.mockResolvedValueOnce(filters);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.getGlobalFilters({ $userId: 5 });

      expect(mockGetGlobalFilters).toHaveBeenCalledWith({ $userId: 5 });
      expect(result).toEqual(filters);
    });
  });

  describe('Metadata operations', () => {
    it('should delegate getTables to MetadataService', async () => {
      const mockTables = [{ TableName: 'Contacts' }];
      mockGetTables.mockResolvedValueOnce(mockTables);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.getTables('Contacts');

      expect(mockGetTables).toHaveBeenCalledWith('Contacts');
      expect(result).toEqual(mockTables);
    });

    it('should delegate refreshMetadata to MetadataService', async () => {
      mockRefreshMetadata.mockResolvedValueOnce(undefined);

      const provider = MinistryPlatformProvider.getInstance();
      await provider.refreshMetadata();

      expect(mockRefreshMetadata).toHaveBeenCalled();
    });
  });

  describe('Copy operations', () => {
    it('should delegate copyRecord to TableService', async () => {
      const pattern = {
        Type: 'Weekly' as const,
        Interval: 1,
        StartDate: '2026-01-01T09:00:00',
        TotalOccurrences: 3,
      };
      const copied = [{ Event_ID: 2 }, { Event_ID: 3 }, { Event_ID: 4 }];
      mockCopyRecord.mockResolvedValueOnce(copied);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.copyRecord('Events', 1, pattern, { $userId: 99 });

      expect(mockCopyRecord).toHaveBeenCalledWith('Events', 1, pattern, { $userId: 99 });
      expect(result).toEqual(copied);
    });

    it('should delegate copyRecordWithSubpages to TableService', async () => {
      const copyParams = {
        Pattern: {
          Type: 'Weekly' as const,
          Interval: 1,
          StartDate: '2026-01-01T09:00:00',
          TotalOccurrences: 2,
        },
        SubpageIds: [298],
        CopyFiles: false,
      };
      const copied = [{ Event_ID: 2 }, { Event_ID: 3 }];
      mockCopyRecordWithSubpages.mockResolvedValueOnce(copied);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.copyRecordWithSubpages('Events', 1, copyParams);

      expect(mockCopyRecordWithSubpages).toHaveBeenCalledWith('Events', 1, copyParams, undefined);
      expect(result).toEqual(copied);
    });
  });

  describe('generateSequence', () => {
    it('should call ensureValidToken and build required query params', async () => {
      mockEnsureValidToken.mockResolvedValueOnce(undefined);
      const dates = ['2026-04-09T18:30:00', '2026-04-16T18:30:00'];
      mockHttpGet.mockResolvedValueOnce(dates);

      const pattern = {
        Type: 'Weekly' as const,
        Interval: 1,
        StartDate: '2026-04-09T18:30:00',
      };

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.generateSequence(pattern);

      expect(mockEnsureValidToken).toHaveBeenCalled();
      expect(mockHttpGet).toHaveBeenCalledWith('/tasks/generate-sequence', {
        $type: 'Weekly',
        $interval: 1,
        $startDate: '2026-04-09T18:30:00',
      });
      expect(result).toEqual(dates);
    });

    it('should include all optional fields when provided', async () => {
      mockEnsureValidToken.mockResolvedValueOnce(undefined);
      mockHttpGet.mockResolvedValueOnce([]);

      const pattern = {
        Type: 'Monthly' as const,
        Interval: 2,
        StartDate: '2026-01-01',
        EndDate: '2026-12-31',
        TotalOccurrences: 6,
        Weekdays: 'Monday' as const,
        DayPosition: 'First' as const,
        Day: 15,
        Month: 'January' as const,
      };

      const provider = MinistryPlatformProvider.getInstance();
      await provider.generateSequence(pattern);

      expect(mockHttpGet).toHaveBeenCalledWith('/tasks/generate-sequence', {
        $type: 'Monthly',
        $interval: 2,
        $startDate: '2026-01-01',
        $endDate: '2026-12-31',
        $totalOccurrences: 6,
        $weekdays: 'Monday',
        $dayPosition: 'First',
        $day: 15,
        $month: 'January',
      });
    });

    it('should omit optional fields when not provided', async () => {
      mockEnsureValidToken.mockResolvedValueOnce(undefined);
      mockHttpGet.mockResolvedValueOnce([]);

      const pattern = {
        Type: 'Daily' as const,
        Interval: 1,
        StartDate: '2026-01-01',
      };

      const provider = MinistryPlatformProvider.getInstance();
      await provider.generateSequence(pattern);

      const callArg = mockHttpGet.mock.calls[0][1];
      expect(callArg).not.toHaveProperty('$endDate');
      expect(callArg).not.toHaveProperty('$totalOccurrences');
      expect(callArg).not.toHaveProperty('$weekdays');
      expect(callArg).not.toHaveProperty('$dayPosition');
      expect(callArg).not.toHaveProperty('$day');
      expect(callArg).not.toHaveProperty('$month');
    });
  });

  describe('Communication operations', () => {
    it('should delegate createCommunication to CommunicationService', async () => {
      const comm = {
        Author_User_ID: 1,
        Subject: 'Hi',
        Body: '<p>x</p>',
        Start_Date: '2026-01-01',
        From_Contact: 1,
        Reply_to_Contact: 1,
        To_Contact_List: '2',
      };
      const created = { Communication_ID: 10, ...comm };
      mockCreateCommunication.mockResolvedValueOnce(created);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.createCommunication(comm);

      expect(mockCreateCommunication).toHaveBeenCalledWith(comm, undefined, undefined);
      expect(result).toEqual(created);
    });

    it('should forward $userId params to createCommunication', async () => {
      const comm = {
        AuthorUserId: 1,
        Subject: 'Hi',
        Body: '<p>x</p>',
        StartDate: '2026-01-01',
        FromContactId: 1,
        ReplyToContactId: 1,
        Contacts: [2],
        CommunicationType: 'Email' as const,
        IsBulkEmail: false,
        SendToContactParents: false,
      };
      mockCreateCommunication.mockResolvedValueOnce({ Communication_ID: 10, ...comm });

      const provider = MinistryPlatformProvider.getInstance();
      await provider.createCommunication(comm, undefined, { $userId: 42 });

      expect(mockCreateCommunication).toHaveBeenCalledWith(comm, undefined, { $userId: 42 });
    });

    it('should delegate sendMessage to CommunicationService', async () => {
      const message = {
        From: 'a@example.com',
        To: 'b@example.com',
        Subject: 'Test',
        Body: '<p>Hi</p>',
      };
      const sent = { Communication_ID: 11, ...message };
      const file = new File(['x'], 'x.txt');
      mockSendMessage.mockResolvedValueOnce(sent);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.sendMessage(message, [file]);

      expect(mockSendMessage).toHaveBeenCalledWith(message, [file], undefined);
      expect(result).toEqual(sent);
    });

    it('should forward $userId params to sendMessage', async () => {
      const message = {
        FromAddress: { Address: 'a@example.com', DisplayName: 'A' },
        ToAddresses: [{ Address: 'b@example.com', DisplayName: 'B' }],
        Subject: 'Test',
        Body: '<p>Hi</p>',
      };
      mockSendMessage.mockResolvedValueOnce({ Communication_ID: 11, ...message });

      const provider = MinistryPlatformProvider.getInstance();
      await provider.sendMessage(message, undefined, { $userId: 42 });

      expect(mockSendMessage).toHaveBeenCalledWith(message, undefined, { $userId: 42 });
    });
  });

  describe('File operations', () => {
    it('should delegate getFilesByRecord to FileService', async () => {
      const files = [{ File_ID: 1 }];
      mockGetFilesByRecord.mockResolvedValueOnce(files);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.getFilesByRecord('Contacts', 1, true);

      expect(mockGetFilesByRecord).toHaveBeenCalledWith('Contacts', 1, true);
      expect(result).toEqual(files);
    });

    it('should delegate uploadFiles to FileService', async () => {
      const file = new File(['x'], 'test.txt');
      const uploaded = [{ File_ID: 2, File_Name: 'test.txt' }];
      mockUploadFiles.mockResolvedValueOnce(uploaded);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.uploadFiles('Contacts', 1, [file], { IsDefault: true });

      expect(mockUploadFiles).toHaveBeenCalledWith('Contacts', 1, [file], { IsDefault: true });
      expect(result).toEqual(uploaded);
    });

    it('should delegate updateFile to FileService', async () => {
      const file = new File(['x'], 'new.txt');
      const updated = { File_ID: 1, File_Name: 'new.txt' };
      mockUpdateFile.mockResolvedValueOnce(updated);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.updateFile(1, file, { Description: 'desc' });

      expect(mockUpdateFile).toHaveBeenCalledWith(1, file, { Description: 'desc' });
      expect(result).toEqual(updated);
    });

    it('should delegate deleteFile to FileService', async () => {
      mockDeleteFile.mockResolvedValueOnce(undefined);

      const provider = MinistryPlatformProvider.getInstance();
      await provider.deleteFile(1, 123);

      expect(mockDeleteFile).toHaveBeenCalledWith(1, 123);
    });

    it('should delegate getFileContentByUniqueId to FileService', async () => {
      const blob = new Blob(['content']);
      mockGetFileContentByUniqueId.mockResolvedValueOnce(blob);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.getFileContentByUniqueId('unique-1', true);

      expect(mockGetFileContentByUniqueId).toHaveBeenCalledWith('unique-1', true);
      expect(result).toBe(blob);
    });

    it('should delegate getFileMetadata to FileService', async () => {
      const meta = { File_ID: 1, File_Name: 'x.jpg' };
      mockGetFileMetadata.mockResolvedValueOnce(meta);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.getFileMetadata(1);

      expect(mockGetFileMetadata).toHaveBeenCalledWith(1);
      expect(result).toEqual(meta);
    });

    it('should delegate getFileMetadataByUniqueId to FileService', async () => {
      const meta = { File_ID: 1, Unique_Name: 'u-1' };
      mockGetFileMetadataByUniqueId.mockResolvedValueOnce(meta);

      const provider = MinistryPlatformProvider.getInstance();
      const result = await provider.getFileMetadataByUniqueId('u-1');

      expect(mockGetFileMetadataByUniqueId).toHaveBeenCalledWith('u-1');
      expect(result).toEqual(meta);
    });
  });
});
