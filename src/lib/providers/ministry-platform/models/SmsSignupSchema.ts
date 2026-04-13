import { z } from 'zod';

export const SmsSignupSchema = z.object({
  SMS_SignUp_ID: z.number().int(),
  Event_ID: z.number().int().nullable(),
  Group_ID: z.number().int().nullable(),
  SMS_Publication_ID: z.number().int().nullable(),
  SMS_Keyword: z.string().max(20),
  SMS_Response: z.string().max(100),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Primary_Contact: z.number().int().nullable(),
  Special_Mode: z.string().max(50).nullable(),
  Enabled: z.boolean(),
});

export type SmsSignupInput = z.infer<typeof SmsSignupSchema>;
