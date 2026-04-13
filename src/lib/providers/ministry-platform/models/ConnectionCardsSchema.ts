import { z } from 'zod';

export const ConnectionCardsSchema = z.object({
  Connection_Card_ID: z.number().int(),
  Name: z.string().max(50),
  Payload: z.string().max(3000).nullable(),
  Start_Date: z.string().datetime(),
  Notification_User_Group: z.number().int().nullable(),
  Contact_ID: z.number().int().nullable(),
  Completed: z.boolean(),
  User_ID: z.number().int().nullable(),
  Notes: z.string().max(3000).nullable(),
});

export type ConnectionCardsInput = z.infer<typeof ConnectionCardsSchema>;
