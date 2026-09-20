import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolveNumber, mockEnsureDefaults } = vi.hoisted(() => ({
  mockResolveNumber: vi.fn(),
  mockEnsureDefaults: vi.fn(),
}));
vi.mock('@/services/configurationSettingsService', () => ({
  ConfigurationSettingsService: {
    getInstance: vi.fn().mockReturnValue({ resolveNumber: mockResolveNumber, ensureDefaults: mockEnsureDefaults }),
  },
}));

import { MESSAGING_SETTING_SOURCES, MPNEXT_APPLICATION_CODE, getMessagingSettings } from './messagingSettings';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('getMessagingSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MESSAGING_COLLISION_EMAILS_PER_SECOND;
    mockResolveNumber.mockImplementation(async (source: { fallback: number }) => source.fallback);
    mockEnsureDefaults.mockResolvedValue([]);
  });

  it('seeds every key under MPNEXT with the value in effect: env var when set, else the default', async () => {
    process.env.MESSAGING_COLLISION_EMAILS_PER_SECOND = '7';
    await getMessagingSettings();
    expect(mockEnsureDefaults).toHaveBeenCalledTimes(1);
    const [code, seeds] = mockEnsureDefaults.mock.calls[0] as [string, Array<{ key: string; value: string; description: string }>];
    expect(code).toBe(MPNEXT_APPLICATION_CODE);
    expect(seeds).toHaveLength(Object.keys(MESSAGING_SETTING_SOURCES).length);
    expect(seeds.find((s) => s.key === 'MessagingEmailsPerSecond')).toEqual({
      key: 'MessagingEmailsPerSecond',
      value: '7',
      description: MESSAGING_SETTING_SOURCES.emailsPerSecond.description,
    });
    expect(seeds.find((s) => s.key === 'MessagingTextSegmentsPerSecond')?.value).toBe('5');
    expect(seeds.find((s) => s.key === 'MessagingSmsCostPerSegment')?.value).toBe('0.0083');
  });

  it('resolves every setting under the MPNEXT application code with its env var and fallback', async () => {
    const settings = await getMessagingSettings();
    expect(settings).toEqual({
      largeSendThreshold: 1000,
      highImpactThreshold: 10000,
      lookbackHours: 12,
      lookaheadHours: 12,
      criticalHours: 2,
      segmentsPerSecond: 5,
      emailsPerSecond: 5,
      smsCostPerSegment: 0.0083,
      mmsCostPerMessage: 0.022,
    });
    expect(mockResolveNumber).toHaveBeenCalledWith({
      applicationCode: MPNEXT_APPLICATION_CODE,
      key: 'MessagingTextSegmentsPerSecond',
      envVar: 'TEXT_SEGMENTS_PER_SECOND',
      fallback: 5,
    });
  });

  it('passes MP values straight through', async () => {
    mockResolveNumber.mockImplementation(async (source: { key: string; fallback: number }) =>
      source.key === 'MessagingEmailsPerSecond' ? 9 : source.fallback
    );
    expect((await getMessagingSettings()).emailsPerSecond).toBe(9);
  });

  it('keeps the SQL install script in step with the key names and defaults', () => {
    const sql = readFileSync(
      join(process.cwd(), 'src/lib/providers/ministry-platform/db/mpnext_configuration_settings.sql'),
      'utf8'
    );
    for (const source of Object.values(MESSAGING_SETTING_SOURCES)) {
      const row = new RegExp(`\\('${source.key}',\\s*'([^']+)',\\s*'([^']*)'\\)`).exec(sql);
      expect(row, `${source.key} is seeded`).not.toBeNull();
      expect(Number.parseFloat(row![1])).toBe(source.fallback);
      expect(row![2]).toBe(source.description.replace(/'/g, "''"));
    }
    expect(sql).toContain(`Application_Code = '${MPNEXT_APPLICATION_CODE}'`);
  });
});
