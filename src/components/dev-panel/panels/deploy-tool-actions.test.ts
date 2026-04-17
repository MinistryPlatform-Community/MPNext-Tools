import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGetSession, mockListPages, mockListRoles, mockDeployTool } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockListPages: vi.fn(),
  mockListRoles: vi.fn(),
  mockDeployTool: vi.fn(),
}));

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
      listPages: mockListPages,
      listRoles: mockListRoles,
      deployTool: mockDeployTool,
    }),
  },
}));

import {
  deployToolAction,
  getDeployToolEnvStatusAction,
  listPagesAction,
  listRolesAction,
} from './deploy-tool-actions';
import type { DeployToolInput, DeployToolResult } from '@/services/toolService';

const validSession = {
  user: { id: 'internal-id', userGuid: '550e8400-e29b-41d4-a716-446655440000' },
};

const sampleInput: DeployToolInput = {
  toolName: 'FooTool',
  launchPage: 'https://example.org/tools/foo',
  description: 'A test tool',
  launchWithCredentials: true,
  launchWithParameters: true,
  launchInNewTab: false,
  showOnMobile: false,
  pageIds: [292, 305],
  additionalData: undefined,
  roleIds: [1, 5],
};

const sampleResult: DeployToolResult = {
  tool: {
    Tool_ID: 42,
    Tool_Name: 'FooTool',
    Description: 'A test tool',
    Launch_Page: 'https://example.org/tools/foo',
    Launch_with_Credentials: true,
    Launch_with_Parameters: true,
    Launch_in_New_Tab: false,
    Show_On_Mobile: false,
  },
  pages: [],
  roles: [],
};

describe('deploy-tool-actions', () => {
  beforeEach(() => {
    // clearAllMocks only clears call history — reset the individual mocks we
    // queue per-test so leftover mockResolvedValueOnce values don't leak across tests.
    mockGetSession.mockReset();
    mockListPages.mockReset();
    mockListRoles.mockReset();
    mockDeployTool.mockReset();
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Session + NODE_ENV guards', () => {
    it('rejects listPagesAction when no session', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      await expect(listPagesAction()).rejects.toThrow('Unauthorized');
      expect(mockListPages).not.toHaveBeenCalled();
    });

    it('rejects listRolesAction when no session', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      await expect(listRolesAction()).rejects.toThrow('Unauthorized');
      expect(mockListRoles).not.toHaveBeenCalled();
    });

    it('rejects deployToolAction when no session', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      await expect(deployToolAction(sampleInput)).rejects.toThrow('Unauthorized');
      expect(mockDeployTool).not.toHaveBeenCalled();
    });

    it('rejects deployToolAction when NODE_ENV=production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockGetSession.mockResolvedValueOnce(validSession);
      await expect(deployToolAction(sampleInput)).rejects.toThrow(
        'Deploy Tool is not available in production'
      );
      expect(mockDeployTool).not.toHaveBeenCalled();
    });

    it('rejects listPagesAction when NODE_ENV=production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockGetSession.mockResolvedValueOnce(validSession);
      await expect(listPagesAction()).rejects.toThrow(
        'Deploy Tool is not available in production'
      );
    });

    it('rejects listRolesAction when NODE_ENV=production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockGetSession.mockResolvedValueOnce(validSession);
      await expect(listRolesAction()).rejects.toThrow(
        'Deploy Tool is not available in production'
      );
    });
  });

  describe('Delegation', () => {
    it('listPagesAction passes search term to service', async () => {
      mockGetSession.mockResolvedValueOnce(validSession);
      mockListPages.mockResolvedValueOnce([{ Page_ID: 1, Display_Name: 'Contacts', Table_Name: 'Contacts' }]);

      const result = await listPagesAction('Contact');

      expect(mockListPages).toHaveBeenCalledWith('Contact');
      expect(result).toEqual([{ Page_ID: 1, Display_Name: 'Contacts', Table_Name: 'Contacts' }]);
    });

    it('listRolesAction passes search term to service', async () => {
      mockGetSession.mockResolvedValueOnce(validSession);
      mockListRoles.mockResolvedValueOnce([{ Role_ID: 1, Role_Name: 'Administrators' }]);

      const result = await listRolesAction('Admin');

      expect(mockListRoles).toHaveBeenCalledWith('Admin');
      expect(result).toEqual([{ Role_ID: 1, Role_Name: 'Administrators' }]);
    });

    it('deployToolAction forwards input to service and returns result', async () => {
      mockGetSession.mockResolvedValueOnce(validSession);
      mockDeployTool.mockResolvedValueOnce(sampleResult);

      const result = await deployToolAction(sampleInput);

      expect(mockDeployTool).toHaveBeenCalledWith(sampleInput);
      expect(result).toEqual(sampleResult);
    });

    it('deployToolAction propagates service errors', async () => {
      mockGetSession.mockResolvedValueOnce(validSession);
      mockDeployTool.mockRejectedValueOnce(new Error('SP execution failed'));

      await expect(deployToolAction(sampleInput)).rejects.toThrow('SP execution failed');
    });
  });

  describe('getDeployToolEnvStatusAction', () => {
    it('rejects without a session', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      await expect(getDeployToolEnvStatusAction()).rejects.toThrow('Unauthorized');
    });

    it('rejects in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockGetSession.mockResolvedValueOnce(validSession);
      await expect(getDeployToolEnvStatusAction()).rejects.toThrow(
        'Deploy Tool is not available in production'
      );
    });

    it('reports hasDevCreds=true when both env vars are set', async () => {
      vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_ID', 'id');
      vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_SECRET', 'secret');
      mockGetSession.mockResolvedValueOnce(validSession);

      const status = await getDeployToolEnvStatusAction();

      expect(status).toEqual({ hasDevCreds: true, missing: [] });
    });

    it('reports missing env vars by name', async () => {
      vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_ID', '');
      vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_SECRET', '');
      mockGetSession.mockResolvedValueOnce(validSession);

      const status = await getDeployToolEnvStatusAction();

      expect(status.hasDevCreds).toBe(false);
      expect(status.missing).toEqual([
        'MINISTRY_PLATFORM_DEV_CLIENT_ID',
        'MINISTRY_PLATFORM_DEV_CLIENT_SECRET',
      ]);
    });

    it('reports a single missing env var when only one is unset', async () => {
      vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_ID', 'id');
      vi.stubEnv('MINISTRY_PLATFORM_DEV_CLIENT_SECRET', '');
      mockGetSession.mockResolvedValueOnce(validSession);

      const status = await getDeployToolEnvStatusAction();

      expect(status).toEqual({
        hasDevCreds: false,
        missing: ['MINISTRY_PLATFORM_DEV_CLIENT_SECRET'],
      });
    });
  });
});
