import { z } from 'zod';

export const ScheduledCommunicationsSchema = z.object({
  Scheduled_Communication_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Group_ID: z.number().int().nullable(),
  Event_ID: z.number().int().nullable(),
  Publication_ID: z.number().int().nullable(),
  Send_Modifier: z.string().max(50).nullable(),
  Subject: z.string().max(128),
  Message: z.string().max(2147483647),
  From_Contact: z.number().int(),
  Status: z.number().int(),
  User_ID: z.number().int(),
});

export type ScheduledCommunicationsInput = z.infer<typeof ScheduledCommunicationsSchema>;
