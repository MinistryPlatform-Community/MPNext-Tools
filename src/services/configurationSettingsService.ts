import { MPHelper } from '@/lib/providers/ministry-platform';
import { MP_MAX_PAGE_SIZE } from '@/lib/constants';
import { AuthorizationService } from '@/services/authorizationService';

/** How long one application code's settings stay cached before MP is read again. */
export const CONFIGURATION_SETTINGS_CACHE_MS = 5 * 60 * 1000;

const APPLICATION_CODE = /^[A-Z0-9_]{1,50}$/;

/** Where a setting may come from, in order: MP row, environment variable, built-in fallback. */
export interface SettingSource<T> {
  applicationCode: string;
  /** `dp_Configuration_Settings.Key_Name` */
  key: string;
  /** Environment variable consulted when MP has no non-empty value. */
  envVar?: string;
  fallback: T;
}

interface CacheEntry {
  values: Map<string, string>;
  fetchedAt: number;
}

/** A row to create when a church's MP has no value for the key yet. */
export interface SettingSeed {
  key: string;
  value: string;
  description: string;
}

/**
 * ConfigurationSettingsService: reads `dp_Configuration_Settings` so a church can tune
 * the tools from inside Ministry Platform (Administration > Configuration Settings)
 * instead of editing environment variables.
 *
 * Authorization (CLAUDE.md rule 12) carve-out, read side: `getAll`, `getValue`, and the
 * `resolve*` helpers read domain-wide tuning values (thresholds, prices, throughput)
 * under one application code. They hold no person's data, mirror the justified
 * `shared-actions/domain.ts` carve-out (one domain-wide config string), and are only
 * reached from service methods that have already passed `requireSecurityRole`. The
 * one write, `ensureDefaults`, gates itself.
 *
 * One read per application code fetches every row for that code and caches the map
 * for `CONFIGURATION_SETTINGS_CACHE_MS`. Lookups never throw: a failed read falls back
 * to the last cached values, then to the environment variable, then to the built-in
 * fallback, matching the precedence the other services use for API keys.
 */
export class ConfigurationSettingsService {
  private static instance: ConfigurationSettingsService | null = null;
  private mp: MPHelper;
  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<Map<string, string>>>();
  /** Application codes whose defaults this process has already tried to seed. */
  private seeded = new Set<string>();

  private constructor() {
    this.mp = new MPHelper();
  }

  public static getInstance(): ConfigurationSettingsService {
    if (!ConfigurationSettingsService.instance) {
      ConfigurationSettingsService.instance = new ConfigurationSettingsService();
    }
    return ConfigurationSettingsService.instance;
  }

  /** Every non-empty `Key_Name` to `Value` for the application code (cached). */
  public async getAll(applicationCode: string): Promise<Map<string, string>> {
    if (!APPLICATION_CODE.test(applicationCode)) throw new Error('Invalid application code');
    const cached = this.cache.get(applicationCode);
    if (cached && Date.now() - cached.fetchedAt < CONFIGURATION_SETTINGS_CACHE_MS) return cached.values;

    const pending = this.inflight.get(applicationCode);
    if (pending) return pending;

    const read = (async () => {
      try {
        const rows = await this.mp.getTableRecords<{ Key_Name: string; Value: string | null }>({
          table: 'dp_Configuration_Settings',
          select: 'Key_Name, Value',
          filter: `Application_Code='${applicationCode}'`,
          orderBy: 'Key_Name',
          top: MP_MAX_PAGE_SIZE,
        });
        const values = new Map<string, string>();
        for (const row of rows) {
          const value = row.Value?.trim();
          if (row.Key_Name && value) values.set(row.Key_Name, value);
        }
        this.cache.set(applicationCode, { values, fetchedAt: Date.now() });
        return values;
      } catch (error) {
        console.warn(
          `[configuration-settings] Could not read ${applicationCode} settings:`,
          error instanceof Error ? error.message : 'unknown error'
        );
        // Serve stale values rather than nothing; refresh on the next call.
        return cached?.values ?? new Map<string, string>();
      } finally {
        this.inflight.delete(applicationCode);
      }
    })();
    this.inflight.set(applicationCode, read);
    return read;
  }

  /** The MP value for one key, or null when the row is missing or blank. */
  public async getValue(applicationCode: string, key: string): Promise<string | null> {
    const values = await this.getAll(applicationCode);
    return values.get(key) ?? null;
  }

  /** MP value, else the environment variable, else the fallback. */
  public async resolveString(source: SettingSource<string | null>): Promise<string | null> {
    const mpValue = await this.getValue(source.applicationCode, source.key);
    if (mpValue) return mpValue;
    const envValue = source.envVar ? process.env[source.envVar]?.trim() : undefined;
    if (envValue) return envValue;
    return source.fallback;
  }

  /**
   * MP value parsed as a positive finite number, else the environment variable, else
   * the fallback. A row holding text that is not a positive number is skipped, so a
   * typo in MP degrades to the next source instead of breaking a tool.
   */
  public async resolveNumber(source: SettingSource<number>): Promise<number> {
    const mpValue = await this.getValue(source.applicationCode, source.key);
    const fromMp = parsePositive(mpValue);
    if (fromMp !== null) return fromMp;
    const fromEnv = parsePositive(source.envVar ? process.env[source.envVar] : undefined);
    if (fromEnv !== null) return fromEnv;
    return source.fallback;
  }

  /**
   * Writes the given rows for every key the church's MP does not have yet, so the
   * settings appear in Administration > Configuration Settings the first time a tool
   * runs. Attempted once per application code per process, never overwrites an
   * existing row, and a failed write (for example a read-only API user) only logs.
   * Returns the keys it created.
   */
  public async ensureDefaults(applicationCode: string, seeds: SettingSeed[]): Promise<string[]> {
    if (this.seeded.has(applicationCode)) return [];
    // A write to MP: the caller must hold a security role (rule 12). Checked before the
    // seed marker is set so a refused first call does not suppress a later permitted one.
    await AuthorizationService.getInstance().requireSecurityRole({
      table: 'dp_Configuration_Settings',
      operation: 'create',
    });
    this.seeded.add(applicationCode);
    const existing = await this.getAll(applicationCode);
    const missing = seeds.filter((seed) => !existing.has(seed.key) && seed.value.trim() !== '');
    if (missing.length === 0) return [];

    try {
      await this.mp.createTableRecords(
        'dp_Configuration_Settings',
        missing.map((seed) => ({
          Application_Code: applicationCode,
          Key_Name: seed.key,
          Value: seed.value,
          Description: seed.description,
        }))
      );
      const cached = this.cache.get(applicationCode);
      if (cached) for (const seed of missing) cached.values.set(seed.key, seed.value);
      return missing.map((seed) => seed.key);
    } catch (error) {
      console.warn(
        `[configuration-settings] Could not seed ${applicationCode} defaults:`,
        error instanceof Error ? error.message : 'unknown error'
      );
      return [];
    }
  }

  /** Drops every cached application code and seed marker so the next read hits MP. */
  public clearCache(): void {
    this.cache.clear();
    this.seeded.clear();
  }
}

function parsePositive(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
