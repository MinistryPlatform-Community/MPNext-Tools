import {
  MESSAGING_COLLISION_CRITICAL_HOURS,
  MESSAGING_COLLISION_EMAILS_PER_SECOND,
  MESSAGING_COLLISION_HIGH_IMPACT_THRESHOLD,
  MESSAGING_COLLISION_LARGE_SEND_THRESHOLD,
  MESSAGING_COLLISION_LOOKAHEAD_HOURS,
  MESSAGING_COLLISION_LOOKBACK_HOURS,
  TEXT_DEFAULT_MMS_COST_PER_MESSAGE,
  TEXT_DEFAULT_SEGMENTS_PER_SECOND,
  TEXT_DEFAULT_SMS_COST_PER_SEGMENT,
} from '@/lib/constants';
import { ConfigurationSettingsService } from '@/services/configurationSettingsService';

/**
 * `dp_Configuration_Settings.Application_Code` for every MPNext tool setting, so a
 * church sees them grouped together in Administration > Configuration Settings.
 */
export const MPNEXT_APPLICATION_CODE = 'MPNEXT';

/** Tunables shared by the messaging tools and the collision check. */
export interface MessagingSettings {
  /** A send to more people than this is "large". */
  largeSendThreshold: number;
  /** A send to more people than this is flagged "High impact". */
  highImpactThreshold: number;
  /** Hours before the planned send the collision check looks. */
  lookbackHours: number;
  /** Hours after the planned send the collision check looks. */
  lookaheadHours: number;
  /** Hours either side treated as the queueing band. */
  criticalHours: number;
  /** Text throughput of the MP messaging worker, in segments per second. */
  segmentsPerSecond: number;
  /** Email throughput of the MP messaging worker, in messages per second. */
  emailsPerSecond: number;
  /** USD per SMS segment when the sending number has no `Cost_Per_Segment`. */
  smsCostPerSegment: number;
  /** USD per MMS message. */
  mmsCostPerMessage: number;
}

export interface MessagingSettingSource {
  /** `dp_Configuration_Settings.Key_Name` under `MPNEXT_APPLICATION_CODE`. */
  key: string;
  /** Environment variable used when MP has no value. */
  envVar: string;
  /** Built-in default when neither is set. */
  fallback: number;
  /** Shown in MP's Configuration Settings page; mirrored in the SQL install script. */
  description: string;
}

/**
 * Where each setting lives. Resolution order for every one: the MP row, then the
 * environment variable, then the fallback. The install script under
 * `src/lib/providers/ministry-platform/db/` seeds the MP rows with these descriptions.
 */
export const MESSAGING_SETTING_SOURCES: Record<keyof MessagingSettings, MessagingSettingSource> = {
  largeSendThreshold: {
    key: 'MessagingLargeSendThreshold',
    envVar: 'MESSAGING_COLLISION_LARGE_SEND_THRESHOLD',
    fallback: MESSAGING_COLLISION_LARGE_SEND_THRESHOLD,
    description: 'A message to more recipients than this counts as a large send in the collision check.',
  },
  highImpactThreshold: {
    key: 'MessagingHighImpactThreshold',
    envVar: 'MESSAGING_COLLISION_HIGH_IMPACT_THRESHOLD',
    fallback: MESSAGING_COLLISION_HIGH_IMPACT_THRESHOLD,
    description: 'A message to more recipients than this is flagged High impact in the collision check.',
  },
  lookbackHours: {
    key: 'MessagingCollisionLookbackHours',
    envVar: 'MESSAGING_COLLISION_LOOKBACK_HOURS',
    fallback: MESSAGING_COLLISION_LOOKBACK_HOURS,
    description: 'Hours before a planned send to look for other messages.',
  },
  lookaheadHours: {
    key: 'MessagingCollisionLookaheadHours',
    envVar: 'MESSAGING_COLLISION_LOOKAHEAD_HOURS',
    fallback: MESSAGING_COLLISION_LOOKAHEAD_HOURS,
    description: 'Hours after a planned send to look for other messages.',
  },
  criticalHours: {
    key: 'MessagingCollisionCriticalHours',
    envVar: 'MESSAGING_COLLISION_CRITICAL_HOURS',
    fallback: MESSAGING_COLLISION_CRITICAL_HOURS,
    description: 'Hours either side of a planned send treated as the queueing band.',
  },
  segmentsPerSecond: {
    key: 'MessagingTextSegmentsPerSecond',
    envVar: 'TEXT_SEGMENTS_PER_SECOND',
    fallback: TEXT_DEFAULT_SEGMENTS_PER_SECOND,
    description: 'Text segments the messaging worker delivers per second, for delivery time and queue estimates.',
  },
  emailsPerSecond: {
    key: 'MessagingEmailsPerSecond',
    envVar: 'MESSAGING_COLLISION_EMAILS_PER_SECOND',
    fallback: MESSAGING_COLLISION_EMAILS_PER_SECOND,
    description: 'Emails the messaging worker delivers per second, for queue estimates.',
  },
  smsCostPerSegment: {
    key: 'MessagingSmsCostPerSegment',
    envVar: 'TEXT_SMS_COST_PER_SEGMENT',
    fallback: TEXT_DEFAULT_SMS_COST_PER_SEGMENT,
    description: 'USD per SMS segment when the sending number has no Cost Per Segment of its own.',
  },
  mmsCostPerMessage: {
    key: 'MessagingMmsCostPerMessage',
    envVar: 'TEXT_MMS_COST_PER_MESSAGE',
    fallback: TEXT_DEFAULT_MMS_COST_PER_MESSAGE,
    description: 'USD per MMS (picture) message.',
  },
};

/**
 * Resolves every messaging setting in one pass. The underlying read is one MP call
 * per cache window, so calling this per request is cheap.
 *
 * The first call in a process also seeds any key the church's MP lacks, writing the
 * value currently in effect (the environment variable when set, else the built-in
 * default) with its description, so admins find every setting in MP without running
 * the install script.
 */
export async function getMessagingSettings(): Promise<MessagingSettings> {
  const config = ConfigurationSettingsService.getInstance();
  await config.ensureDefaults(
    MPNEXT_APPLICATION_CODE,
    Object.values(MESSAGING_SETTING_SOURCES).map((source) => ({
      key: source.key,
      value: String(effectiveDefault(source)),
      description: source.description,
    }))
  );
  const entries = await Promise.all(
    (Object.keys(MESSAGING_SETTING_SOURCES) as Array<keyof MessagingSettings>).map(async (name) => {
      const source = MESSAGING_SETTING_SOURCES[name];
      const value = await config.resolveNumber({
        applicationCode: MPNEXT_APPLICATION_CODE,
        key: source.key,
        envVar: source.envVar,
        fallback: source.fallback,
      });
      return [name, value] as const;
    })
  );
  return Object.fromEntries(entries) as unknown as MessagingSettings;
}

/** The value a setting has before MP holds a row: the env var when it is a positive number, else the fallback. */
function effectiveDefault(source: MessagingSettingSource): number {
  const fromEnv = Number.parseFloat(process.env[source.envVar]?.trim() ?? '');
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : source.fallback;
}
