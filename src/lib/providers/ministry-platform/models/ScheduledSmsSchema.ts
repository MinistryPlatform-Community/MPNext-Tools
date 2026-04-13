import { z } from 'zod';

export const ScheduledSmsSchema = z.object({
  Scheduled_SMS_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Group_ID: z.number().int().nullable(),
  Event_ID: z.number().int().nullable(),
  SMS_Publication_ID: z.number().int().nullable(),
  Send_Modifier: z.string().max(50).nullable(),
  SMSBody: z.string().max(160),
  From_Contact: z.number().int(),
  Status: z.number().int(),
  User_ID: z.number().int(),
});

export type ScheduledSmsInput = z.infer<typeof ScheduledSmsSchema>;
