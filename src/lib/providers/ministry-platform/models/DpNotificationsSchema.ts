import { z } from 'zod';

export const DpNotificationsSchema = z.object({
  Notification_ID: z.number().int(),
  User_ID: z.number().int(),
  Recurrence_Name: z.string().max(256),
  Last_Execution: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Next_Execution: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Notification_Type: z.unknown(),
  Template_ID: z.number().int().nullable(),
  User_Group_ID: z.number().int().nullable(),
  Suppress_Empty_Results: z.boolean(),
  Time_Zone: z.unknown(),
  Locale: z.unknown(),
  Subject: z.string().max(256).nullable(),
});

export type DpNotificationsInput = z.infer<typeof DpNotificationsSchema>;
