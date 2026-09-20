-- ========================================================================================
--      MPNext Tools configuration settings
--
--      Seeds dp_Configuration_Settings rows (Application_Code = 'MPNEXT') that the
--      messaging tools read at runtime, so each church tunes them in
--      Administration > Configuration Settings instead of editing environment variables.
--      Each setting resolves in this order: the MP row here, then the matching
--      environment variable, then the built-in default (src/lib/constants.ts).
--
--      Idempotent: a row is inserted only when the key is missing, so re-running never
--      overwrites a value a church has changed. The tools also seed any missing row
--      themselves the first time they read settings, so this script is optional.
--      Key names and descriptions mirror src/services/messagingSettings.ts.
-- ========================================================================================
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

DECLARE @Settings TABLE (Key_Name nvarchar(128), Value nvarchar(4000), Description nvarchar(2000));

INSERT INTO @Settings (Key_Name, Value, Description) VALUES
  ('MessagingLargeSendThreshold',      '1000',   'A message to more recipients than this counts as a large send in the collision check.'),
  ('MessagingHighImpactThreshold',     '10000',  'A message to more recipients than this is flagged High impact in the collision check.'),
  ('MessagingCollisionLookbackHours',  '12',     'Hours before a planned send to look for other messages.'),
  ('MessagingCollisionLookaheadHours', '12',     'Hours after a planned send to look for other messages.'),
  ('MessagingCollisionCriticalHours',  '2',      'Hours either side of a planned send treated as the queueing band.'),
  ('MessagingTextSegmentsPerSecond',   '5',      'Text segments the messaging worker delivers per second, for delivery time and queue estimates.'),
  ('MessagingEmailsPerSecond',         '5',      'Emails the messaging worker delivers per second, for queue estimates.'),
  ('MessagingSmsCostPerSegment',       '0.0083', 'USD per SMS segment when the sending number has no Cost Per Segment of its own.'),
  ('MessagingMmsCostPerMessage',       '0.022',  'USD per MMS (picture) message.');

INSERT INTO dbo.dp_Configuration_Settings (Domain_ID, Application_Code, Key_Name, Value, Description)
SELECT 1, 'MPNEXT', s.Key_Name, s.Value, s.Description
FROM @Settings s
WHERE NOT EXISTS (
  SELECT 1
  FROM dbo.dp_Configuration_Settings c
  WHERE c.Application_Code = 'MPNEXT' AND c.Key_Name = s.Key_Name
);

PRINT 'MPNext configuration settings are in place (Application_Code = MPNEXT).'
GO
