import { z } from 'zod';

export const SmsHistorySchema = z.object({
  SMS_History_ID: z.number().int(),
  From_Number: z.string().max(20),
  To_Number: z.string().max(20),
  SMS_Content: z.string().max(200).nullable(),
  Contact_ID: z.number().int().nullable(),
  SMS_SignUp_ID: z.number().int().nullable(),
  Start_Date: z.string().datetime(),
  isError: z.boolean(),
});

export type SmsHistoryInput = z.infer<typeof SmsHistorySchema>;
