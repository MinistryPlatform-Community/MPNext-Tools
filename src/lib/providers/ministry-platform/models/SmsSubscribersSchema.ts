import { z } from 'zod';

export const SmsSubscribersSchema = z.object({
  SMS_Subscriber_ID: z.number().int(),
  SMS_Publication_ID: z.number().int(),
  SMS_Number: z.string().max(50),
  Contact_ID: z.number().int().nullable(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Subscribed: z.boolean(),
});

export type SmsSubscribersInput = z.infer<typeof SmsSubscribersSchema>;
