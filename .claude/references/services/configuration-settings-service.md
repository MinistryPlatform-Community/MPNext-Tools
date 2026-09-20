---
title: ConfigurationSettingsService and messaging settings
domain: services
type: reference
applies_to: [src/services/configurationSettingsService.ts, src/services/configurationSettingsService.test.ts, src/services/messagingSettings.ts, src/services/messagingSettings.test.ts, src/lib/providers/ministry-platform/db/mpnext_configuration_settings.sql]
symbols: [ConfigurationSettingsService, SettingSource, CONFIGURATION_SETTINGS_CACHE_MS, getMessagingSettings, MessagingSettings, MESSAGING_SETTING_SOURCES, MPNEXT_APPLICATION_CODE]
related: [messaging-collision-service.md, text-message-service.md, ../components/text-messaging.md, ../dto-constants/constants.md]
last_verified: 2026-09-17
---

## Purpose
Lets a church tune the tools from inside Ministry Platform. `ConfigurationSettingsService` reads `dp_Configuration_Settings` for one `Application_Code` and resolves each setting as MP row, then environment variable, then built-in default. `messagingSettings.ts` is the first catalogue built on it: the thresholds, windows, worker rates, and prices the Text Messaging tool and the collision check share.

## Files
- `src/services/configurationSettingsService.ts` — generic reader (sync `getInstance()`, like `DomainTimezoneService`)
- `src/services/messagingSettings.ts` — `MESSAGING_SETTING_SOURCES` catalogue + `getMessagingSettings()`
- `src/lib/providers/ministry-platform/db/mpnext_configuration_settings.sql` — idempotent seed of the MP rows, bundled into `_INSTALL/ministryplatform-install.sql` by `npm run mp:build:install`
- `*.test.ts` — Vitest suites; the settings test also checks the SQL seed matches the catalogue's keys, defaults, and descriptions

## Key concepts
- **Application_Code MPNEXT.** Tool settings live under their own code so they group together in Administration > Configuration Settings. Earlier services read API keys under `COMMON` (`GoogleMapsAPIKey`, `AzureOpenAiDeployment`, ...) because those keys are MP's own or shared; new tool tunables go under `MPNEXT`.
- **One read per code, cached 5 minutes.** `getAll(code)` fetches every row for the code (`Key_Name, Value`, top 1000), trims values, drops blanks, and caches the map for `CONFIGURATION_SETTINGS_CACHE_MS`. Concurrent callers share one in-flight read. A failed read logs a warning and serves the stale map (or an empty one), so a settings outage never breaks a tool.
- **Precedence.** `resolveNumber` / `resolveString`: MP value, then `process.env[envVar]`, then `fallback`. A number must be finite and greater than zero to count, so a typo in MP falls through to the next source instead of, say, dividing by zero.
- **Self-seeding.** `ensureDefaults(code, seeds)` writes a row for every key MP lacks (once per code per process, via `createTableRecords`, never overwriting) and adds it to the cache. `getMessagingSettings()` calls it first with the value currently in effect (env var when set, else the fallback) so a fresh install shows every setting in MP after the first tool launch; the SQL seed is then optional. A write failure only logs.
- **Catalogue drives everything.** `MESSAGING_SETTING_SOURCES` maps each `MessagingSettings` field to its `Key_Name`, env var, fallback constant, and description. The SQL seed repeats key, default, and description; the test fails if they drift.

## API / Interface
```typescript
ConfigurationSettingsService.getInstance(): ConfigurationSettingsService
getAll(applicationCode: string): Promise<Map<string, string>>            // cached; code must match /^[A-Z0-9_]{1,50}$/
getValue(applicationCode: string, key: string): Promise<string | null>
resolveString(source: SettingSource<string | null>): Promise<string | null>
resolveNumber(source: SettingSource<number>): Promise<number>            // positive finite only
ensureDefaults(applicationCode: string, seeds: SettingSeed[]): Promise<string[]>   // creates missing rows once per process; returns created keys
clearCache(): void                                                        // also resets the seed marker

getMessagingSettings(): Promise<MessagingSettings>   // all nine settings in one pass
```

| `MessagingSettings` field | Key_Name | Env var | Default |
|---|---|---|---|
| `largeSendThreshold` | `MessagingLargeSendThreshold` | `MESSAGING_COLLISION_LARGE_SEND_THRESHOLD` | 1000 |
| `highImpactThreshold` | `MessagingHighImpactThreshold` | `MESSAGING_COLLISION_HIGH_IMPACT_THRESHOLD` | 10000 |
| `lookbackHours` | `MessagingCollisionLookbackHours` | `MESSAGING_COLLISION_LOOKBACK_HOURS` | 12 |
| `lookaheadHours` | `MessagingCollisionLookaheadHours` | `MESSAGING_COLLISION_LOOKAHEAD_HOURS` | 12 |
| `criticalHours` | `MessagingCollisionCriticalHours` | `MESSAGING_COLLISION_CRITICAL_HOURS` | 2 |
| `segmentsPerSecond` | `MessagingTextSegmentsPerSecond` | `TEXT_SEGMENTS_PER_SECOND` | 5 |
| `emailsPerSecond` | `MessagingEmailsPerSecond` | `MESSAGING_COLLISION_EMAILS_PER_SECOND` | 5 |
| `smsCostPerSegment` | `MessagingSmsCostPerSegment` | `TEXT_SMS_COST_PER_SEGMENT` | 0.0083 |
| `mmsCostPerMessage` | `MessagingMmsCostPerMessage` | `TEXT_MMS_COST_PER_MESSAGE` | 0.022 |

## How it works
1. `MessagingCollisionService.findCollisions` and the text tool's `getPricing` call `getMessagingSettings()`, which first seeds any missing MP rows.
2. It asks `ConfigurationSettingsService.resolveNumber` for each field; the first call reads MP once, the rest hit the cache.
3. Callers may still pass explicit options (`CollisionSearchOptions`) to override a setting for one call.

## Usage
```typescript
// Add a tunable to another tool: extend a catalogue like MESSAGING_SETTING_SOURCES,
// add the row to mpnext_configuration_settings.sql, then resolve it:
const value = await ConfigurationSettingsService.getInstance().resolveNumber({
  applicationCode: MPNEXT_APPLICATION_CODE,
  key: 'MessagingEmailsPerSecond',
  envVar: 'MESSAGING_COLLISION_EMAILS_PER_SECOND',
  fallback: 5,
});
```

## Gotchas
- Both the SQL seed and `ensureDefaults` insert only missing keys, so nothing ever overwrites a church's edits; changing a default in code does not change an installed row.
- Self-seeding needs the API user to have create rights on `dp_Configuration_Settings` (stock access is ReadWrite). Without them the tool keeps working from env/defaults and logs one warning per process.
- `dp_Configuration_Settings` exposes no `Domain_ID` through the API, but the SQL table has one; the seed writes `Domain_ID = 1`.
- Values are `nvarchar`; store numbers as plain digits (`0.0083`, not `$0.0083`), or the reader skips the row and falls back.
- Server actions that unit-test `getTextToolConfig` or `findCollisions` must mock `@/services/messagingSettings`, or the real reader constructs an `MPHelper`.

## Related docs
- `messaging-collision-service.md` — first consumer of the thresholds and rates
- `../components/text-messaging.md` — pricing block of `TextToolConfig`
