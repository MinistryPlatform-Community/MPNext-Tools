import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGetTableRecords, mockCreateTableRecords } = vi.hoisted(() => ({
  mockGetTableRecords: vi.fn(),
  mockCreateTableRecords: vi.fn(),
}));

vi.mock('@/lib/providers/ministry-platform', () => ({
  MPHelper: class {
    getTableRecords = mockGetTableRecords;
    createTableRecords = mockCreateTableRecords;
  },
}));

const mockRequireSecurityRole = vi.hoisted(() => vi.fn());
vi.mock('@/services/authorizationService', () => ({
  AuthorizationService: { getInstance: () => ({ requireSecurityRole: mockRequireSecurityRole }) },
}));

import { ConfigurationSettingsService, CONFIGURATION_SETTINGS_CACHE_MS } from './configurationSettingsService';

describe('ConfigurationSettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSecurityRole.mockResolvedValue(42);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    (ConfigurationSettingsService as unknown as { instance: unknown }).instance = null;
    delete process.env.TEST_SETTING_ENV;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns a singleton', () => {
    expect(ConfigurationSettingsService.getInstance()).toBe(ConfigurationSettingsService.getInstance());
  });

  describe('getAll', () => {
    it('reads every row for the application code once and caches it', async () => {
      mockGetTableRecords.mockResolvedValue([
        { Key_Name: 'A', Value: ' 1 ' },
        { Key_Name: 'Blank', Value: '   ' },
        { Key_Name: 'Null', Value: null },
        { Key_Name: 'B', Value: 'two' },
      ]);
      const service = ConfigurationSettingsService.getInstance();
      const first = await service.getAll('MPNEXT');
      const second = await service.getAll('MPNEXT');
      expect([...first]).toEqual([
        ['A', '1'],
        ['B', 'two'],
      ]);
      expect(second).toBe(first);
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
      expect(mockGetTableRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'dp_Configuration_Settings',
          select: 'Key_Name, Value',
          filter: "Application_Code='MPNEXT'",
        })
      );
    });

    it('shares one in-flight read and re-reads after the cache window', async () => {
      vi.useFakeTimers();
      mockGetTableRecords.mockResolvedValue([{ Key_Name: 'A', Value: '1' }]);
      const service = ConfigurationSettingsService.getInstance();
      await Promise.all([service.getAll('MPNEXT'), service.getAll('MPNEXT')]);
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(CONFIGURATION_SETTINGS_CACHE_MS + 1);
      await service.getAll('MPNEXT');
      expect(mockGetTableRecords).toHaveBeenCalledTimes(2);
    });

    it('serves stale values when MP fails, and an empty map when it never succeeded', async () => {
      vi.useFakeTimers();
      mockGetTableRecords.mockResolvedValueOnce([{ Key_Name: 'A', Value: '1' }]);
      const service = ConfigurationSettingsService.getInstance();
      await service.getAll('MPNEXT');
      vi.advanceTimersByTime(CONFIGURATION_SETTINGS_CACHE_MS + 1);
      mockGetTableRecords.mockRejectedValueOnce(new Error('down'));
      expect((await service.getAll('MPNEXT')).get('A')).toBe('1');

      mockGetTableRecords.mockRejectedValueOnce(new Error('down'));
      expect((await service.getAll('OTHER')).size).toBe(0);
    });

    it('rejects an application code that is not a plain identifier', async () => {
      const service = ConfigurationSettingsService.getInstance();
      await expect(service.getAll("X' OR 1=1")).rejects.toThrow('Invalid application code');
      expect(mockGetTableRecords).not.toHaveBeenCalled();
    });
  });

  describe('resolveNumber', () => {
    it('prefers a positive MP value, then the environment, then the fallback', async () => {
      mockGetTableRecords.mockResolvedValue([
        { Key_Name: 'Rate', Value: '7.5' },
        { Key_Name: 'Typo', Value: 'lots' },
        { Key_Name: 'Zero', Value: '0' },
      ]);
      const service = ConfigurationSettingsService.getInstance();
      const base = { applicationCode: 'MPNEXT', envVar: 'TEST_SETTING_ENV', fallback: 3 };
      expect(await service.resolveNumber({ ...base, key: 'Rate' })).toBe(7.5);
      expect(await service.resolveNumber({ ...base, key: 'Typo' })).toBe(3);
      expect(await service.resolveNumber({ ...base, key: 'Zero' })).toBe(3);
      process.env.TEST_SETTING_ENV = '4';
      expect(await service.resolveNumber({ ...base, key: 'Typo' })).toBe(4);
      expect(await service.resolveNumber({ ...base, key: 'Rate' })).toBe(7.5);
    });
  });

  describe('resolveString', () => {
    it('follows the same order for text', async () => {
      mockGetTableRecords.mockResolvedValue([{ Key_Name: 'Name', Value: 'from-mp' }]);
      const service = ConfigurationSettingsService.getInstance();
      const base = { applicationCode: 'MPNEXT', envVar: 'TEST_SETTING_ENV', fallback: null };
      expect(await service.resolveString({ ...base, key: 'Name' })).toBe('from-mp');
      expect(await service.resolveString({ ...base, key: 'Missing' })).toBeNull();
      process.env.TEST_SETTING_ENV = 'from-env';
      expect(await service.resolveString({ ...base, key: 'Missing' })).toBe('from-env');
    });
  });

  describe('ensureDefaults', () => {
    it('refuses to seed when the caller has no security role and leaves the seed marker unset', async () => {
      mockRequireSecurityRole.mockRejectedValueOnce(new Error('Not authorized'));
      mockGetTableRecords.mockResolvedValue([]);
      const service = ConfigurationSettingsService.getInstance();
      const seeds = [{ key: 'New', value: '1', description: 'd' }];
      await expect(service.ensureDefaults('MPNEXT', seeds)).rejects.toThrow('Not authorized');
      expect(mockCreateTableRecords).not.toHaveBeenCalled();
      mockCreateTableRecords.mockResolvedValue([{}]);
      expect(await service.ensureDefaults('MPNEXT', seeds)).toEqual(['New']);
    });

    const seeds = [
      { key: 'Existing', value: '1', description: 'already there' },
      { key: 'New', value: '5', description: 'brand new' },
      { key: 'Blank', value: '  ', description: 'never written' },
    ];

    it('creates only the missing rows, once per process, and adds them to the cache', async () => {
      mockGetTableRecords.mockResolvedValue([{ Key_Name: 'Existing', Value: '9' }]);
      mockCreateTableRecords.mockResolvedValue([{}]);
      const service = ConfigurationSettingsService.getInstance();

      expect(await service.ensureDefaults('MPNEXT', seeds)).toEqual(['New']);
      expect(mockCreateTableRecords).toHaveBeenCalledTimes(1);
      expect(mockCreateTableRecords).toHaveBeenCalledWith('dp_Configuration_Settings', [
        { Application_Code: 'MPNEXT', Key_Name: 'New', Value: '5', Description: 'brand new' },
      ]);
      // The new value is readable without another MP read, and the existing one is untouched.
      expect(await service.getValue('MPNEXT', 'New')).toBe('5');
      expect(await service.getValue('MPNEXT', 'Existing')).toBe('9');
      expect(mockGetTableRecords).toHaveBeenCalledTimes(1);

      expect(await service.ensureDefaults('MPNEXT', seeds)).toEqual([]);
      expect(mockCreateTableRecords).toHaveBeenCalledTimes(1);
    });

    it('does nothing when every key exists', async () => {
      mockGetTableRecords.mockResolvedValue([
        { Key_Name: 'Existing', Value: '9' },
        { Key_Name: 'New', Value: '2' },
      ]);
      const service = ConfigurationSettingsService.getInstance();
      expect(await service.ensureDefaults('MPNEXT', seeds)).toEqual([]);
      expect(mockCreateTableRecords).not.toHaveBeenCalled();
    });

    it('swallows a failed write and leaves the cache alone', async () => {
      mockGetTableRecords.mockResolvedValue([]);
      mockCreateTableRecords.mockRejectedValueOnce(new Error('no create permission'));
      const service = ConfigurationSettingsService.getInstance();
      expect(await service.ensureDefaults('MPNEXT', seeds)).toEqual([]);
      expect(await service.getValue('MPNEXT', 'New')).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('tries again after clearCache', async () => {
      mockGetTableRecords.mockResolvedValue([]);
      mockCreateTableRecords.mockResolvedValue([{}]);
      const service = ConfigurationSettingsService.getInstance();
      await service.ensureDefaults('MPNEXT', seeds);
      service.clearCache();
      await service.ensureDefaults('MPNEXT', seeds);
      expect(mockCreateTableRecords).toHaveBeenCalledTimes(2);
    });
  });

  it('clearCache forces the next read to hit MP', async () => {
    mockGetTableRecords.mockResolvedValue([]);
    const service = ConfigurationSettingsService.getInstance();
    await service.getAll('MPNEXT');
    service.clearCache();
    await service.getAll('MPNEXT');
    expect(mockGetTableRecords).toHaveBeenCalledTimes(2);
  });
});
